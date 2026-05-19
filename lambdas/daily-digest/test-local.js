// Must mock BEFORE requiring the handler
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
const { SNSClient } = require("@aws-sdk/client-sns");

const today = new Date().toISOString();

DynamoDBClient.prototype.send = async () => ({ $metadata: {} });
DynamoDBDocumentClient.prototype.send = async (cmd) => {
    const name = cmd.constructor.name;

    if (name === "ScanCommand") {
        return {
            Items: [
                { taskId: "t1", title: "Fix login bug", status: "in-progress", priority: "high", deadline: today, assigneeId: "user-sara" },
                { taskId: "t2", title: "Write tests", status: "open", priority: "medium", deadline: today, assigneeId: "user-sara" },
            ]
        };
    }

    if (name === "GetCommand") {
        return {
            Item: { userId: "user-sara", name: "Sara", email: "sara@example.com" }
        };
    }

    return {};
};

SNSClient.prototype.send = async (cmd) => {
    console.log("Mock SNS Publish:");
    console.log("  Subject:", cmd.input.Subject);
    console.log("  Message:\n" + cmd.input.Message);
    return {};
};

process.env.AWS_REGION = "eu-central-1";
process.env.DDB_TASKS_TABLE = "mini-jira-tasks";
process.env.DDB_USERS_TABLE = "mini-jira-users";
process.env.SNS_DIGEST_TOPIC_ARN = "arn:aws:sns:eu-central-1:123456789:mini-jira-digest";

require("./index").handler()
    .then(result => console.log("Success:", JSON.stringify(result, null, 2)))
    .catch(console.error);