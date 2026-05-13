import { GetCommand, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuid } from "uuid";
import { ddb, TABLES } from "../../services/dynamo.service";
import { HttpError } from "../../middleware/auth.middleware";
import { isManager } from "../../middleware/team.middleware";
import type { AuthClaims, CreateTeamDto, Team } from "../../../../shared/types";

export async function createTeam(user: AuthClaims, dto: CreateTeamDto): Promise<Team> {
  if (!isManager(user)) throw new HttpError(403, "forbidden", "Only managers can create teams.");
  const team: Team = {
    teamId: uuid(),
    name: dto.name,
    createdAt: new Date().toISOString(),
  };
  await ddb.send(new PutCommand({ TableName: TABLES.teams, Item: team }));
  return team;
}

export async function listTeams(): Promise<Team[]> {
  const out = await ddb.send(new ScanCommand({ TableName: TABLES.teams }));
  return (out.Items ?? []) as Team[];
}

export async function getTeam(teamId: string): Promise<Team | null> {
  const out = await ddb.send(new GetCommand({ TableName: TABLES.teams, Key: { teamId } }));
  return (out.Item as Team) ?? null;
}
