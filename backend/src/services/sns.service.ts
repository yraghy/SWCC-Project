import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { env } from "../config/aws.config";
import type { AssignmentEvent } from "../../../shared/types";

export const sns = new SNSClient({ region: env.awsRegion });

export async function publishAssignment(event: AssignmentEvent): Promise<void> {
  if (!env.sns.assignmentTopicArn) {
    console.warn("SNS_ASSIGNMENT_TOPIC_ARN not set — skipping publish.");
    return;
  }
  await sns.send(
    new PublishCommand({
      TopicArn: env.sns.assignmentTopicArn,
      Subject: `Task assigned: ${event.taskTitle}`.slice(0, 100),
      Message: JSON.stringify(event),
      MessageAttributes: {
        type: { DataType: "String", StringValue: event.type },
        teamId: { DataType: "String", StringValue: event.teamId },
      },
    }),
  );
}
