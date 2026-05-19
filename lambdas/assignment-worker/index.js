"use strict";

const { CloudWatchClient, PutMetricDataCommand } = require("@aws-sdk/client-cloudwatch");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const crypto = require("crypto");

const REGION = process.env.AWS_REGION || "eu-central-1";
const NAMESPACE = process.env.CW_NAMESPACE || "SWCCProject";
const AUDIT_TABLE = process.env.DDB_AUDIT_TABLE || "swcc-project-audit";

const cw = new CloudWatchClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }), {
  marshallOptions: { removeUndefinedValues: true },
});

function parseSnsBody(rawBody) {
  const envelope = JSON.parse(rawBody);
  if (envelope.Type === "Notification" && envelope.Message) {
    return JSON.parse(envelope.Message);
  }
  return envelope;
}

exports.handler = async (event) => {
  const teamCounts = new Map();
  const auditWrites = [];

  for (const record of event.Records || []) {
    let payload;
    try {
      payload = parseSnsBody(record.body);
    } catch (err) {
      console.error("Failed to parse SQS message body:", err, record.body);
      continue;
    }
    if (payload.type !== "task.assigned") continue;

    teamCounts.set(payload.teamId, (teamCounts.get(payload.teamId) || 0) + 1);

    auditWrites.push(
      ddb.send(
        new PutCommand({
          TableName: AUDIT_TABLE,
          Item: {
            auditId: crypto.randomUUID(),
            taskId: payload.taskId,
            actorId: payload.assignedBy,
            action: "assigned",
            fromValue: null,
            toValue: payload.assigneeId,
            at: payload.at || new Date().toISOString(),
            source: "assignment-worker",
          },
        }),
      ),
    );
  }

  await Promise.all(auditWrites);

  if (teamCounts.size > 0) {
    await cw.send(
      new PutMetricDataCommand({
        Namespace: NAMESPACE,
        MetricData: Array.from(teamCounts.entries()).map(([teamId, count]) => ({
          MetricName: "TasksAssignedPerTeam",
          Value: count,
          Unit: "Count",
          Timestamp: new Date(),
          Dimensions: [{ Name: "TeamId", Value: teamId }],
        })),
      }),
    );
  }

  return { ok: true, processed: event.Records?.length || 0 };
};
