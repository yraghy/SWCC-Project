import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { createComment, listComments } from "./comments.service";
import { HttpError } from "../../middleware/auth.middleware";

export const commentsRouter = Router();

const createSchema = z.object({
  body: z.string().min(1).max(5000),
});

function requireUser(req: Request) {
  if (!req.user) throw new HttpError(401, "unauthenticated", "No user.");
  return req.user;
}

commentsRouter.post("/tasks/:taskId", async (req, res, next) => {
  try {
    const dto = createSchema.parse(req.body);
    res.status(201).json(await createComment(requireUser(req), req.params.taskId, dto));
  } catch (err) {
    next(err);
  }
});

commentsRouter.get("/tasks/:taskId", async (req, res, next) => {
  try {
    res.json(await listComments(requireUser(req), req.params.taskId));
  } catch (err) {
    next(err);
  }
});

commentsRouter.use((err: Error, _req: Request, _res: Response, next: NextFunction) => {
  if (err instanceof z.ZodError) {
    return next(new HttpError(400, "validation_error", err.issues.map((i) => i.message).join("; ")));
  }
  next(err);
});
