import { mockApi } from "@/mocks/api.mock";
import type {
  AuthClaims,
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

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

let getToken: () => string | null = () => null;
let getDevUser: () => AuthClaims | null = () => null;

export function configureAuth(opts: { token?: () => string | null; devUser?: () => AuthClaims | null }) {
  if (opts.token) getToken = opts.token;
  if (opts.devUser) getDevUser = opts.devUser;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const devUser = getDevUser();
  if (devUser) headers.set("X-Dev-User", JSON.stringify(devUser));

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  me: (): Promise<User> => (USE_MOCKS ? mockApi.me() : request("/api/users/me")),
  listUsers: (teamId?: string): Promise<User[]> =>
    USE_MOCKS ? mockApi.listUsers(teamId) : request(`/api/users${teamId ? `?teamId=${teamId}` : ""}`),
  listTeams: (): Promise<Team[]> => (USE_MOCKS ? mockApi.listTeams() : request("/api/teams")),
  listProjects: (): Promise<Project[]> => (USE_MOCKS ? mockApi.listProjects() : request("/api/projects")),
  createProject: (dto: CreateProjectDto): Promise<Project> =>
    USE_MOCKS ? mockApi.createProject(dto) : request("/api/projects", { method: "POST", body: JSON.stringify(dto) }),

  listTasks: (filter: { teamId?: string; status?: TaskStatus } = {}): Promise<Task[]> => {
    if (USE_MOCKS) return mockApi.listTasks(filter);
    const qs = new URLSearchParams();
    if (filter.teamId) qs.set("teamId", filter.teamId);
    if (filter.status) qs.set("status", filter.status);
    return request(`/api/tasks${qs.toString() ? `?${qs}` : ""}`);
  },
  getTask: (id: string): Promise<Task> => (USE_MOCKS ? mockApi.getTask(id) : request(`/api/tasks/${id}`)),
  createTask: (dto: CreateTaskDto): Promise<Task> =>
    USE_MOCKS ? mockApi.createTask(dto) : request("/api/tasks", { method: "POST", body: JSON.stringify(dto) }),
  updateTask: (id: string, dto: UpdateTaskDto): Promise<Task> =>
    USE_MOCKS ? mockApi.updateTask(id, dto) : request(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(dto) }),
  deleteTask: (id: string): Promise<void> =>
    USE_MOCKS ? mockApi.deleteTask(id) : request(`/api/tasks/${id}`, { method: "DELETE" }),

  listComments: (taskId: string): Promise<Comment[]> =>
    USE_MOCKS ? mockApi.listComments(taskId) : request(`/api/comments/tasks/${taskId}`),
  addComment: (taskId: string, dto: CreateCommentDto): Promise<Comment> =>
    USE_MOCKS
      ? mockApi.addComment(taskId, dto)
      : request(`/api/comments/tasks/${taskId}`, { method: "POST", body: JSON.stringify(dto) }),

  presignUpload: (taskId: string, contentType: string): Promise<{ uploadUrl: string; key: string }> =>
    USE_MOCKS
      ? mockApi.presignUpload(taskId, contentType)
      : request(`/api/tasks/${taskId}/images/presign`, { method: "POST", body: JSON.stringify({ contentType }) }),
  attachImage: (taskId: string, key: string): Promise<Task> =>
    USE_MOCKS
      ? mockApi.attachImage(taskId, key)
      : request(`/api/tasks/${taskId}/images`, { method: "POST", body: JSON.stringify({ key }) }),
};
