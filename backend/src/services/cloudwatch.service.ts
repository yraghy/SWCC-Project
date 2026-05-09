import {
  CloudWatchClient,
  PutMetricDataCommand,
  StandardUnit,
} from "@aws-sdk/client-cloudwatch";
import { env } from "../config/aws.config";

export const cloudwatch = new CloudWatchClient({ region: env.awsRegion });

export interface MetricInput {
  name: string;
  value: number;
  unit?: StandardUnit;
  dimensions?: Record<string, string>;
}

export async function putMetric(input: MetricInput): Promise<void> {
  await cloudwatch.send(
    new PutMetricDataCommand({
      Namespace: env.cloudwatch.namespace,
      MetricData: [
        {
          MetricName: input.name,
          Value: input.value,
          Unit: input.unit ?? StandardUnit.Count,
          Timestamp: new Date(),
          Dimensions: Object.entries(input.dimensions ?? {}).map(([Name, Value]) => ({ Name, Value })),
        },
      ],
    }),
  );
}

export async function incrementTasksCreated(teamId: string): Promise<void> {
  await putMetric({ name: "TasksCreated", value: 1, dimensions: { TeamId: teamId } });
}

export async function incrementTasksClosed(teamId: string): Promise<void> {
  await putMetric({ name: "TasksClosed", value: 1, dimensions: { TeamId: teamId } });
}

export async function recordTimeToClose(teamId: string, ms: number): Promise<void> {
  await putMetric({
    name: "TimeToCloseMs",
    value: ms,
    unit: StandardUnit.Milliseconds,
    dimensions: { TeamId: teamId },
  });
}
