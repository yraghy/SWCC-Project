import { GetCommand, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuid } from "uuid";
import { ddb, TABLES } from "../../services/dynamo.service";
import { HttpError } from "../../middleware/auth.middleware";
import { isManager } from "../../middleware/team.middleware";
import type { AuthClaims, CreateUserDto, User } from "../../../../shared/types";

export async function createUser(actor: AuthClaims, dto: CreateUserDto): Promise<User> {
  if (!isManager(actor)) throw new HttpError(403, "forbidden", "Only managers/admins can create users.");
  const user: User = {
    userId: uuid(),
    email: dto.email,
    name: dto.name,
    role: dto.role,
    teamId: dto.teamId,
    createdAt: new Date().toISOString(),
  };
  await ddb.send(new PutCommand({ TableName: TABLES.users, Item: user }));
  return user;
}

export async function getUser(userId: string): Promise<User | null> {
  const out = await ddb.send(new GetCommand({ TableName: TABLES.users, Key: { userId } }));
  return (out.Item as User) ?? null;
}

export async function listUsers(filter: { teamId?: string } = {}): Promise<User[]> {
  const out = await ddb.send(new ScanCommand({ TableName: TABLES.users }));
  let items = (out.Items ?? []) as User[];
  if (filter.teamId) items = items.filter((u) => u.teamId === filter.teamId);
  return items;
}

export async function upsertUserFromClaims(claims: AuthClaims): Promise<User> {
  const existing = await getUser(claims.sub);
  if (existing) return existing;
  const user: User = {
    userId: claims.sub,
    email: claims.email,
    name: claims.name,
    role: claims.role,
    teamId: claims.teamId,
    createdAt: new Date().toISOString(),
  };
  await ddb.send(new PutCommand({ TableName: TABLES.users, Item: user }));
  return user;
}
