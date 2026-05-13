# AWS Manual Setup Checklist

Every cloud-touching part of the codebase reads from environment variables — never from
hardcoded ARNs. Provision the resources below, then either populate `backend/.env` from
`aws-config.json`, or upload each value to SSM Parameter Store under `/mini-jira/<KEY>`
(the EC2 user-data script reads from SSM).

> **Order matters** — sections are listed in dependency order.

---

## 1. Region & VPC

- Region: pick one (default in code: `eu-central-1`).
- VPC across **2 AZs**: 2 public subnets (ALB) + 2 private subnets (EC2) + NAT gateway.
- Security groups: ALB SG (allow 80/443 from world) → EC2 SG (allow 4000 from ALB SG).

## 2. Cognito User Pool

- Sign-in: **email**.
- Required attributes: `email`, `name`.
- Custom attributes: `custom:role` (string, mutable), `custom:teamId` (string, mutable).
- App client: no client secret (SPA), Auth flow: `ALLOW_USER_PASSWORD_AUTH` + `ALLOW_REFRESH_TOKEN_AUTH`.
- Capture: **User Pool ID** → `COGNITO_USER_POOL_ID`, **App Client ID** → `COGNITO_CLIENT_ID`.
- Seed users for the demo:
  - `ali@example.com` — `custom:role=manager`, `custom:teamId=` (empty)
  - `sara@example.com` — `custom:role=employee`, `custom:teamId=<frontend-team-id>`
  - `omar@example.com` — `custom:role=employee`, `custom:teamId=<backend-team-id>`

## 3. DynamoDB tables

All tables: on-demand billing.

| Table | PK | SK | GSIs |
|---|---|---|---|
| `mini-jira-users` | `userId` (S) | — | — |
| `mini-jira-teams` | `teamId` (S) | — | — |
| `mini-jira-projects` | `projectId` (S) | — | — |
| `mini-jira-tasks` | `taskId` (S) | — | `byTeam` (PK `teamId`), `byAssignee` (PK `assigneeId`), `byDeadline` (PK `teamId`, SK `deadline`) |
| `mini-jira-comments` | `taskId` (S) | `commentId` (S) | — |
| `mini-jira-audit` | `taskId` (S) | `auditId` (S) | — |

All GSIs: project ALL attributes.

## 4. S3 buckets

- `mini-jira-originals` — **versioning enabled** (PDF requires retaining old image versions).
- `mini-jira-resized` — versioning optional.
- Block public access on both. Backend uses presigned URLs for read/write.

## 5. Lambda — Image Resize

- Runtime: Node.js 20.
- Code: `lambdas/image-resize/index.js`.
- Layer: build sharp on Linux x64 (`cd lambdas/layers/sharp/nodejs && npm install --platform=linux --arch=x64 sharp`), zip the parent dir, publish as a layer.
- Env: `RESIZED_BUCKET=mini-jira-resized`, `MAX_WIDTH=800`.
- Trigger: S3 PUT events on `mini-jira-originals`.
- IAM: read on originals bucket, write on resized bucket.

## 6. SNS + SQS — Assignment events

- SNS topic: `mini-jira-assignment` → `SNS_ASSIGNMENT_TOPIC_ARN`.
- Subscriptions on the topic:
  1. **Email** (filter policy optional) — confirm address per assignee, or use a static notifications inbox for demo.
  2. **SQS queue** `mini-jira-assignments` (raw message delivery off so the worker sees the SNS envelope).
- IAM: backend EC2 role → `sns:Publish` on the topic.

## 7. Lambda — Assignment Worker

- Code: `lambdas/assignment-worker/index.js`.
- Trigger: SQS `mini-jira-assignments` (batch size ~10).
- Env: `CW_NAMESPACE=MiniJira`, `DDB_AUDIT_TABLE=mini-jira-audit`.
- IAM: SQS receive/delete, DynamoDB write to audit, `cloudwatch:PutMetricData`.

