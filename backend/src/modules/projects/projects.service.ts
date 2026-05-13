import { DeleteCommand, GetCommand, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuid } from "uuid";
import { ddb, TABLES } from "../../services/dynamo.service";
import { HttpError } from "../../middleware/auth.middleware";
import { isManager } from "../../middleware/team.middleware";
import type {
  AuthClaims,
  CreateProjectDto,
  Project,
  UpdateProjectDto,
} from "../../../../shared/types";

export async function createProject(user: AuthClaims, dto: CreateProjectDto): Promise<Project> {
  if (!isManager(user)) throw new HttpError(403, "forbidden", "Only managers can create projects.");
  const now = new Date().toISOString();
  const project: Project = {
    projectId: uuid(),
    name: dto.name,
    description: dto.description,
    createdBy: user.sub,
    createdAt: now,
    updatedAt: now,
  };
  await ddb.send(new PutCommand({ TableName: TABLES.projects, Item: project }));
  return project;
}

export async function listProjects(): Promise<Project[]> {
  const out = await ddb.send(new ScanCommand({ TableName: TABLES.projects }));
  return (out.Items ?? []) as Project[];
}

export async function getProject(projectId: string): Promise<Project> {
  const out = await ddb.send(new GetCommand({ TableName: TABLES.projects, Key: { projectId } }));
  if (!out.Item) throw new HttpError(404, "not_found", "Project not found.");
  return out.Item as Project;
}

export async function updateProject(user: AuthClaims, projectId: string, dto: UpdateProjectDto): Promise<Project> {
  if (!isManager(user)) throw new HttpError(403, "forbidden", "Only managers can edit projects.");
  const existing = await getProject(projectId);
  const updated: Project = {
    ...existing,
    ...dto,
    updatedAt: new Date().toISOString(),
  };
  await ddb.send(new PutCommand({ TableName: TABLES.projects, Item: updated }));
  return updated;
}

export async function deleteProject(user: AuthClaims, projectId: string): Promise<void> {
  if (!isManager(user)) throw new HttpError(403, "forbidden", "Only managers can delete projects.");
  await ddb.send(new DeleteCommand({ TableName: TABLES.projects, Key: { projectId } }));
}
