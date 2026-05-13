import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuid } from "uuid";
import { ddb, TABLES } from "../../services/dynamo.service";
import { getTask } from "../tasks/tasks.service";
import type { AuthClaims, Comment, CreateCommentDto } from "../../../../shared/types";

export async function createComment(user: AuthClaims, taskId: string, dto: CreateCommentDto): Promise<Comment> {
  await getTask(user, taskId);
  const comment: Comment = {
    commentId: uuid(),
    taskId,
    authorId: user.sub,
    body: dto.body,
    createdAt: new Date().toISOString(),
  };
  await ddb.send(new PutCommand({ TableName: TABLES.comments, Item: comment }));
  return comment;
}

export async function listComments(user: AuthClaims, taskId: string): Promise<Comment[]> {
  await getTask(user, taskId);
  const out = await ddb.send(
    new QueryCommand({
      TableName: TABLES.comments,
      KeyConditionExpression: "taskId = :t",
      ExpressionAttributeValues: { ":t": taskId },
      ScanIndexForward: true,
    }),
  );
  return (out.Items ?? []) as Comment[];
}
