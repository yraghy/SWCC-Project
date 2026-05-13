import type {
  Comment,
  CreateCommentDto,
  CreateProjectDto,
  CreateTaskDto,
  Project,
  Task,
  TaskStatus,
  Team,
  UpdateTaskDto,
  User,
} from "@shared/types";

const teams: Team[] = [
  { teamId: "team-fe", name: "Frontend", createdAt: "2026-05-01T00:00:00Z" },
  { teamId: "team-be", name: "Backend", createdAt: "2026-05-01T00:00:00Z" },
  { teamId: "team-qa", name: "QA", createdAt: "2026-05-01T00:00:00Z" },
];

const users: User[] = [
  { userId: "ali", email: "ali@example.com", name: "Ali (Manager)", role: "manager", teamId: null, createdAt: "2026-05-01T00:00:00Z" },
  { userId: "sara", email: "sara@example.com", name: "Sara", role: "employee", teamId: "team-fe", createdAt: "2026-05-01T00:00:00Z" },
  { userId: "omar", email: "omar@example.com", name: "Omar", role: "employee", teamId: "team-be", createdAt: "2026-05-01T00:00:00Z" },
];

const projects: Project[] = [
  {
    projectId: "proj-1",
    name: "Mini-Jira MVP",
    description: "Demo project for the cloud course.",
    createdBy: "ali",
    createdAt: "2026-05-01T00:00:00Z",
    updatedAt: "2026-05-01T00:00:00Z",
  },
];

const now = new Date().toISOString();
const tasks: Task[] = [
  {
    taskId: "task-A",
    projectId: "proj-1",
    teamId: "team-fe",
    assigneeId: "sara",
    title: "Build Kanban board",
    description: "Drag-and-drop with four columns.",
    status: "in_progress",
    priority: "high",
    deadline: "2026-05-15",
    images: [],
    createdBy: "ali",
    createdAt: now,
    updatedAt: now,
    closedAt: null,
  },
  {
    taskId: "task-B",
    projectId: "proj-1",
    teamId: "team-be",
    assigneeId: "omar",
    title: "DynamoDB schema + GSIs",
    description: "Tasks table with byTeam and byAssignee GSIs.",
    status: "todo",
    priority: "high",
    deadline: "2026-05-12",
    images: [],
    createdBy: "ali",
    createdAt: now,
    updatedAt: now,
    closedAt: null,
  },
];

const comments: Comment[] = [];

let currentUserId = "ali";
export function setMockUser(id: string) {
  if (users.find((u) => u.userId === id)) currentUserId = id;
}
function currentUser(): User {
  return users.find((u) => u.userId === currentUserId)!;
}
function isManager(): boolean {
  return currentUser().role === "manager" || currentUser().role === "admin";
}

function visibleTasks(): Task[] {
  const u = currentUser();
  if (isManager()) return tasks;
  return tasks.filter((t) => t.teamId === u.teamId);
}

function delay<T>(value: T, ms = 120): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const mockApi = {
  me: async (): Promise<User> => delay(currentUser()),
  listUsers: async (teamId?: string): Promise<User[]> =>
    delay(teamId ? users.filter((u) => u.teamId === teamId) : users),
  listTeams: async (): Promise<Team[]> => delay(teams),
  listProjects: async (): Promise<Project[]> => delay(projects),
  createProject: async (dto: CreateProjectDto): Promise<Project> => {
    const p: Project = {
      projectId: `proj-${projects.length + 1}`,
      name: dto.name,
      description: dto.description,
      createdBy: currentUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    projects.push(p);
    return delay(p);
  },

  listTasks: async (filter: { teamId?: string; status?: TaskStatus } = {}): Promise<Task[]> => {
    let items = visibleTasks();
    if (filter.teamId) items = items.filter((t) => t.teamId === filter.teamId);
    if (filter.status) items = items.filter((t) => t.status === filter.status);
    return delay(items);
  },
  getTask: async (id: string): Promise<Task> => {
    const t = visibleTasks().find((x) => x.taskId === id);
    if (!t) throw new Error("not_found");
    return delay(t);
  },
  createTask: async (dto: CreateTaskDto): Promise<Task> => {
    if (!isManager()) throw new Error("forbidden");
    const t: Task = {
      taskId: `task-${tasks.length + 1}`,
      ...dto,
      status: "todo",
      images: [],
      createdBy: currentUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      closedAt: null,
    };
    tasks.push(t);
    return delay(t);
  },
  updateTask: async (id: string, dto: UpdateTaskDto): Promise<Task> => {
    const idx = tasks.findIndex((t) => t.taskId === id);
    if (idx === -1) throw new Error("not_found");
    const existing = tasks[idx];
    if (!isManager() && existing.assigneeId !== currentUserId) throw new Error("forbidden");
    const closedAt = dto.status === "done" ? (existing.closedAt ?? new Date().toISOString()) : existing.closedAt;
    const updated: Task = { ...existing, ...dto, closedAt, updatedAt: new Date().toISOString() };
    tasks[idx] = updated;
    return delay(updated);
  },
  deleteTask: async (id: string): Promise<void> => {
    if (!isManager()) throw new Error("forbidden");
    const idx = tasks.findIndex((t) => t.taskId === id);
    if (idx >= 0) tasks.splice(idx, 1);
    return delay(undefined);
  },

  listComments: async (taskId: string): Promise<Comment[]> =>
    delay(comments.filter((c) => c.taskId === taskId)),
  addComment: async (taskId: string, dto: CreateCommentDto): Promise<Comment> => {
    const c: Comment = {
      commentId: `c-${comments.length + 1}`,
      taskId,
      authorId: currentUserId,
      body: dto.body,
      createdAt: new Date().toISOString(),
    };
    comments.push(c);
    return delay(c);
  },

  presignUpload: async (taskId: string, contentType: string) =>
    delay({ uploadUrl: `mock://upload/${taskId}`, key: `tasks/${taskId}/${Date.now()}.${contentType.split("/")[1]}` }),
  attachImage: async (taskId: string, key: string): Promise<Task> => {
    const idx = tasks.findIndex((t) => t.taskId === taskId);
    if (idx === -1) throw new Error("not_found");
    tasks[idx] = {
      ...tasks[idx],
      images: [...tasks[idx].images, { originalKey: key, resizedKey: null, uploadedAt: new Date().toISOString() }],
      updatedAt: new Date().toISOString(),
    };
    return delay(tasks[idx]);
  },
};
