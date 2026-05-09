"use strict";

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");

const REGION = process.env.AWS_REGION || "eu-central-1";
const TASKS_TABLE = process.env.DDB_TASKS_TABLE || "mini-jira-tasks";
const USERS_TABLE = process.env.DDB_USERS_TABLE || "mini-jira-users";
const DIGEST_TOPIC_ARN = process.env.SNS_DIGEST_TOPIC_ARN;

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const sns = new SNSClient({ region: REGION });

function todayBounds() {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

exports.handler = async () => {
  if (!DIGEST_TOPIC_ARN) throw new Error("SNS_DIGEST_TOPIC_ARN env var is required");

  const { start, end } = todayBounds();

  const out = await ddb.send(
    new ScanCommand({
      TableName: TASKS_TABLE,
      FilterExpression: "deadline >= :start AND deadline < :end AND #s <> :done",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: { ":start": start, ":end": end, ":done": "done" },
    }),
  );
  const tasks = out.Items || [];

  const byAssignee = new Map();
  for (const task of tasks) {
    if (!byAssignee.has(task.assigneeId)) byAssignee.set(task.assigneeId, []);
    byAssignee.get(task.assigneeId).push(task);
  }

  let sent = 0;
  for (const [assigneeId, assigneeTasks] of byAssignee) {
    const userOut = await ddb.send(new GetCommand({ TableName: USERS_TABLE, Key: { userId: assigneeId } }));
    const user = userOut.Item;
    if (!user?.email) continue;

    const lines = assigneeTasks.map(
      (t) => `• [${t.priority}] ${t.title} (status: ${t.status}, deadline: ${t.deadline})`,
    );
    const message = [
      `Hi ${user.name || user.email},`,
      ``,
      `You have ${assigneeTasks.length} task(s) due today:`,
      ``,
      ...lines,
      ``,
      `— Mini-Jira Daily Digest`,
    ].join("\n");

    await sns.send(
      new PublishCommand({
        TopicArn: DIGEST_TOPIC_ARN,
        Subject: `Mini-Jira: ${assigneeTasks.length} task(s) due today`.slice(0, 100),
        Message: message,
        MessageAttributes: {
          assigneeEmail: { DataType: "String", StringValue: user.email },
          assigneeId: { DataType: "String", StringValue: assigneeId },
        },
      }),
    );
    sent++;
  }

  return { ok: true, scanned: tasks.length, digestsSent: sent };
};
