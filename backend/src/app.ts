import express, { Request, Response, NextFunction } from "express";
import path from "node:path";
import cors from "cors";
import morgan from "morgan";
import { authMiddleware } from "./middleware/auth.middleware";
import { tasksRouter } from "./modules/tasks/tasks.controller";
import { projectsRouter } from "./modules/projects/projects.controller";
import { commentsRouter } from "./modules/comments/comments.controller";
import { teamsRouter } from "./modules/teams/teams.controller";
import { usersRouter } from "./modules/users/users.controller";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "2mb" }));
  app.use(morgan("dev"));

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/api", authMiddleware);
  app.use("/api/tasks", tasksRouter);
  app.use("/api/projects", projectsRouter);
  app.use("/api/comments", commentsRouter);
  app.use("/api/teams", teamsRouter);
  app.use("/api/users", usersRouter);

  // Serve the statically-exported frontend (Next.js `out/`).
  const STATIC_DIR = path.join(__dirname, "..", "..", "..", "..", "frontend", "out");
  app.use(express.static(STATIC_DIR, { extensions: ["html"] }));

  // SPA fallback — any non-/api GET returns index.html.
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(STATIC_DIR, "index.html"));
  });

  app.use((req, res) => {
    res.status(404).json({ error: "not_found", path: req.path });
  });

  app.use((err: Error & { status?: number; code?: string }, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status ?? 500;
    const code = err.code ?? (status === 500 ? "internal_error" : "error");
    if (status >= 500) console.error(err);
    res.status(status).json({ error: code, message: err.message });
  });

  return app;
}
