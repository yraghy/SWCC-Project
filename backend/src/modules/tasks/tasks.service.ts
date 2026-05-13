import {
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuid } from "uuid";
import { ddb, TABLES } from "../../services/dynamo.service";
import { recordAudit } from "../../services/audit.service";
import { publishAssignment } from "../../services/sns.service";
import {
  incrementTasksClosed,
  incrementTasksCreated,
  recordTimeToClose,
} from "../../services/cloudwatch.service";
import { presignDownload, BUCKETS, deleteOriginal, deleteResized } from "../../services/s3.service";
import { HttpError } from "../../middleware/auth.middleware";
import { assertCanReadTeam, assertCanWriteTeam, scopeQueryToUser, isManager } from "../../middleware/team.middleware";
import { getUser } from "../users/users.service";
import type {
  AuthClaims,
  CreateTaskDto,
  Task,
  TaskImage,
  TaskStatus,
  UpdateTaskDto,
} from "../../../../shared/types";
import { TASK_STATUSES } from "../../../../shared/types";

const STATUS_ORDER: TaskStatus[] = TASK_STATUSES;

function assertValidStatusTransition(from: TaskStatus, to: TaskStatus): void {
  if (from === to) return;
  const fromIdx = STATUS_ORDER.indexOf(from);
  const toIdx = STATUS_ORDER.indexOf(to);
  if (fromIdx === -1 || toIdx === -1) {
    throw new HttpError(400, "invalid_status", `Unknown status: ${to}`);
  }
}

export async function createTask(user: AuthClaims, dto: CreateTaskDto): Promise<Task> {
  if (!isManager(user)) {
    throw new HttpError(403, "forbidden", "Only managers can create tasks.");
  }
  const assignee = await getUser(dto.assigneeId);
  if (!assignee) throw new HttpError(400, "assignee_not_found", "Assignee user does not exist.");
  if (assignee.teamId !== dto.teamId) {
    throw new HttpError(400, "assignee_team_mismatch", "Assignee is not on the specified team.");
  }

  const now = new Date().toISOString();
  const task: Task = {
    taskId: uuid(),
    projectId: dto.projectId,
    teamId: dto.teamId,
    assigneeId: dto.assigneeId,
    title: dto.title,
    description: dto.description,
    status: "todo",
    priority: dto.priority,
    deadline: dto.deadline,
    images: [],
    createdBy: user.sub,
    createdAt: now,
    updatedAt: now,
    closedAt: null,
  };

  await ddb.send(new PutCommand({ TableName: TABLES.tasks, Item: task }));

  await Promise.all([
    recordAudit({ taskId: task.taskId, actorId: user.sub, action: "created", fromValue: null, toValue: task.status }),
    recordAudit({
      taskId: task.taskId,
      actorId: user.sub,
      action: "assigned",
      fromValue: null,
      toValue: dto.assigneeId,
    }),
    incrementTasksCreated(task.teamId).catch((e) => console.error("CW metric failed:", e)),
    publishAssignment({
      type: "task.assigned",
      taskId: task.taskId,
      taskTitle: task.title,
      assigneeId: assignee.userId,
      assigneeEmail: assignee.email,
      teamId: task.teamId,
      assignedBy: user.sub,
      at: now,
    }).catch((e) => console.error("SNS publish failed:", e)),
  ]);

  return task;
}

export async function getTask(user: AuthClaims, taskId: string): Promise<Task> {
  const out = await ddb.send(new GetCommand({ TableName: TABLES.tasks, Key: { taskId } }));
  const task = out.Item as Task | undefined;
  if (!task) throw new HttpError(404, "not_found", "Task not found.");
  assertCanReadTeam(user, task.teamId);
  return task;
}

export async function listTasks(
  user: AuthClaims,
  filter: { teamId?: string; assigneeId?: string; status?: TaskStatus } = {},
): Promise<Task[]> {
  const scope = scopeQueryToUser(user);
  const teamId = scope.bypass ? filter.teamId : scope.teamId!;

  if (filter.assigneeId) {
    const out = await ddb.send(
      new QueryCommand({
        TableName: TABLES.tasks,
        IndexName: TABLES.gsi.tasksByAssignee,
        KeyConditionExpression: "assigneeId = :a",
        ExpressionAttributeValues: { ":a": filter.assigneeId },
      }),
    );
    let items = (out.Items ?? []) as Task[];
    if (teamId) items = items.filter((t) => t.teamId === teamId);
    if (filter.status) items = items.filter((t) => t.status === filter.status);
    return items;
  }

  if (teamId) {
    const out = await ddb.send(
      new QueryCommand({
        TableName: TABLES.tasks,
        IndexName: TABLES.gsi.tasksByTeam,
        KeyConditionExpression: "teamId = :t",
        ExpressionAttributeValues: { ":t": teamId },
      }),
    );
    let items = (out.Items ?? []) as Task[];
    if (filter.status) items = items.filter((t) => t.status === filter.status);
    return items;
  }

  const out = await ddb.send(new ScanCommand({ TableName: TABLES.tasks }));
  let items = (out.Items ?? []) as Task[];
  if (filter.status) items = items.filter((t) => t.status === filter.status);
  return items;
}

