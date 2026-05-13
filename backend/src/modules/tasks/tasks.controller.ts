import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import {
  attachImage,
  createTask,
  deleteTask,
  getTask,
  getTaskImageUrls,
  listTasks,
  updateTask,
} from "./tasks.service";
import { presignUpload } from "../../services/s3.service";
import { listAuditForTask } from "../../services/audit.service";
import { HttpError } from "../../middleware/auth.middleware";
import type { TaskStatus } from "../../../../shared/types";

export const tasksRouter = Router();

const createSchema = z.object({
  projectId: z.string().min(1),
  teamId: z.string().min(1),
  assigneeId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).default(""),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  deadline: z.string().min(1),
});

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  deadline: z.string().optional(),
  status: z.enum(["todo", "in_progress", "in_review", "done"]).optional(),
  assigneeId: z.string().min(1).optional(),
  teamId: z.string().min(1).optional(),
});

const listSchema = z.object({
  teamId: z.string().optional(),
  assigneeId: z.string().optional(),
  status: z.enum(["todo", "in_progress", "in_review", "done"]).optional(),
});

const presignSchema = z.object({
  contentType: z.string().regex(/^image\/(png|jpe?g|webp|gif)$/),
});

function requireUser(req: Request) {
  if (!req.user) throw new HttpError(401, "unauthenticated", "No user.");
  return req.user;
}

tasksRouter.post("/", async (req, res, next) => {
  try {
    const dto = createSchema.parse(req.body);
    const task = await createTask(requireUser(req), dto);
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

tasksRouter.get("/", async (req, res, next) => {
  try {
    const filter = listSchema.parse(req.query);
    const tasks = await listTasks(requireUser(req), filter as { status?: TaskStatus });
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

tasksRouter.get("/:id", async (req, res, next) => {
  try {
    const task = await getTask(requireUser(req), req.params.id);
    const images = await getTaskImageUrls(task);
    res.json({ ...task, images });
  } catch (err) {
    next(err);
  }
});

tasksRouter.patch("/:id", async (req, res, next) => {
  try {
    const dto = updateSchema.parse(req.body);
    const task = await updateTask(requireUser(req), req.params.id, dto);
    res.json(task);
  } catch (err) {
    next(err);
  }
});

tasksRouter.delete("/:id", async (req, res, next) => {
  try {
    await deleteTask(requireUser(req), req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

tasksRouter.post("/:id/images/presign", async (req, res, next) => {
  try {
    const { contentType } = presignSchema.parse(req.body);
    const ext = contentType.split("/")[1].replace("jpeg", "jpg");
    const key = `tasks/${req.params.id}/${uuid()}.${ext}`;
    const url = await presignUpload(key, contentType);
    res.json({ uploadUrl: url, key });
  } catch (err) {
    next(err);
  }
});

tasksRouter.post("/:id/images", async (req, res, next) => {
  try {
    const { key } = z.object({ key: z.string().min(1) }).parse(req.body);
    const task = await attachImage(requireUser(req), req.params.id, key);
    res.json(task);
  } catch (err) {
    next(err);
  }
});

tasksRouter.get("/:id/audit", async (req, res, next) => {
  try {
    await getTask(requireUser(req), req.params.id);
    const entries = await listAuditForTask(req.params.id);
    res.json(entries);
  } catch (err) {
    next(err);
  }
});

tasksRouter.use((err: Error, _req: Request, _res: Response, next: NextFunction) => {
  if (err instanceof z.ZodError) {
    return next(new HttpError(400, "validation_error", err.issues.map((i) => i.message).join("; ")));
  }
  next(err);
});
