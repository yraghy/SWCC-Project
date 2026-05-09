import { createApp } from "./src/app";
import { env } from "./src/config/aws.config";

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`mini-jira backend listening on :${env.port} (${env.nodeEnv})`);
  if (env.authDevBypass) {
    console.warn("AUTH_DEV_BYPASS is enabled — Cognito JWT verification is OFF.");
  }
});

function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