export async function updateTask(user: AuthClaims, taskId: string, dto: UpdateTaskDto): Promise<Task> {
  const existing = await getTask(user, taskId);
  assertCanWriteTeam(user, existing.teamId);

  const isAssigneeOnly = !isManager(user);
  if (isAssigneeOnly) {
    const onlyStatus = Object.keys(dto).every((k) => k === "status");
    if (!onlyStatus) throw new HttpError(403, "forbidden", "Employees can only update status.");
    if (existing.assigneeId !== user.sub) {
      throw new HttpError(403, "not_assignee", "Only the assignee can update status.");
    }
  }

  if (dto.status) assertValidStatusTransition(existing.status, dto.status);

  const now = new Date().toISOString();
  const updated: Task = {
    ...existing,
    ...dto,
    updatedAt: now,
    closedAt: dto.status === "done" ? (existing.closedAt ?? now) : existing.closedAt,
  };

  await ddb.send(new PutCommand({ TableName: TABLES.tasks, Item: updated }));

  if (dto.status && dto.status !== existing.status) {
    await recordAudit({
      taskId,
      actorId: user.sub,
      action: "status_changed",
      fromValue: existing.status,
      toValue: dto.status,
    });
    if (dto.status === "done" && !existing.closedAt) {
      await Promise.all([
        incrementTasksClosed(updated.teamId).catch(console.error),
        recordTimeToClose(updated.teamId, Date.parse(now) - Date.parse(existing.createdAt)).catch(console.error),
      ]);
    }
  }

  if (dto.assigneeId && dto.assigneeId !== existing.assigneeId) {
    await recordAudit({
      taskId,
      actorId: user.sub,
      action: "assigned",
      fromValue: existing.assigneeId,
      toValue: dto.assigneeId,
    });
    const newAssignee = await getUser(dto.assigneeId);
    if (newAssignee) {
      await publishAssignment({
        type: "task.assigned",
        taskId,
        taskTitle: updated.title,
        assigneeId: newAssignee.userId,
        assigneeEmail: newAssignee.email,
        teamId: updated.teamId,
        assignedBy: user.sub,
        at: now,
      }).catch(console.error);
    }
  }

  return updated;
}

export async function deleteTask(user: AuthClaims, taskId: string): Promise<void> {
  const existing = await getTask(user, taskId);
  if (!isManager(user)) {
    throw new HttpError(403, "forbidden", "Only managers can delete tasks.");
  }

  await Promise.all(
    existing.images.flatMap((img) => {
      const ops: Promise<void>[] = [deleteOriginal(img.originalKey).catch(() => undefined as unknown as void)];
      if (img.resizedKey) ops.push(deleteResized(img.resizedKey).catch(() => undefined as unknown as void));
      return ops;
    }),
  );

  await ddb.send(new DeleteCommand({ TableName: TABLES.tasks, Key: { taskId } }));
  await recordAudit({ taskId, actorId: user.sub, action: "deleted", fromValue: null, toValue: null });
}

export async function attachImage(user: AuthClaims, taskId: string, originalKey: string): Promise<Task> {
  const existing = await getTask(user, taskId);
  assertCanWriteTeam(user, existing.teamId);

  const image: TaskImage = {
    originalKey,
    resizedKey: null,
    uploadedAt: new Date().toISOString(),
  };
  const isReplacement = existing.images.length > 0;
  const updated = await ddb.send(
    new UpdateCommand({
      TableName: TABLES.tasks,
      Key: { taskId },
      UpdateExpression: "SET images = list_append(if_not_exists(images, :empty), :img), updatedAt = :now",
      ExpressionAttributeValues: {
        ":empty": [],
        ":img": [image],
        ":now": new Date().toISOString(),
      },
      ReturnValues: "ALL_NEW",
    }),
  );

  await recordAudit({
    taskId,
    actorId: user.sub,
    action: isReplacement ? "image_replaced" : "image_added",
    fromValue: null,
    toValue: originalKey,
  });

  return updated.Attributes as Task;
}

export async function getTaskImageUrls(task: Task): Promise<Array<TaskImage & { originalUrl: string; resizedUrl: string | null }>> {
  return Promise.all(
    task.images.map(async (img) => ({
      ...img,
      originalUrl: await presignDownload(BUCKETS.originals, img.originalKey),
      resizedUrl: img.resizedKey ? await presignDownload(BUCKETS.resized, img.resizedKey) : null,
    })),
  );
}
