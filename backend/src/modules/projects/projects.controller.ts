import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
} from "./projects.service";
import { HttpError } from "../../middleware/auth.middleware";

export const projectsRouter = Router();

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).default(""),
});

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).optional(),
});

function requireUser(req: Request) {
  if (!req.user) throw new HttpError(401, "unauthenticated", "No user.");
  return req.user;
}

projectsRouter.post("/", async (req, res, next) => {
  try {
    const dto = createSchema.parse(req.body);
    res.status(201).json(await createProject(requireUser(req), dto));
  } catch (err) {
    next(err);
  }
});

projectsRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await listProjects());
  } catch (err) {
    next(err);
  }
});

projectsRouter.get("/:id", async (req, res, next) => {
  try {
    res.json(await getProject(req.params.id));
  } catch (err) {
    next(err);
  }
});

projectsRouter.patch("/:id", async (req, res, next) => {
  try {
    const dto = updateSchema.parse(req.body);
    res.json(await updateProject(requireUser(req), req.params.id, dto));
  } catch (err) {
    next(err);
  }
});

projectsRouter.delete("/:id", async (req, res, next) => {
  try {
    await deleteProject(requireUser(req), req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

projectsRouter.use((err: Error, _req: Request, _res: Response, next: NextFunction) => {
  if (err instanceof z.ZodError) {
    return next(new HttpError(400, "validation_error", err.issues.map((i) => i.message).join("; ")));
  }
  next(err);
});
