import "dotenv/config";

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === "") {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  port: Number(optional("PORT", "4000")),
  nodeEnv: optional("NODE_ENV", "development"),
  authDevBypass: optional("AUTH_DEV_BYPASS", "false") === "true",

  awsRegion: required("AWS_REGION", "eu-central-1"),

  cognito: {
    userPoolId: optional("COGNITO_USER_POOL_ID"),
    clientId: optional("COGNITO_CLIENT_ID"),
  },

  ddb: {
    users: required("DDB_USERS_TABLE", "mini-jira-users"),
    teams: required("DDB_TEAMS_TABLE", "mini-jira-teams"),
    projects: required("DDB_PROJECTS_TABLE", "mini-jira-projects"),
    tasks: required("DDB_TASKS_TABLE", "mini-jira-tasks"),
    comments: required("DDB_COMMENTS_TABLE", "mini-jira-comments"),
    audit: required("DDB_AUDIT_TABLE", "mini-jira-audit"),
    gsi: {
      tasksByTeam: required("DDB_TASKS_GSI_TEAM", "byTeam"),
      tasksByAssignee: required("DDB_TASKS_GSI_ASSIGNEE", "byAssignee"),
      tasksByDeadline: required("DDB_TASKS_GSI_DEADLINE", "byDeadline"),
    },
  },

  s3: {
    originals: required("S3_ORIGINALS_BUCKET", "mini-jira-originals"),
    resized: required("S3_RESIZED_BUCKET", "mini-jira-resized"),
  },

  sns: {
    assignmentTopicArn: optional("SNS_ASSIGNMENT_TOPIC_ARN"),
    digestTopicArn: optional("SNS_DIGEST_TOPIC_ARN"),
  },

  cloudwatch: {
    namespace: optional("CW_NAMESPACE", "MiniJira"),
  },
};
