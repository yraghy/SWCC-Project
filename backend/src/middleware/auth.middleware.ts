import { Request, Response, NextFunction, RequestHandler } from "express";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { env } from "../config/aws.config";
import type { AuthClaims, Role } from "../../../shared/types";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthClaims;
    }
  }
}

class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;
function getVerifier() {
  if (verifier) return verifier;
  if (!env.cognito.userPoolId || !env.cognito.clientId) {
    throw new HttpError(
      500,
      "auth_not_configured",
      "Cognito user pool / client ID not configured. Set COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID, or enable AUTH_DEV_BYPASS for local dev.",
    );
  }
  verifier = CognitoJwtVerifier.create({
    userPoolId: env.cognito.userPoolId,
    tokenUse: "id",
    clientId: env.cognito.clientId,
  });
  return verifier;
}

function parseDevUser(header: string | string[] | undefined): AuthClaims {
  if (!header || typeof header !== "string") {
    throw new HttpError(401, "missing_dev_user", "AUTH_DEV_BYPASS is on but X-Dev-User header is missing.");
  }
  try {
    const parsed = JSON.parse(header) as Partial<AuthClaims>;
    if (!parsed.sub || !parsed.role) throw new Error("missing sub/role");
    return {
      sub: parsed.sub,
      email: parsed.email ?? `${parsed.sub}@dev.local`,
      role: parsed.role,
      teamId: parsed.teamId ?? null,
      name: parsed.name ?? parsed.sub,
    };
  } catch (e) {
    throw new HttpError(401, "invalid_dev_user", "X-Dev-User must be a JSON object with sub and role.");
  }
}

export const authMiddleware: RequestHandler = async (req, _res, next) => {
  try {
    if (env.authDevBypass) {
      req.user = parseDevUser(req.headers["x-dev-user"]);
      return next();
    }

    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new HttpError(401, "missing_token", "Authorization header missing or malformed.");
    }
    const token = header.slice("Bearer ".length);
    const payload = await getVerifier().verify(token);

    const role = (payload["custom:role"] ?? payload["cognito:groups"]?.[0] ?? "employee") as Role;
    const teamId = (payload["custom:teamId"] ?? null) as string | null;

    req.user = {
      sub: String(payload.sub),
      email: String(payload.email ?? ""),
      role,
      teamId,
      name: String(payload.name ?? payload.email ?? payload.sub),
    };
    next();
  } catch (err) {
    if (err instanceof HttpError) return next(err);
    next(new HttpError(401, "invalid_token", (err as Error).message));
  }
};

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(new HttpError(401, "unauthenticated", "No user on request."));
    if (!roles.includes(req.user.role)) {
      return next(new HttpError(403, "forbidden", `Requires role: ${roles.join(", ")}`));
    }
    next();
  };
}

export { HttpError };
