// Must mock BEFORE requiring the handler
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
const { CloudWatchClient } = require("@aws-sdk/client-cloudwatch");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");

// Mock at the prototype level before index.js loads
DynamoDBClient.prototype.send = async () => ({ $metadata: {} });
DynamoDBDocumentClient.prototype.send = async (cmd) => {
    console.log("Mock DynamoDB write:", cmd.input?.Item || cmd.input);
    return {};
};
CloudWatchClient.prototype.send = async (cmd) => {
    console.log("Mock CloudWatch metric:", JSON.stringify(cmd.input.MetricData, null, 2));
    return {};
};

process.env.AWS_REGION = "eu-central-1";
process.env.DDB_AUDIT_TABLE = "mini-jira-audit";
process.env.CW_NAMESPACE = "MiniJira";

const mockEvent = {
    Records: [{
        body: JSON.stringify({
            Type: "Notification",
            Message: JSON.stringify({
                type: "task.assigned",
                taskId: "task-123",
                assigneeId: "user-sara",
                assignedBy: "user-ali",
                teamId: "team-frontend",
                at: new Date().toISOString(),
            })
        })
    }]
};

require("./index").handler(mockEvent)
    .then(result => console.log("Success:", JSON.stringify(result, null, 2)))
    .catch(console.error);