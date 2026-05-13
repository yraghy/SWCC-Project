import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { createTeam, getTeam, listTeams } from "./teams.service";
import { HttpError } from "../../middleware/auth.middleware";

export const teamsRouter = Router();

const createSchema = z.object({ name: z.string().min(1).max(80) });

function requireUser(req: Request) {
  if (!req.user) throw new HttpError(401, "unauthenticated", "No user.");
  return req.user;
}

teamsRouter.post("/", async (req, res, next) => {
  try {
    const dto = createSchema.parse(req.body);
    res.status(201).json(await createTeam(requireUser(req), dto));
  } catch (err) {
    next(err);
  }
});

teamsRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await listTeams());
  } catch (err) {
    next(err);
  }
});

teamsRouter.get("/:id", async (req, res, next) => {
  try {
    const team = await getTeam(req.params.id);
    if (!team) throw new HttpError(404, "not_found", "Team not found.");
    res.json(team);
  } catch (err) {
    next(err);
  }
});

teamsRouter.use((err: Error, _req: Request, _res: Response, next: NextFunction) => {
  if (err instanceof z.ZodError) {
    return next(new HttpError(400, "validation_error", err.issues.map((i) => i.message).join("; ")));
  }
  next(err);
});
