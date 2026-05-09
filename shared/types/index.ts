export type Role = "manager" | "employee" | "admin";

export type TaskStatus = "todo" | "in_progress" | "in_review" | "done";

export const TASK_STATUSES: TaskStatus[] = [
  "todo",
  "in_progress",
  "in_review",
  "done",
];

export type Priority = "low" | "medium" | "high" | "urgent";

export interface User {
  userId: string;
  email: string;
  name: string;
  role: Role;
  teamId: string | null;
  createdAt: string;
}

export interface Team {
  teamId: string;
  name: string;
  createdAt: string;
}

export interface Project {
  projectId: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskImage {
  originalKey: string;
  resizedKey: string | null;
  uploadedAt: string;
}

export interface Task {
  taskId: string;
  projectId: string;
  teamId: string;
  assigneeId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  deadline: string;
  images: TaskImage[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export interface Comment {
  commentId: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface AuditEntry {
  auditId: string;
  taskId: string;
  actorId: string;
  action:
    | "created"
    | "status_changed"
    | "assigned"
    | "image_added"
    | "image_replaced"
    | "image_deleted"
    | "deleted";
  fromValue: string | null;
  toValue: string | null;
  at: string;
}

export interface AuthClaims {
  sub: string;
  email: string;
  role: Role;
  teamId: string | null;
  name: string;
}

export interface CreateTaskDto {
  projectId: string;
  teamId: string;
  assigneeId: string;
  title: string;
  description: string;
  priority: Priority;
  deadline: string;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  priority?: Priority;
  deadline?: string;
  status?: TaskStatus;
  assigneeId?: string;
  teamId?: string;
}

export interface CreateProjectDto {
  name: string;
  description: string;
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
}

export interface CreateCommentDto {
  body: string;
}

export interface CreateTeamDto {
  name: string;
}

export interface CreateUserDto {
  email: string;
  name: string;
  role: Role;
  teamId: string | null;
}

export interface AssignmentEvent {
  type: "task.assigned";
  taskId: string;
  taskTitle: string;
  assigneeId: string;
  assigneeEmail: string;
  teamId: string;
  assignedBy: string;
  at: string;
}
