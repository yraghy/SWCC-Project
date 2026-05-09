import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { createUser, getUser, listUsers, upsertUserFromClaims } from "./users.service";
import { HttpError } from "../../middleware/auth.middleware";

export const usersRouter = Router();

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120),
  role: z.enum(["manager", "employee", "admin"]),
  teamId: z.string().nullable(),
});

const listSchema = z.object({ teamId: z.string().optional() });

function requireUser(req: Request) {
  if (!req.user) throw new HttpError(401, "unauthenticated", "No user.");
  return req.user;
}

usersRouter.get("/me", async (req, res, next) => {
  try {
    const user = await upsertUserFromClaims(requireUser(req));
    res.json(user);
  } catch (err) {
    next(err);
  }
});

usersRouter.post("/", async (req, res, next) => {
  try {
    const dto = createSchema.parse(req.body);
    res.status(201).json(await createUser(requireUser(req), dto));
  } catch (err) {
    next(err);
  }
});

usersRouter.get("/", async (req, res, next) => {
  try {
    const filter = listSchema.parse(req.query);
    res.json(await listUsers(filter));
  } catch (err) {
    next(err);
  }
});

usersRouter.get("/:id", async (req, res, next) => {
  try {
    const user = await getUser(req.params.id);
    if (!user) throw new HttpError(404, "not_found", "User not found.");
    res.json(user);
  } catch (err) {
    next(err);
  }
});

usersRouter.use((err: Error, _req: Request, _res: Response, next: NextFunction) => {
  if (err instanceof z.ZodError) {
    return next(new HttpError(400, "validation_error", err.issues.map((i) => i.message).join("; ")));
  }
  next(err);
});