## 8. EventBridge — Daily Digest

- SNS topic: `mini-jira-digest` → `SNS_DIGEST_TOPIC_ARN` (with email subscriptions).
- Lambda: `lambdas/daily-digest/index.js`.
  - Env: `DDB_TASKS_TABLE`, `DDB_USERS_TABLE`, `SNS_DIGEST_TOPIC_ARN`.
  - IAM: DynamoDB scan on tasks & get on users, `sns:Publish`.
- EventBridge rule: `cron(0 9 * * ? *)` (UTC) → invokes the Lambda.

## 9. CloudWatch

Namespace: `MiniJira`. Backend + assignment worker emit:
- `TasksCreated` (dim: TeamId)
- `TasksClosed` (dim: TeamId)
- `TimeToCloseMs` (dim: TeamId)
- `TasksAssignedPerTeam` (dim: TeamId)

**Dashboard `MiniJiraOps`** — 4 widgets minimum:
1. Tasks created per day (sum of `TasksCreated`).
2. Tasks closed per day per team (sum of `TasksClosed`, grouped by TeamId).
3. Average time to close (avg of `TimeToCloseMs`).
4. EC2 CPU utilization (`AWS/EC2 CPUUtilization`, by AutoScalingGroupName).

**Alarm**: e.g. `OverdueTasks` — composite metric or scheduled check. Action: publish to an SNS topic (`mini-jira-alerts`).

## 10. EC2 + ALB + Auto Scaling

- Launch template: Amazon Linux 2023, t3.micro, IAM instance profile with: DynamoDB CRUD on the 6 tables, S3 read/write on both buckets, `sns:Publish` on assignment topic, `cloudwatch:PutMetricData`, `ssm:GetParameter` on `/mini-jira/*`.
- User data: `scripts/ec2-userdata.sh` (replace `REPO_URL`).
- Auto Scaling Group: 2 instances min/desired across 2 AZs in private subnets.
- Application Load Balancer: public subnets, listener 80 → target group port 4000, health check `/health`.

## 11. CloudFront

- Origin: the ALB DNS name.
- Cache behavior: `/api/*` → no cache (origin pass-through). Everything else → default cache.
- Capture the distribution domain → goes in the README as the live URL.

---

## After provisioning

1. Fill the real values into `aws-config.json` (gitignored — do not commit) and share via the team chat.
2. For each EC2 env var, run:
   ```bash
   aws ssm put-parameter --name /mini-jira/COGNITO_USER_POOL_ID --type String --value "..."
   ```
   Repeat for every key in `backend/.env.example`.
3. Push to `main` → ASG instance refresh → new instances run the user-data script and pull the latest code.

---

## Where the code touches AWS

| File | What it expects |
|---|---|
| [`backend/src/config/aws.config.ts`](../backend/src/config/aws.config.ts) | Reads every env var. |
| [`backend/src/middleware/auth.middleware.ts`](../backend/src/middleware/auth.middleware.ts) | Verifies Cognito JWTs (or uses `AUTH_DEV_BYPASS` locally). |
| [`backend/src/services/dynamo.service.ts`](../backend/src/services/dynamo.service.ts) | Single shared DocumentClient. |
| [`backend/src/services/s3.service.ts`](../backend/src/services/s3.service.ts) | Presigned upload/download, delete. |
| [`backend/src/services/sns.service.ts`](../backend/src/services/sns.service.ts) | Publishes assignment events. |
| [`backend/src/services/cloudwatch.service.ts`](../backend/src/services/cloudwatch.service.ts) | Custom metrics. |
| [`lambdas/image-resize/index.js`](../lambdas/image-resize/index.js) | S3 → Sharp → S3. |
| [`lambdas/assignment-worker/index.js`](../lambdas/assignment-worker/index.js) | SQS → DDB audit + CloudWatch metric. |
| [`lambdas/daily-digest/index.js`](../lambdas/daily-digest/index.js) | EventBridge → DDB scan → SNS. |
