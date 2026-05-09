import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuid } from "uuid";
import { ddb, TABLES } from "./dynamo.service";
import type { AuditEntry } from "../../../shared/types";

export async function recordAudit(input: Omit<AuditEntry, "auditId" | "at">): Promise<AuditEntry> {
  const entry: AuditEntry = {
    auditId: uuid(),
    at: new Date().toISOString(),
    ...input,
  };
  await ddb.send(
    new PutCommand({
      TableName: TABLES.audit,
      Item: entry,
    }),
  );
  return entry;
}

export async function listAuditForTask(taskId: string): Promise<AuditEntry[]> {
  const out = await ddb.send(
    new QueryCommand({
      TableName: TABLES.audit,
      KeyConditionExpression: "taskId = :t",
      ExpressionAttributeValues: { ":t": taskId },
      ScanIndexForward: false,
    }),
  );
  return (out.Items ?? []) as AuditEntry[];
}
