import type { AuthClaims } from "../../../shared/types";
import { HttpError } from "./auth.middleware";

export function isManager(user: AuthClaims | undefined): boolean {
  return !!user && (user.role === "manager" || user.role === "admin");
}

export function assertCanReadTeam(user: AuthClaims | undefined, teamId: string): void {
  if (!user) throw new HttpError(401, "unauthenticated", "No user on request.");
  if (isManager(user)) return;
  if (user.teamId !== teamId) {
    throw new HttpError(403, "team_forbidden", "Resource belongs to a different team.");
  }
}

export function assertCanWriteTeam(user: AuthClaims | undefined, teamId: string): void {
  assertCanReadTeam(user, teamId);
}

export function scopeQueryToUser(user: AuthClaims | undefined): { teamId: string | null; bypass: boolean } {
  if (!user) throw new HttpError(401, "unauthenticated", "No user on request.");
  if (isManager(user)) return { teamId: null, bypass: true };
  if (!user.teamId) throw new HttpError(403, "no_team", "Employee has no team assigned.");
  return { teamId: user.teamId, bypass: false };
}
