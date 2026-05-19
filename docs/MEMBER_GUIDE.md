# Member Guide — Step-by-Step Cookbook

A detailed, click-by-click walk-through for each of the 5 team members. **Read the [Preamble](#preamble) first, then jump to your own section.** Each section is self-contained — you do not need to read the others.

> **Deadline:** 22 May 2026 · 23:59
>
> **Related docs:** [`TEAM_ROLES.md`](./TEAM_ROLES.md) (dependency chain at a glance) · [`CLOUD_SETUP.md`](./CLOUD_SETUP.md) (service-by-service reference)

---

## Table of contents

1. [Preamble](#preamble)
2. [Section 1 — Member 1: Foundations](#section-1--member-1-foundations)
3. [Section 2 — Member 2: Backend integration](#section-2--member-2-backend-integration)
4. [Section 3 — Member 3: Events & Lambdas](#section-3--member-3-events--lambdas)
5. [Section 4 — Member 4: Hosting infrastructure](#section-4--member-4-hosting-infrastructure)
6. [Section 5 — Member 5: Frontend & demo](#section-5--member-5-frontend--demo)
7. [Appendix A — Glossary](#appendix-a--glossary)
8. [Appendix B — `aws-config.json` final shape](#appendix-b--aws-configjson-final-shape)
9. [Appendix C — Troubleshooting](#appendix-c--troubleshooting)
10. [Appendix D — Deliverables checklist](#appendix-d--deliverables-checklist)

---

## Preamble

### How to use this doc

- **Find your member number** in `TEAM_ROLES.md`. Open this doc, jump to your section, work top-to-bottom.
- **Don't skip steps** — every step ends with a verification command. If verification fails, fix that step before moving on.
- **At handoff time**, post the handoff message in the team chat *and* update `aws-config.json` (gitignored, share via chat).
- For services you want to understand more deeply, see [`CLOUD_SETUP.md`](./CLOUD_SETUP.md).

### Region — non-negotiable

**Everything goes in `eu-central-1` (Frankfurt)**. Two exceptions only:

- The billing alarm (must live in `us-east-1`) — Member 1, step 1.2.
- AWS Budgets — global, no region selector.

Before every console action, check the region selector in the top-right corner. If you see something you didn't create, you're in the wrong region.

### Naming convention

| Prefix | Meaning |
|---|---|
| `swcc-project-` | Every resource starts with this. Tables, buckets, Lambdas, roles, queues, security groups — everything. |
| `Project=swcc-project` tag | Apply on *every* resource that supports tags. Lets you list and stop them as a group later. |

S3 bucket names are globally unique across all of AWS — you'll need a unique suffix like `swcc-project-originals-yraghy` or `swcc-project-originals-<your-account-id>`. Pick a suffix once and reuse it for both buckets.

### `aws-config.json` — the shared truth

This file in the repo root is gitignored. Each member fills in their part as they provision. The final shape is in [Appendix B](#appendix-b--aws-configjson-final-shape). After each handoff, post the latest version in the team chat so the next person can pick it up.

### Communication rules

- **Every ARN / ID / DNS name goes in two places**: `aws-config.json` *and* the team chat.
- **Never click "Terminate"** on anything until grades come back. Stop instances when not in use; *don't terminate*. Per the PDF, terminated resources = zero.
- **Tag everything** `Project=swcc-project` so you can find them all later.

### What's already done (don't redo)

- All code is scaffolded on `main`: backend, frontend, lambdas, shared types.
- Local dev with mocks works: `cd frontend && npm install && npm run dev` → click any of the dev login buttons. No AWS needed.
- CI workflow runs typecheck on every push.

### What's still pending in code (gaps Member 5 fills)

- Image-upload UI in `frontend/src/components/tasks/TaskForm.tsx` (backend already supports it).
- Pre-seed for the DynamoDB users table (Member 2 or 5 — coordinate).
- Optional: tighten status-flow transitions in `backend/src/modules/tasks/tasks.service.ts`.
- `backend/src/app.ts` will need a one-line `express.static()` addition to serve the frontend from EC2.

---

## Section 1 — Member 1: Foundations

**Blocks:** everyone. Start immediately.
**Estimated time:** 4–6 hours total, can be split across two sessions.
**Prerequisites:** You're the AWS root account holder, or you can elevate to root once.

### 1.0 Install the AWS CLI on your laptop

You'll need this in step 1.8 to seed Cognito users. Skip if already installed (`aws --version` should print 2.x).

```bash
# macOS
brew install awscli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install

# Windows
# Download https://awscli.amazonaws.com/AWSCLIV2.msi and run it
```

**Don't run `aws configure` yet** — that's step 1.3 after you create your IAM user.

### 1.1 Lock down the root account

Console → top-right account dropdown → **Security credentials** (you're signed in as root).

1. Under **Multi-factor authentication (MFA)** → **Assign MFA device** → use Authy / Google Authenticator. Scan QR, enter two consecutive codes.
2. Under **Access keys** — if any exist, **delete them all**. Root should never have access keys.
3. **Sign out**. From now on, do not log in as root unless it's the last resort.

### 1.2 Billing protections

Three layers, takes 5 minutes:

**1.2.a — Enable billing metrics**

1. Console → search "Billing" → **Billing and Cost Management**.
2. Left sidebar → **Billing preferences**.
3. Tick **"Receive AWS Free Tier alerts"** + **"Receive billing alerts"**. Save.

**1.2.b — Check your credits**

1. Left sidebar → **Credits**.
2. Confirm the balance and **expiration date** — if any expire before 22 May 2026, flag it in the team chat now.

**1.2.c — Set a CloudWatch billing alarm (must be in us-east-1)**

1. Top-right region selector → **US East (N. Virginia)** (billing metrics only exist here).
2. CloudWatch → Alarms → **Create alarm** → **Select metric** → **Billing** → **Total Estimated Charge** → currency USD.
3. Conditions: Static, Greater than **50**, Period 6 hours.
4. Notification: Create new SNS topic `swcc-project-billing-alerts` (in us-east-1), add your email, **confirm the subscription** email in your inbox.
5. Name: `swcc-project-billing-over-50usd`. Create.

**1.2.d — Switch back to eu-central-1**

Top-right region selector → **Europe (Frankfurt)**. From now on stay here unless explicitly told otherwise.

### 1.3 IAM group + 5 users

Console → **IAM**.

**1.3.a — Group**

1. **User groups** → **Create group**.
2. Name: `SWCCProjectTeam`.
3. Attach permissions policies → search and tick **`AdministratorAccess`** (we discussed why — it avoids permission-prompt hell during the deadline crunch).
4. **Create group**.

**1.3.b — Users (repeat 5 times, one per teammate)**

1. **Users** → **Create user**.
2. Username: lowercase, no spaces (e.g. `ali`, `sara`, `omar`, etc.).
3. Tick **Provide user access to the AWS Management Console**.
4. Select **I want to create an IAM user** (skip the Identity Center recommendation — overkill for this project).
5. Autogenerated password. Tick **Users must create a new password at next sign-in**.
6. **Next** → **Add user to group** → tick `SWCCProjectTeam` → **Next** → **Create user**.
7. **Download .csv** — contains the console URL + username + temporary password. Send to that teammate over a DM (not the group chat).
8. Open the user → **Security credentials** → **Assign MFA device** info shown to them on first sign-in.

**1.3.c — Your own access key**

You (Member 1) need an access key to seed Cognito users in step 1.8.

1. Open *your own* IAM user → **Security credentials** → **Create access key**.
2. Use case: **Command Line Interface (CLI)**. Tick "I understand the above recommendation" → Next → Create.
3. **Download the .csv** — only chance to see the secret.
4. In your terminal:
   ```bash
   aws configure
   ```
   - Access Key ID: paste from CSV
   - Secret Access Key: paste from CSV
   - Default region: `eu-central-1`
   - Default output format: `json`

5. Sanity-check:
   ```bash
   aws sts get-caller-identity
   ```
   Should print your IAM user ARN.

### 1.4 Cognito user pool

Console → **Cognito**.

1. **Create user pool** (or click *Get started* if first time).
2. **Define your application**:
   - Application type: **Traditional web application**
   - Application name: `swcc-project-web`
   - Sign-in identifiers: tick **Email** only.
3. **Configure options**:
   - Required attributes: tick **email** and **name** (you may need to expand "Add additional required attributes" to see name).
   - **Add custom attributes** (this section is critical):
     - Attribute 1: Name `role`, Type **String**, Mutable **yes**, Min length 1, Max length 32.
     - Attribute 2: Name `teamId`, Type **String**, Mutable **yes**, Min length 0, Max length 64.
     - (AWS prefixes these with `custom:` automatically — the resulting attribute names are `custom:role` and `custom:teamId`.)
4. **Multi-factor authentication**: Optional MFA (don't make it required — slows down demo).
5. **User account recovery**: Email only.
6. **Configure message delivery**: Send email with Cognito (free, 50/day default — enough for demo).
7. **Integrate your app**:
   - User pool name: `swcc-project-users`
   - App client name: `swcc-project-web-client`
   - Client secret: **Don't generate** (this is a public SPA).
   - Advanced authentication flows: tick **ALLOW_USER_PASSWORD_AUTH** and **ALLOW_REFRESH_TOKEN_AUTH**.
8. **Review and create**.

**Capture the values:**
- After creation, open the pool → top of the page → **User pool ID** (e.g. `eu-central-1_AbC123XyZ`) → save as `COGNITO_USER_POOL_ID`.
- Open **App integration** tab → **App client list** → click `swcc-project-web-client` → **Client ID** → save as `COGNITO_CLIENT_ID`.

Paste both into `aws-config.json` and the team chat now.

### 1.5 DynamoDB tables (6 total)

Console → **DynamoDB** → **Tables** → **Create table**. Repeat for each table below. All use **On-demand** capacity mode (no capacity math, scales automatically, pay per request).

| Table | Partition key | Sort key | GSIs |
|---|---|---|---|
| `swcc-project-users` | `userId` (String) | — | none |
| `swcc-project-teams` | `teamId` (String) | — | none |
| `swcc-project-projects` | `projectId` (String) | — | none |
| `swcc-project-comments` | `taskId` (String) | `commentId` (String) | none |
| `swcc-project-audit` | `taskId` (String) | `auditId` (String) | none |
| `swcc-project-tasks` | `taskId` (String) | — | **3 GSIs — see below** |

For every table:
1. Table name → as above (case-sensitive).
2. Partition key + (optional) sort key.
3. **Default settings** for everything else.
4. Tags: key `Project`, value `swcc-project`.
5. **Create table**.

**`swcc-project-tasks` GSIs** — create these at table-creation time (adding them later is slow and rebuilds the whole table). On the create-table page, expand **"Secondary indexes"** → **Create global index** three times:

| Index name | Partition key | Sort key | Projection |
|---|---|---|---|
| `byTeam` | `teamId` (String) | — | All attributes |
| `byAssignee` | `assigneeId` (String) | — | All attributes |
| `byDeadline` | `teamId` (String) | `deadline` (String) | All attributes |

After all 6 tables show **Active** status, verify with:

```bash
aws dynamodb list-tables --region eu-central-1
```

Should list all six.

### 1.6 S3 buckets

S3 bucket names are **globally unique** — pick a suffix once and use it everywhere. Throughout this doc I'll write `<suffix>` — replace with your suffix (e.g. `-yraghy` or `-12345`).

Console → **S3** → **Create bucket**. Repeat for each:

**Bucket 1 — `swcc-project-originals<suffix>`**

1. AWS Region: **Europe (Frankfurt) eu-central-1**.
2. Bucket name: `swcc-project-originals<suffix>` (record exact name).
3. **Block all public access**: keep ON (default).
4. **Bucket versioning**: **Enable** (PDF explicitly requires retaining old image versions).
5. Tags: `Project=swcc-project`.
6. Create.

**Bucket 2 — `swcc-project-resized<suffix>`**

Same as above, but **Bucket versioning** can stay disabled.

Verify both exist:

```bash
aws s3 ls
```

### 1.7 IAM roles (4 roles)

Console → **IAM** → **Roles** → **Create role**. Repeat 4 times.

For each role, I list (a) trusted entity, (b) attached policies. After creating, save the ARN.

**1.7.a — `swcc-project-ec2` (instance profile for the backend)**

- Trusted entity type: **AWS service** → Use case: **EC2**.
- Permissions — attach these managed policies:
  - `AmazonDynamoDBFullAccess`
  - `AmazonS3FullAccess`
  - `AmazonSNSFullAccess`
  - `CloudWatchAgentServerPolicy`
  - `AmazonSSMReadOnlyAccess`
- Role name: `swcc-project-ec2`.
- Create.

> Note: for a real production system you'd write a tight inline policy scoped to `swcc-project-*` resources. For a 12-day student project the managed policies are fine. If your grader asks, mention you'd swap them for inline least-privilege.

**1.7.b — `swcc-project-lambda-image-resize`**

- Trusted entity: **AWS service** → Use case: **Lambda**.
- Permissions:
  - `AWSLambdaBasicExecutionRole` (for CloudWatch Logs)
  - `AmazonS3FullAccess`
- Role name: `swcc-project-lambda-image-resize`.

**1.7.c — `swcc-project-lambda-assignment-worker`**

- Trusted entity: **AWS service** → **Lambda**.
- Permissions:
  - `AWSLambdaBasicExecutionRole`
  - `AmazonSQSFullAccess`
  - `AmazonDynamoDBFullAccess`
  - `CloudWatchAgentServerPolicy`
- Role name: `swcc-project-lambda-assignment-worker`.

**1.7.d — `swcc-project-lambda-daily-digest`**

- Trusted entity: **AWS service** → **Lambda**.
- Permissions:
  - `AWSLambdaBasicExecutionRole`
  - `AmazonDynamoDBReadOnlyAccess`
  - `AmazonSNSFullAccess`
- Role name: `swcc-project-lambda-daily-digest`.

### 1.8 Seed Cognito users (Ali, Sara, Omar)

The PDF demo scenario requires three specific users. This step has three sub-tasks: **1.8.a** seed teams in DynamoDB, **1.8.b** create the Cognito users, **1.8.c** make their passwords permanent. For each sub-task you can use either the **Console** path or the **CLI** path — **pick one, don't do both**.

> **Use real email addresses** if you want the assignment-notification emails (Member 3) to actually arrive. For demo purposes, route all three to a single inbox like `yraghy+ali@gmail.com` / `yraghy+sara@gmail.com` (Gmail ignores everything after `+`).

#### 1.8.a Seed 3 teams in DynamoDB

You need three teams (`team-fe`, `team-be`, `team-qa`) before creating Cognito users so the users can reference them.

<details open>
<summary><strong>👉 Console path (recommended for first-timers)</strong></summary>

For each of the three teams below, do this in the DynamoDB console:

1. Console → **DynamoDB** → **Tables** → click `swcc-project-teams`.
2. Top-right → **Explore table items**.
3. **Create item** → **JSON view** (toggle in the top-right of the editor).
4. Paste the JSON for the team, then **Create item**.

Repeat for all three:

```json
{ "teamId": "team-fe", "name": "Frontend", "createdAt": "2026-05-14T00:00:00Z" }
```

```json
{ "teamId": "team-be", "name": "Backend",  "createdAt": "2026-05-14T00:00:00Z" }
```

```json
{ "teamId": "team-qa", "name": "QA",       "createdAt": "2026-05-14T00:00:00Z" }
```
</details>

<details>
<summary><strong>⚡ CLI path (faster — 30 seconds)</strong></summary>

```bash
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

aws dynamodb put-item --table-name swcc-project-teams --item \
  '{"teamId":{"S":"team-fe"},"name":{"S":"Frontend"},"createdAt":{"S":"'"$NOW"'"}}'

aws dynamodb put-item --table-name swcc-project-teams --item \
  '{"teamId":{"S":"team-be"},"name":{"S":"Backend"},"createdAt":{"S":"'"$NOW"'"}}'

aws dynamodb put-item --table-name swcc-project-teams --item \
  '{"teamId":{"S":"team-qa"},"name":{"S":"QA"},"createdAt":{"S":"'"$NOW"'"}}'
```
</details>

#### 1.8.b Create the three Cognito demo users

<details open>
<summary><strong>👉 Console path</strong></summary>

Repeat the steps below **three times**, once for each user, with the per-user values from the table.

1. Console → **Cognito** → **User pools** → click `swcc-project-users`.
2. **Users** tab → **Create user**.
3. **Invitation message**: select **Don't send an invitation**.
4. **Email address**: enter the user's email (from the table).
5. Tick **Mark email address as verified**.
6. **Temporary password**: select **Set a password** → type `TempPass123!`.
7. Scroll down to **Optional attributes** — fill in:
   - `name` → the value from the table
   - `custom:role` → the value from the table
   - `custom:teamId` → the value from the table (leave blank for Ali)
8. **Create user**.

Per-user values:

| Email | name | custom:role | custom:teamId |
|---|---|---|---|
| `ali@example.com` | `Ali (Manager)` | `manager` | *(leave blank)* |
| `sara@example.com` | `Sara` | `employee` | `team-fe` |
| `omar@example.com` | `Omar` | `employee` | `team-be` |
</details>

<details>
<summary><strong>⚡ CLI path (faster — 10 seconds for all 3)</strong></summary>

Replace `eu-central-1_XXX` with your actual user pool ID:

```bash
POOL_ID=eu-central-1_XXX  # ← paste yours

# Ali — Manager
aws cognito-idp admin-create-user \
  --user-pool-id $POOL_ID \
  --username ali@example.com \
  --user-attributes \
      Name=email,Value=ali@example.com \
      Name=email_verified,Value=true \
      Name=name,Value="Ali (Manager)" \
      Name=custom:role,Value=manager \
      Name=custom:teamId,Value="" \
  --temporary-password "TempPass123!"

# Sara — Frontend employee
aws cognito-idp admin-create-user \
  --user-pool-id $POOL_ID \
  --username sara@example.com \
  --user-attributes \
      Name=email,Value=sara@example.com \
      Name=email_verified,Value=true \
      Name=name,Value="Sara" \
      Name=custom:role,Value=employee \
      Name=custom:teamId,Value=team-fe \
  --temporary-password "TempPass123!"

# Omar — Backend employee
aws cognito-idp admin-create-user \
  --user-pool-id $POOL_ID \
  --username omar@example.com \
  --user-attributes \
      Name=email,Value=omar@example.com \
      Name=email_verified,Value=true \
      Name=name,Value="Omar" \
      Name=custom:role,Value=employee \
      Name=custom:teamId,Value=team-be \
  --temporary-password "TempPass123!"
```
</details>

#### 1.8.c Make the passwords permanent

By default Cognito forces each user to change their password on first sign-in, which derails the demo. Override it.

> **Note**: Cognito's console only lets you *reset* a password (which forces another change on next login). To set a **permanent** password without that prompt you have to use the CLI — there is no fully console equivalent. **Run the CLI block below regardless of which path you used above.**

```bash
POOL_ID=eu-central-1_XXX  # ← paste yours if not already set

for USER in ali@example.com sara@example.com omar@example.com; do
  aws cognito-idp admin-set-user-password \
    --user-pool-id $POOL_ID \
    --username $USER \
    --password "DemoPass123!" \
    --permanent
done
```

Record the demo credentials in the team chat (one of the only times secrets are OK in chat — these are throwaway demo accounts):

```
Demo credentials:
  ali@example.com   / DemoPass123!  (Manager)
  sara@example.com  / DemoPass123!  (Frontend)
  omar@example.com  / DemoPass123!  (Backend)
```

### 1.9 Handoff to Member 2

Update `aws-config.json` in the repo root with the values you captured. Post the file contents in the team chat:

```jsonc
{
  "region": "eu-central-1",
  "cognito": {
    "userPoolId": "eu-central-1_XXX",
    "clientId": "XXXXXXXXXXXXXXXX"
  },
  "dynamodb": {
    "users":    "swcc-project-users",
    "teams":    "swcc-project-teams",
    "projects": "swcc-project-projects",
    "tasks":    "swcc-project-tasks",
    "comments": "swcc-project-comments",
    "audit":    "swcc-project-audit",
    "gsi": {
      "tasksByTeam":     "byTeam",
      "tasksByAssignee": "byAssignee",
      "tasksByDeadline": "byDeadline"
    }
  },
  "s3": {
    "originals": "swcc-project-originals<suffix>",
    "resized":   "swcc-project-resized<suffix>"
  },
  "iam": {
    "ec2Role":              "arn:aws:iam::<acct>:role/swcc-project-ec2",
    "lambdaImageResize":    "arn:aws:iam::<acct>:role/swcc-project-lambda-image-resize",
    "lambdaAssignmentWorker": "arn:aws:iam::<acct>:role/swcc-project-lambda-assignment-worker",
    "lambdaDailyDigest":    "arn:aws:iam::<acct>:role/swcc-project-lambda-daily-digest"
  }
}
```

### 1.10 Verification

Run these commands. All should succeed:

```bash
# Cognito pool exists
aws cognito-idp list-user-pools --max-results 10 | grep swcc-project

# All 6 DynamoDB tables exist
aws dynamodb list-tables | grep swcc-project

# All 3 demo users exist
aws cognito-idp list-users --user-pool-id $POOL_ID | grep -E "(ali|sara|omar)@"

# 3 teams seeded
aws dynamodb scan --table-name swcc-project-teams --select COUNT
# → "Count": 3

# Both S3 buckets exist
aws s3 ls | grep swcc-project

# All 4 IAM roles exist
aws iam list-roles | grep swcc-project
```

You are done. **Hand off to Member 2.**

---

## Section 2 — Member 2: Backend integration

**Prerequisites:** Member 1 done. You have `aws-config.json` with Cognito + DynamoDB + S3 names.
**Estimated time:** 2–3 hours.

### 2.1 Personal AWS CLI setup

1. Install AWS CLI (see Member 1 step 1.0).
2. Get your IAM access key from Member 1 (or create one yourself if you have console access):
   - Console → IAM → Users → click your name → **Security credentials** → **Create access key** → Use case **CLI** → Download CSV.
3. Run:
   ```bash
   aws configure
   # Access Key ID: from CSV
   # Secret Access Key: from CSV
   # Default region name: eu-central-1
   # Default output format: json
   ```
4. Verify:
   ```bash
   aws sts get-caller-identity
   ```
   Should print your IAM user ARN.

### 2.2 Install Node.js 20 and clone the repo

```bash
# Node.js 20 (macOS)
brew install node@20
# Or via nvm:
# nvm install 20 && nvm use 20

# Verify
node --version  # → v20.x.x

# Clone
git clone https://github.com/yraghy/SWCC-Project.git
cd SWCC-Project
```

### 2.3 Backend env config

```bash
cd backend
cp .env.example .env
```

Open `.env` in your editor and fill in from `aws-config.json`:

```bash
PORT=4000
NODE_ENV=development
AUTH_DEV_BYPASS=true    # ← keep true for now; we test auth without Cognito JWTs first
AWS_REGION=eu-central-1

COGNITO_USER_POOL_ID=eu-central-1_XXX        # ← from aws-config.json
COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXX            # ← from aws-config.json

DDB_USERS_TABLE=swcc-project-users
DDB_TEAMS_TABLE=swcc-project-teams
DDB_PROJECTS_TABLE=swcc-project-projects
DDB_TASKS_TABLE=swcc-project-tasks
DDB_COMMENTS_TABLE=swcc-project-comments
DDB_AUDIT_TABLE=swcc-project-audit

DDB_TASKS_GSI_TEAM=byTeam
DDB_TASKS_GSI_ASSIGNEE=byAssignee
DDB_TASKS_GSI_DEADLINE=byDeadline

S3_ORIGINALS_BUCKET=swcc-project-originals<suffix>   # ← actual suffix
S3_RESIZED_BUCKET=swcc-project-resized<suffix>

# Leave SNS_*_TOPIC_ARN empty for now — Member 3 fills these
SNS_ASSIGNMENT_TOPIC_ARN=
SNS_DIGEST_TOPIC_ARN=

CW_NAMESPACE=SWCCProject
```

### 2.4 Install + run

```bash
npm install
npm run dev
```

You should see:

```
swcc-project backend listening on :4000 (development)
AUTH_DEV_BYPASS is enabled — Cognito JWT verification is OFF.
```

If you get errors, see [Appendix C](#appendix-c--troubleshooting).

### 2.5 Sanity check `/health`

In another terminal:

```bash
curl http://localhost:4000/health
# → {"ok":true}
```

### 2.6 Pre-seed the DynamoDB users table

The backend's `assignee` dropdown queries DynamoDB, not Cognito. Until a user signs in once and triggers `/api/users/me`, the table is empty. For the demo to work without anyone signing in twice, pre-seed the three demo users now.

**Pick one path — don't do both.**

<details open>
<summary><strong>👉 Console path</strong></summary>

Repeat for each of the three users below:

1. Console → **DynamoDB** → **Tables** → click `swcc-project-users`.
2. **Explore table items** → **Create item** → **JSON view**.
3. Paste the JSON for that user → **Create item**.

```json
{ "userId": "ali",  "email": "ali@example.com",  "name": "Ali (Manager)", "role": "manager",  "teamId": null,      "createdAt": "2026-05-14T00:00:00Z" }
```

```json
{ "userId": "sara", "email": "sara@example.com", "name": "Sara",          "role": "employee", "teamId": "team-fe", "createdAt": "2026-05-14T00:00:00Z" }
```

```json
{ "userId": "omar", "email": "omar@example.com", "name": "Omar",          "role": "employee", "teamId": "team-be", "createdAt": "2026-05-14T00:00:00Z" }
```
</details>

<details>
<summary><strong>⚡ CLI path</strong></summary>

```bash
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

aws dynamodb put-item --table-name swcc-project-users --item \
  '{"userId":{"S":"ali"},"email":{"S":"ali@example.com"},"name":{"S":"Ali (Manager)"},"role":{"S":"manager"},"teamId":{"NULL":true},"createdAt":{"S":"'"$NOW"'"}}'

aws dynamodb put-item --table-name swcc-project-users --item \
  '{"userId":{"S":"sara"},"email":{"S":"sara@example.com"},"name":{"S":"Sara"},"role":{"S":"employee"},"teamId":{"S":"team-fe"},"createdAt":{"S":"'"$NOW"'"}}'

aws dynamodb put-item --table-name swcc-project-users --item \
  '{"userId":{"S":"omar"},"email":{"S":"omar@example.com"},"name":{"S":"Omar"},"role":{"S":"employee"},"teamId":{"S":"team-be"},"createdAt":{"S":"'"$NOW"'"}}'
```
</details>

> The `userId` values above (`ali`, `sara`, `omar`) are the *friendly* IDs the mock layer uses. **In production these need to match Cognito `sub` (UUID-shaped) values.** Member 5 re-runs this step using real Cognito subs as the last step before the demo.

### 2.7 Smoke tests against real AWS

The dev-bypass auth requires an `X-Dev-User` header with a JSON-encoded claim object. Use Ali (manager):

```bash
DEV_USER='{"sub":"ali","email":"ali@example.com","name":"Ali","role":"manager","teamId":null}'

# List teams (should return the 3 Member 1 seeded)
curl -H "X-Dev-User: $DEV_USER" http://localhost:4000/api/teams

# List users
curl -H "X-Dev-User: $DEV_USER" http://localhost:4000/api/users

# Create a project
curl -X POST -H "X-Dev-User: $DEV_USER" -H "Content-Type: application/json" \
  -d '{"name":"SWCC-Project MVP","description":"Demo project"}' \
  http://localhost:4000/api/projects

# Note the projectId from the response, then create a task
PROJECT_ID=...  # ← paste from above response

curl -X POST -H "X-Dev-User: $DEV_USER" -H "Content-Type: application/json" \
  -d '{
    "projectId":"'$PROJECT_ID'",
    "teamId":"team-fe",
    "assigneeId":"sara",
    "title":"Build Kanban board",
    "description":"Drag and drop, 4 columns",
    "priority":"high",
    "deadline":"2026-05-20"
  }' \
  http://localhost:4000/api/tasks
```

**Expected:** the task POST will write to DynamoDB successfully but may log a warning about SNS publish failing (because Member 3 hasn't created the SNS topic yet). That's expected — note it for them.

### 2.8 Populate SSM Parameter Store

The EC2 user-data script reads every env var from SSM under `/swcc-project/<KEY>`. Push everything now so Member 4 doesn't have to.

> **Honest note**: writing 15 parameters one-by-one in the console is genuinely tedious (~15 min of clicking) and easy to mistype. The CLI script does it in 5 seconds. The console path is still listed for completeness, but for this step the CLI is strongly recommended even if you've used the console for everything else.

**Pick one path — don't do both.**

<details>
<summary><strong>👉 Console path (15 clicks per parameter × 15 parameters)</strong></summary>

Repeat for each of the 13 parameters in the table:

1. Console → **Systems Manager** → **Parameter Store** → **Create parameter**.
2. **Name**: `/swcc-project/<KEY>` — e.g. `/swcc-project/COGNITO_USER_POOL_ID`.
3. **Tier**: Standard.
4. **Type**: String.
5. **Value**: paste from the table.
6. **Create parameter**.

Skip the two SNS topic ARNs (Member 3 will create those parameters).

| Name | Value |
|---|---|
| `/swcc-project/COGNITO_USER_POOL_ID` | your User Pool ID (e.g. `eu-central-1_XXX`) |
| `/swcc-project/COGNITO_CLIENT_ID` | your App Client ID |
| `/swcc-project/DDB_USERS_TABLE` | `swcc-project-users` |
| `/swcc-project/DDB_TEAMS_TABLE` | `swcc-project-teams` |
| `/swcc-project/DDB_PROJECTS_TABLE` | `swcc-project-projects` |
| `/swcc-project/DDB_TASKS_TABLE` | `swcc-project-tasks` |
| `/swcc-project/DDB_COMMENTS_TABLE` | `swcc-project-comments` |
| `/swcc-project/DDB_AUDIT_TABLE` | `swcc-project-audit` |
| `/swcc-project/DDB_TASKS_GSI_TEAM` | `byTeam` |
| `/swcc-project/DDB_TASKS_GSI_ASSIGNEE` | `byAssignee` |
| `/swcc-project/DDB_TASKS_GSI_DEADLINE` | `byDeadline` |
| `/swcc-project/S3_ORIGINALS_BUCKET` | `swcc-project-originals-<suffix>` |
| `/swcc-project/S3_RESIZED_BUCKET` | `swcc-project-resized-<suffix>` |
| `/swcc-project/CW_NAMESPACE` | `SWCCProject` |
</details>

<details open>
<summary><strong>⚡ CLI path (recommended — 5 seconds)</strong></summary>

Save the script below as `scripts/seed-ssm.sh` in the repo, edit the values, then run it:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Edit the values below, then run: bash scripts/seed-ssm.sh
declare -A PARAMS=(
  [COGNITO_USER_POOL_ID]="eu-central-1_XXX"
  [COGNITO_CLIENT_ID]="XXXXXXXXXXXXXXXX"
  [DDB_USERS_TABLE]="swcc-project-users"
  [DDB_TEAMS_TABLE]="swcc-project-teams"
  [DDB_PROJECTS_TABLE]="swcc-project-projects"
  [DDB_TASKS_TABLE]="swcc-project-tasks"
  [DDB_COMMENTS_TABLE]="swcc-project-comments"
  [DDB_AUDIT_TABLE]="swcc-project-audit"
  [DDB_TASKS_GSI_TEAM]="byTeam"
  [DDB_TASKS_GSI_ASSIGNEE]="byAssignee"
  [DDB_TASKS_GSI_DEADLINE]="byDeadline"
  [S3_ORIGINALS_BUCKET]="swcc-project-originals-SUFFIX"
  [S3_RESIZED_BUCKET]="swcc-project-resized-SUFFIX"
  [SNS_ASSIGNMENT_TOPIC_ARN]=""  # Member 3 will update this
  [SNS_DIGEST_TOPIC_ARN]=""      # Member 3 will update this
  [CW_NAMESPACE]="SWCCProject"
)

for KEY in "${!PARAMS[@]}"; do
  VALUE="${PARAMS[$KEY]}"
  if [ -z "$VALUE" ]; then
    echo "Skipping empty $KEY (Member 3 will set it)"
    continue
  fi
  aws ssm put-parameter \
    --name "/swcc-project/$KEY" \
    --value "$VALUE" \
    --type String \
    --overwrite \
    --region eu-central-1
  echo "Set /swcc-project/$KEY"
done
```

Then:

```bash
chmod +x scripts/seed-ssm.sh
bash scripts/seed-ssm.sh
```
</details>

### 2.9 Optional: open a backend fix PR

If your smoke tests surfaced any bugs (cold start latency, missing permissions, broken status flow, etc.), open a branch `fix(backend): …` with the fix. Don't block on this — minor issues can be patched after Member 3 starts.

### 2.10 Handoff to Member 3

Post in chat:

> Backend is live locally against real AWS. SSM is populated except for the two SNS topic ARNs (Member 3 fills those). `aws-config.json` updated. Ready for Member 3.

### 2.11 Verification

```bash
# All env keys are in SSM
aws ssm get-parameters-by-path --path /swcc-project/ --region eu-central-1 \
  --query "Parameters[].Name" --output text

# Should print 15+ paths starting /swcc-project/

# A task created in step 2.7 exists in DynamoDB
aws dynamodb scan --table-name swcc-project-tasks --select COUNT
# → "Count": >= 1

# Audit entries written
aws dynamodb scan --table-name swcc-project-audit --select COUNT
# → "Count": >= 2 (created + assigned)
```

You are done. **Hand off to Member 3.**

---

## Section 3 — Member 3: Events & Lambdas

**Prerequisites:** Member 2 done. Backend works locally; SSM is populated; one task exists in DynamoDB.
**Estimated time:** 4–6 hours.

> **PDF ambiguity note:** Page 3 of the project PDF says the image-resize Lambda is "triggered upon creation of newly added tasks", but page 4's architecture table says "Triggered by S3 PUT events on the originals bucket." We follow the **table** (S3 PUT) — it matches `lambdas/image-resize/index.js` and is the standard pattern. If asked at the demo, justify with: *"S3 PUT trigger fires every time an image lands in the originals bucket, which only happens after a manager attaches an image during task creation, so functionally it triggers on task image upload."*

### 3.1 SNS assignment topic

Console → **SNS** → **Topics** → **Create topic**.

- Type: **Standard**.
- Name: `swcc-project-assignment`.
- Leave the rest at defaults.
- **Create topic**.

Capture the ARN (e.g. `arn:aws:sns:eu-central-1:<acct>:swcc-project-assignment`) → save as `SNS_ASSIGNMENT_TOPIC_ARN`.

### 3.2 SQS queue

Console → **SQS** → **Create queue**.

- Type: **Standard**.
- Name: `swcc-project-assignments`.
- Defaults for the rest.
- Create.

Capture the queue **ARN** and **URL**.

### 3.3 Subscribe SQS to the SNS topic

Back to SNS → `swcc-project-assignment` → **Create subscription**.

- Protocol: **Amazon SQS**.
- Endpoint: paste the SQS ARN.
- **Untick "Enable raw message delivery"** — the assignment-worker Lambda expects the SNS envelope.
- **Create**.

Then attach an SQS access policy that allows the topic to publish. SQS console → `swcc-project-assignments` → **Access policy** tab → **Edit** → paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "sns.amazonaws.com"},
    "Action": "sqs:SendMessage",
    "Resource": "<SQS_ARN>",
    "Condition": {"ArnEquals": {"aws:SourceArn": "<SNS_TOPIC_ARN>"}}
  }]
}
```

Replace `<SQS_ARN>` and `<SNS_TOPIC_ARN>` with the real ARNs.

### 3.4 Email subscriptions on the assignment topic

For each demo user (Ali, Sara, Omar), SNS → the topic → **Create subscription** → Protocol **Email** → Endpoint their email → Create.

**Each subscriber must click the confirmation link** in the email AWS sends them. Until confirmed, they won't receive notifications. Check spam folders.

> Tip for grading: use *one* inbox with Gmail's `+` aliasing — `you+ali@gmail.com`, `you+sara@gmail.com`, `you+omar@gmail.com`. All three land in your inbox, all three are independently subscribed.

### 3.5 Update SSM and backend env with the SNS topic ARN

```bash
SNS_ARN="arn:aws:sns:eu-central-1:<acct>:swcc-project-assignment"
aws ssm put-parameter --name /swcc-project/SNS_ASSIGNMENT_TOPIC_ARN --value "$SNS_ARN" --type String --overwrite --region eu-central-1
```

Ping Member 2 to update their local `.env` to match (just so future smoke tests succeed).

### 3.6 Build the sharp Lambda layer (in CloudShell — easiest)

Sharp is a native module that must be compiled for Linux x64 (matches Lambda runtime). Don't try to do this on your Mac — it won't work.

**Use AWS CloudShell**, a browser-based Linux terminal that's free and pre-authenticated:

1. Console → top bar → CloudShell icon (terminal icon).
2. In CloudShell:

```bash
mkdir -p sharp-layer/nodejs
cd sharp-layer/nodejs
npm init -y
npm install --arch=x64 --platform=linux --libc=glibc sharp
cd ..
zip -qr sharp-layer.zip nodejs

# Upload as a Lambda layer
aws lambda publish-layer-version \
  --layer-name swcc-project-sharp \
  --description "sharp for image-resize Lambda" \
  --zip-file fileb://sharp-layer.zip \
  --compatible-runtimes nodejs20.x \
  --compatible-architectures x86_64 \
  --region eu-central-1
```

Capture the **LayerVersionArn** from the output — looks like `arn:aws:lambda:eu-central-1:<acct>:layer:swcc-project-sharp:1`.

### 3.7 Image-resize Lambda

In CloudShell or your laptop with the repo cloned:

```bash
cd lambdas/image-resize
npm install --omit=dev
zip -qr image-resize.zip .
```

Console → **Lambda** → **Create function** → **Author from scratch**:

- Function name: `swcc-project-image-resize`
- Runtime: **Node.js 20.x**
- Architecture: **x86_64**
- Execution role: **Use an existing role** → `swcc-project-lambda-image-resize`
- Create.

In the function page:

- **Code** tab → **Upload from** → **.zip file** → upload `image-resize.zip`.
- **Configuration** → **Environment variables** → add:
  - `RESIZED_BUCKET` = `swcc-project-resized<suffix>`
  - `MAX_WIDTH` = `800`
- **Configuration** → **Layers** → **Add a layer** → **Custom layers** → `swcc-project-sharp` → version 1.
- **Configuration** → **General configuration** → **Edit** → Memory **512 MB**, Timeout **30 sec**.

**Trigger** tab → **Add trigger**:

- Source: **S3**
- Bucket: `swcc-project-originals<suffix>`
- Event types: **All object create events**
- Tick the recursive-invocation acknowledgment.
- Add.

**Test it.** Upload any JPEG/PNG manually to the originals bucket via S3 console → check the resized bucket → resized version appears within ~10 seconds.

### 3.8 Assignment-worker Lambda

Package and upload:

```bash
cd lambdas/assignment-worker
npm install --omit=dev
zip -qr assignment-worker.zip .
```

Console → **Lambda** → **Create function**:

- Name: `swcc-project-assignment-worker`
- Runtime: **Node.js 20.x**
- Role: `swcc-project-lambda-assignment-worker`
- Upload the zip.

Environment variables:
- `CW_NAMESPACE` = `SWCCProject`
- `DDB_AUDIT_TABLE` = `swcc-project-audit`

Trigger:
- Source: **SQS**
- Queue: `swcc-project-assignments`
- Batch size: **10**.
- Add.

**Test it.** Run a curl from your backend (Member 2's smoke test) to create a task. Within ~30 seconds:
- SNS publishes to the topic.
- SQS receives the message.
- Lambda fires, writes an audit row, emits a CloudWatch metric.

Verify:
```bash
aws dynamodb scan --table-name swcc-project-audit --select COUNT
# Count went up by 1 (a "source: assignment-worker" entry)

aws cloudwatch list-metrics --namespace SWCCProject
# Should show TasksAssignedPerTeam
```

### 3.9 SNS digest topic

Console → SNS → **Create topic**.
- Name: `swcc-project-digest`.
- Capture ARN → save as `SNS_DIGEST_TOPIC_ARN`.

Email subscriptions on this one too (same emails as 3.4 work — they get both assignment notifications and daily digests).

Update SSM:
```bash
DIGEST_ARN="arn:aws:sns:eu-central-1:<acct>:swcc-project-digest"
aws ssm put-parameter --name /swcc-project/SNS_DIGEST_TOPIC_ARN --value "$DIGEST_ARN" --type String --overwrite --region eu-central-1
```

### 3.10 Daily-digest Lambda

```bash
cd lambdas/daily-digest
npm install --omit=dev
zip -qr daily-digest.zip .
```

Console → Lambda → Create function:
- Name: `swcc-project-daily-digest`
- Runtime: Node.js 20.x
- Role: `swcc-project-lambda-daily-digest`
- Upload zip.

Env vars:
- `DDB_TASKS_TABLE` = `swcc-project-tasks`
- `DDB_USERS_TABLE` = `swcc-project-users`
- `SNS_DIGEST_TOPIC_ARN` = (the digest ARN from 3.9)

Memory 256 MB, Timeout 60 sec.

### 3.11 EventBridge schedule

Console → **EventBridge** → **Scheduler** → **Create schedule** (use the Scheduler service, not "Rules" which is older).

- Name: `swcc-project-daily-digest-9am`
- Schedule pattern: **Recurring** → **Cron-based** → `cron(0 9 * * ? *)` (9 AM UTC daily)
- Timezone: UTC
- Flexible time window: **Off**
- Target: **AWS Lambda** → `swcc-project-daily-digest`
- Action: `Invoke`
- Permissions: Create new role for this schedule.
- Create.

**Test it.** Don't wait until tomorrow 9 AM — manually invoke:

```bash
aws lambda invoke --function-name swcc-project-daily-digest --region eu-central-1 /tmp/out.json
cat /tmp/out.json
```

You should see `{"ok":true,"scanned":N,"digestsSent":M}` and emails to assignees with tasks due today.

> The daily-digest only fires for tasks where `deadline === today (UTC)` and `status !== "done"`. To test, create a task in Member 2's smoke test with `"deadline":"<today's date>"`.

### 3.12 CloudWatch dashboard

Console → **CloudWatch** → **Dashboards** → **Create dashboard** → name `SWCCProjectOps`.

Add four widgets:

**Widget 1 — Tasks created per day**
- Add widget → **Line** chart.
- Metrics → **All metrics** → **SWCCProject** → search `TasksCreated`.
- Statistic: **Sum**.
- Period: **1 day**.
- Title: "Tasks created per day".

**Widget 2 — Tasks closed per day, per team**
- Add widget → **Line**.
- Metrics → **SWCCProject** → `TasksClosed` with `TeamId` dimension. Select each team's series.
- Statistic: Sum. Period: 1 day.
- Title: "Tasks closed per day per team".

**Widget 3 — Average time-to-close**
- Metrics → **SWCCProject** → `TimeToCloseMs`.
- Statistic: **Average**.
- Period: 1 day.
- Title: "Avg time to close (ms)".

**Widget 4 — EC2 CPU utilization**
- Metrics → **EC2** → **By Auto Scaling Group** → search for your ASG (Member 4 will create it later — leave widget empty for now or hook it up after M4 is done).
- Statistic: Average.
- Period: 5 minutes.
- Title: "EC2 CPU %".

Save dashboard.

### 3.13 CloudWatch alarm

Console → CloudWatch → **Alarms** → **Create alarm** → **Select metric** → **SWCCProject** → `TasksCreated`.

For demo purposes (since "overdue tasks" requires a custom metric you don't emit yet), set a simple alarm:

- Metric: `TasksCreated`, Statistic Sum, Period 1 minute.
- Threshold: **Greater than 10** (or whatever feels like a spike).
- Notification: create new SNS topic `swcc-project-alerts`, subscribe your email.
- Name: `swcc-project-task-spike`.

This satisfies the PDF requirement: "at least one CloudWatch alarm that publishes to an SNS topic."

### 3.14 Handoff to Member 4

Post in chat:

> All events plumbing live. Three Lambdas deployed, dashboard at `SWCCProjectOps`, alarm at `swcc-project-task-spike`. Backend smoke tests now produce real email notifications and CloudWatch metrics. Ready for Member 4.

Include the CloudWatch dashboard URL: `https://eu-central-1.console.aws.amazon.com/cloudwatch/home?region=eu-central-1#dashboards:name=SWCCProjectOps`.

### 3.15 Verification

```bash
# All 3 Lambdas exist
aws lambda list-functions --region eu-central-1 | grep swcc-project

# SNS topics exist
aws sns list-topics --region eu-central-1 | grep swcc-project

# SQS queue exists
aws sqs list-queues --region eu-central-1 | grep swcc-project

# EventBridge schedule exists
aws scheduler list-schedules --region eu-central-1 | grep swcc-project

# Dashboard exists
aws cloudwatch list-dashboards --region eu-central-1 | grep SWCCProjectOps

# End-to-end: create a task, wait 30s, audit row appears
curl -X POST -H "X-Dev-User: $DEV_USER" -H "Content-Type: application/json" \
  -d '{...task body...}' http://localhost:4000/api/tasks
sleep 30
aws dynamodb scan --table-name swcc-project-audit --filter-expression "#s = :s" \
  --expression-attribute-names '{"#s":"source"}' \
  --expression-attribute-values '{":s":{"S":"assignment-worker"}}' --select COUNT
# Count >= 1
```

You are done. **Hand off to Member 4.**

---

## Section 4 — Member 4: Hosting infrastructure

**Prerequisites:** Member 3 done. SSM has SNS topic ARNs. Lambdas + dashboard live.
**Estimated time:** 3–5 hours.

### 4.1 VPC

Console → **VPC** → **Create VPC** → choose **"VPC and more"** (the wizard that creates everything in one shot).

- **Name tag auto-generation**: `swcc-project`
- **IPv4 CIDR block**: `10.0.0.0/16`
- **Number of Availability Zones**: **2** → `eu-central-1a` and `eu-central-1b`
- **Number of public subnets**: **2**
- **Number of private subnets**: **2**
- **NAT gateways**: **In 1 AZ** (saves cost, still HA enough — one NAT is fine for a student project)
- **VPC endpoints**: **None** (or add S3 + DynamoDB Gateway endpoints if you want — they're free and improve perf)
- **DNS options**: leave defaults (DNS hostnames + resolution both enabled).

Click **Create VPC**. Wait ~2 minutes for the wizard to provision everything.

Capture from the resulting VPC:
- **VPC ID** (vpc-XXXX)
- 2 **public subnet IDs**
- 2 **private subnet IDs**

### 4.2 Security groups

Console → **VPC** → **Security groups** → **Create security group**, twice.

**SG 1 — `swcc-project-alb-sg`**

- Name: `swcc-project-alb-sg`
- Description: `Allow HTTP from world for the ALB`
- VPC: `swcc-project-vpc`
- Inbound rules:
  - Type **HTTP**, Source **Anywhere-IPv4** (`0.0.0.0/0`)
  - (Optional) Type **HTTPS**, Source **Anywhere-IPv4**
- Create.

**SG 2 — `swcc-project-ec2-sg`**

- Name: `swcc-project-ec2-sg`
- Description: `Allow port 4000 only from the ALB SG`
- VPC: same.
- Inbound rules:
  - Type **Custom TCP**, Port **4000**, Source: **Custom** → select `swcc-project-alb-sg` (the security group ID, not an IP)
- Create.

This SG-to-SG reference is what locks the backend behind the ALB even though it's reachable on the public internet by IP.

### 4.3 Update the EC2 user-data script's repo URL

On your laptop, open `scripts/ec2-userdata.sh` and edit line:

```bash
REPO_URL="https://github.com/REPLACE_ME/SWCC-Project.git"
```

Change to:

```bash
REPO_URL="https://github.com/yraghy/SWCC-Project.git"
```

Commit on a branch:

```bash
git checkout -b fix/ec2-userdata-repo-url
git add scripts/ec2-userdata.sh
git commit -m "fix(infra): set REPO_URL in EC2 user-data to the real repo"
git push -u origin fix/ec2-userdata-repo-url
```

Open a PR and merge to `main` so EC2 will clone from `main`.

### 4.4 EC2 launch template

Console → **EC2** → **Launch templates** → **Create launch template**.

- Name: `swcc-project-backend`
- Application and OS images: **Amazon Linux 2023 AMI** (free-tier eligible)
- Instance type: **t3.micro** (or t2.micro if your account predates t3.micro)
- Key pair: **Proceed without a key pair** (you don't need SSH; debugging via SSM Session Manager if needed)
- Network settings:
  - VPC: `swcc-project-vpc`
  - Subnet: **Don't include in launch template** (the ASG sets this)
  - Security group: select `swcc-project-ec2-sg`
- Storage: 30 GB gp3 (within free tier)
- Advanced details:
  - IAM instance profile: `swcc-project-ec2`
  - User data (paste from `scripts/ec2-userdata.sh`):
    ```bash
    #!/usr/bin/env bash
    # ... paste contents ...
    ```
  - (Or paste a shorter inline script that just `curl`s the version from main:)
    ```bash
    #!/usr/bin/env bash
    set -euxo pipefail
    curl -fsSL https://raw.githubusercontent.com/yraghy/SWCC-Project/main/scripts/ec2-userdata.sh | bash
    ```
- Create launch template.

### 4.5 Target group

Console → **EC2** → **Target groups** → **Create target group**.

- Target type: **Instances**
- Name: `swcc-project-tg`
- Protocol: **HTTP**, Port: **4000**
- VPC: `swcc-project-vpc`
- Health check:
  - Protocol: HTTP
  - Path: `/health`
  - Healthy threshold: 2
  - Unhealthy threshold: 3
  - Timeout: 5s
  - Interval: 30s
- Create. Skip "Register targets" — the ASG does this.

### 4.6 Application Load Balancer

Console → **EC2** → **Load balancers** → **Create load balancer** → **Application Load Balancer**.

- Name: `swcc-project-alb`
- Scheme: **Internet-facing**
- IP address type: **IPv4**
- VPC: `swcc-project-vpc`
- Mappings: tick both AZs (`eu-central-1a`, `eu-central-1b`), select the **public** subnet in each
- Security groups: `swcc-project-alb-sg`
- Listener: HTTP : 80 → forward to `swcc-project-tg`
- Create. Wait ~2 minutes for it to become Active.

Capture the ALB **DNS name** (e.g. `swcc-project-alb-1234567.eu-central-1.elb.amazonaws.com`).

### 4.7 Auto Scaling Group

Console → **EC2** → **Auto Scaling Groups** → **Create Auto Scaling group**.

- Name: `swcc-project-asg`
- Launch template: `swcc-project-backend`
- VPC: `swcc-project-vpc`
- AZs and subnets: select both **private** subnets
- Load balancing:
  - **Attach to an existing load balancer**
  - Choose `swcc-project-tg`
- Health checks: **ELB** (use ALB health checks, not just EC2 status)
- Group size: Desired **2**, Min **2**, Max **4**
- Tags: `Project=swcc-project`
- Create.

Wait 3–5 minutes. The ASG launches 2 instances, they run the user-data script (which takes ~2 min: install Node, clone repo, npm install, build, start with PM2). Watch instance state go Initializing → InService.

### 4.8 Smoke test the ALB

```bash
curl http://<alb-dns>/health
# → {"ok":true}
```

If you get a 502 / connection refused:
- EC2 instances aren't healthy. Check the target group → Targets tab → see why (likely the user-data script failed).
- SSH-less debug: EC2 → Instances → click instance → **Connect** → **Session Manager**. Then:
  ```bash
  sudo journalctl -u cloud-final --no-pager | tail -100
  sudo tail -100 /var/log/cloud-init-output.log
  ```

### 4.9 CloudFront distribution

Console → **CloudFront** → **Create distribution**.

- **Origin domain**: paste the ALB DNS name (it'll appear in the dropdown).
- **Protocol**: HTTP only (the ALB listens on port 80 with no TLS — for a student demo, that's fine).
- **Origin port**: 80
- **Origin path**: leave empty
- **Name**: `swcc-project-origin-alb`
- **Default cache behavior**:
  - Viewer protocol policy: **Redirect HTTP to HTTPS**
  - Allowed HTTP methods: **GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE**
  - Cache policy: **CachingDisabled** (we'll override per-path next)
  - Origin request policy: **AllViewer**
- WAF: **Do not enable** (saves cost).
- Settings:
  - Price class: **Use only North America and Europe**
  - Default root object: leave empty (Next.js handles routing)
- Create distribution. **Takes 5–10 minutes to deploy globally.**

Capture the distribution **Domain name** (e.g. `d1abcdef.cloudfront.net`).

### 4.10 Add a behavior for the frontend (cache aggressively)

Once the distribution is deployed, open it → **Behaviors** tab → **Create behavior**.

- Path pattern: `/_next/static/*` (Next.js static assets)
- Viewer protocol policy: Redirect HTTP to HTTPS
- Allowed methods: GET, HEAD
- Cache policy: **CachingOptimized**
- Save.

Add another behavior:
- Path pattern: `/static/*`
- Same as above.
- Save.

The default behavior (catch-all) stays uncached — this lets API calls (`/api/*`) and HTML pages always hit the origin.

### 4.11 Handoff to Member 5

Post in chat:

> Hosting is live:
> - ALB DNS: `swcc-project-alb-1234567.eu-central-1.elb.amazonaws.com`
> - CloudFront: `https://d1abcdef.cloudfront.net`
> - Both EC2 instances are healthy in `swcc-project-asg`.
> Member 5 — please proceed.

### 4.12 Verification

```bash
# ALB direct
curl http://<alb-dns>/health
# → {"ok":true}

# Through CloudFront
curl https://<cloudfront-domain>/api/health
# → {"ok":true}

# Both EC2 instances InService
aws autoscaling describe-auto-scaling-groups --auto-scaling-group-names swcc-project-asg \
  --query "AutoScalingGroups[0].Instances[*].LifecycleState"
# → ["InService","InService"]
```

You are done. **Hand off to Member 5.**

---

## Section 5 — Member 5: Frontend & demo

**Prerequisites:** Member 4 done. CloudFront URL works.
**Estimated time:** 3–5 hours (most spent on the demo recording).

> **Get started early on the offline parts.** Steps 5.1, 5.2, and 5.3 can be done against the frontend mocks without waiting for Member 4 — you only need the CloudFront URL for steps 5.6 onwards.

### 5.1 Add the image-upload UI

Open `frontend/src/components/tasks/TaskForm.tsx`. The backend already exposes the right endpoints:

- `POST /api/tasks/:id/images/presign` → `{ uploadUrl, key }`
- `POST /api/tasks/:id/images` → attaches the key to the task

The TaskForm currently has no file input. Add one and wire it up.

Inside the form, after the existing inputs and before the submit buttons, add:

```tsx
const [imageFile, setImageFile] = useState<File | null>(null);

// Inside the form JSX:
<label className="block">
  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">
    Image (optional)
  </span>
  <input
    type="file"
    accept="image/png,image/jpeg,image/webp"
    onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
    className="w-full text-sm"
  />
</label>
```

Then change `handleSubmit` to upload after task creation:

```tsx
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  if (!title || !projectId || !teamId || !assigneeId || !deadline) {
    toast.error("Fill in all required fields");
    return;
  }
  setSubmitting(true);
  try {
    const task = await api.createTask({ title, description, priority, deadline, projectId, teamId, assigneeId });
    if (imageFile) {
      const { uploadUrl, key } = await api.presignUpload(task.taskId, imageFile.type);
      await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": imageFile.type },
        body: imageFile,
      });
      await api.attachImage(task.taskId, key);
    }
    toast.success("Task created");
    onCreated();
    onClose();
  } catch (err) {
    toast.error((err as Error).message);
  } finally {
    setSubmitting(false);
  }
}
```

Test it locally with mocks: `cd frontend && npm run dev` → login as Ali → New task → pick a file → submit. The mock layer logs the upload (it doesn't actually store the file in mock mode, but the flow is exercised).

Commit on a branch `feat/image-upload-ui`, push, merge to `main` before final deploy.

### 5.2 Polish pass

Open every page in the browser. For each:

- **Loading states**: present? (the `useTasks`/`useTask` hooks already expose `loading` — confirm spinners show).
- **Empty states**: present? (KanbanColumn has "No tasks", CommentThread has "No comments yet").
- **Error toasts**: present? (sonner toaster mounted in `layout.tsx`; toast.error called on every API catch).

Fix anything obviously broken. Commit fixes on `style/polish` branch.

### 5.3 Configure Next.js static export

Open `frontend/next.config.ts` and add `output: 'export'`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",            // ← add this
  reactStrictMode: true,
  images: {
    unoptimized: true,          // ← required for static export
    remotePatterns: [
      { protocol: "https", hostname: "*.s3.*.amazonaws.com" },
      { protocol: "https", hostname: "*.amazonaws.com" },
      { protocol: "https", hostname: "*.cloudfront.net" },
    ],
  },
  env: { /* ... unchanged ... */ },
};

export default nextConfig;
```

Static export limitations to know about:
- No server-side rendering, no API routes (we don't use them — the backend is separate).
- Dynamic routes like `app/projects/[id]/page.tsx` need either `generateStaticParams` OR client-side handling. Since project IDs aren't known at build time, add an empty `generateStaticParams` so the route exists as a client-rendered shell:

  ```tsx
  // In frontend/src/app/projects/[id]/page.tsx, add at the top:
  export function generateStaticParams() {
    return [];
  }
  export const dynamicParams = true;
  ```

Test the build locally:

```bash
cd frontend
NEXT_PUBLIC_USE_MOCKS=true NEXT_PUBLIC_API_BASE_URL=http://localhost:4000 npm run build
ls out/
# Should show: _next/, index.html, login/, dashboard/, projects/, etc.
```

### 5.4 Make the backend serve the static frontend

The PDF says CloudFront sits in front of the ALB for both "app and static assets" — meaning the EC2-hosted backend serves both the API and the static frontend.

Open `backend/src/app.ts`. Add a static-files middleware:

```ts
import path from "node:path";
// ... existing imports ...

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "2mb" }));
  app.use(morgan("dev"));

  app.get("/health", (_req, res) => res.json({ ok: true }));

  // API routes (must come BEFORE static — Express matches first match)
  app.use("/api", authMiddleware);
  app.use("/api/tasks", tasksRouter);
  app.use("/api/projects", projectsRouter);
  app.use("/api/comments", commentsRouter);
  app.use("/api/teams", teamsRouter);
  app.use("/api/users", usersRouter);

  // Serve static frontend
  const STATIC_DIR = path.join(__dirname, "..", "..", "frontend", "out");
  app.use(express.static(STATIC_DIR));

  // SPA fallback — any non-/api/* path returns index.html
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(STATIC_DIR, "index.html"));
  });

  // ... error handler unchanged ...
  return app;
}
```

Also update `scripts/ec2-userdata.sh` to build the frontend after cloning. Add after the backend build:

```bash
# Build frontend (after backend setup, before pm2 start)
cd "$APP_DIR/frontend"
npm ci
NEXT_PUBLIC_USE_MOCKS=false \
NEXT_PUBLIC_API_BASE_URL="$(aws ssm get-parameter --name /swcc-project/CLOUDFRONT_URL --query Parameter.Value --output text)" \
NEXT_PUBLIC_COGNITO_USER_POOL_ID="$(aws ssm get-parameter --name /swcc-project/COGNITO_USER_POOL_ID --query Parameter.Value --output text)" \
NEXT_PUBLIC_COGNITO_CLIENT_ID="$(aws ssm get-parameter --name /swcc-project/COGNITO_CLIENT_ID --query Parameter.Value --output text)" \
npm run build

cd "$APP_DIR/backend"
```

Put the CloudFront URL in SSM:

```bash
aws ssm put-parameter \
  --name /swcc-project/CLOUDFRONT_URL \
  --value "https://d1abcdef.cloudfront.net" \
  --type String \
  --overwrite \
  --region eu-central-1
```

Commit both changes (`backend/src/app.ts` + `scripts/ec2-userdata.sh`) on `feat/serve-frontend-from-backend`. Merge to `main`.

### 5.5 Refresh the ASG to pick up the new code

Console → EC2 → Auto Scaling Groups → `swcc-project-asg` → **Instance refresh** → **Start instance refresh** with defaults.

This terminates and re-launches both instances one at a time, each picking up the latest `main` (which now includes the frontend build step). Takes ~5 minutes.

Watch the target group's "Healthy hosts" graph stay at 1 or 2 throughout.

### 5.6 Final wiring sanity check

Once both instances are InService and healthy:

```bash
# API still works
curl https://<cloudfront-domain>/api/health
# → {"ok":true}

# Frontend HTML serves
curl https://<cloudfront-domain>/
# → HTML containing "<title>SWCC-Project</title>"

# Login page
curl https://<cloudfront-domain>/login/
# → HTML
```

Open `https://<cloudfront-domain>/` in a real browser. You should land on the dashboard (which redirects to login since you're not authenticated). The login form should render.

### 5.7 Update demo user IDs to match Cognito subs

Cognito assigns each user a UUID `sub` on creation. The pre-seeded DDB users have friendly IDs (`ali`, `sara`, `omar`) — those won't match the JWT `sub` after real sign-in, so the `/api/users/me` upsert creates *new* user records with UUID IDs, leaving the manager's assignee dropdown showing fresh employees without history.

Two fixes — **pick one**:

**Option A (quickest, what I'd do)**: have each user sign in once to populate. Then re-create demo tasks owned by those new user IDs. Lose the pre-seeded data but everything just works.

**Option B (cleaner)**: rewrite the seeded users with the actual Cognito subs.

First, get each user's `sub` — **pick one path**:

<details open>
<summary><strong>👉 Console path</strong></summary>

For each user (Ali, Sara, Omar):

1. Console → **Cognito** → **User pools** → click `swcc-project-users`.
2. **Users** tab → click the user's row.
3. On the user details page, look for the **`sub`** attribute under "User attributes" — it's a UUID like `e4567f89-1234-5678-9abc-def012345678`.
4. Copy it.

Record all three subs in a notes file:

```
ali  → e4567f89-1234-5678-9abc-def012345678
sara → f1234567-89ab-cdef-0123-456789abcdef
omar → 12345678-9abc-def0-1234-56789abcdef0
```
</details>

<details>
<summary><strong>⚡ CLI path</strong></summary>

```bash
POOL_ID=eu-central-1_XXX
for EMAIL in ali@example.com sara@example.com omar@example.com; do
  SUB=$(aws cognito-idp admin-get-user --user-pool-id $POOL_ID --username $EMAIL \
    --query "UserAttributes[?Name=='sub'].Value | [0]" --output text)
  echo "$EMAIL → $SUB"
done
```
</details>

Then re-run the user-seeding step from Member 2 step 2.6 (either console or CLI path) using these UUIDs as the `userId` field instead of the friendly `ali` / `sara` / `omar` strings.

### 5.8 Update README with the live URL

Open `README.md` and add (or update):

```markdown
**Live URL:** https://d1abcdef.cloudfront.net
```

Commit on a branch `docs/live-url`, merge to main.

### 5.9 Demo dry-run (PDF scenario)

In an incognito browser window, walk through:

1. Go to `https://<cloudfront-domain>/login`.
2. Sign in as `ali@example.com / DemoPass123!` → land on dashboard.
3. Click **+ New task**:
   - Title: "Build login page"
   - Project: pick the one Member 2 created
   - Team: **Frontend**
   - Assignee: Sara
   - Priority: High
   - Deadline: any future date
   - Attach an image (proves the S3 + Lambda pipeline)
   - Create.
4. Click **+ New task** again:
   - Title: "Wire DynamoDB GSI"
   - Team: **Backend**
   - Assignee: Omar
   - Priority: High
   - Deadline: today (will trigger daily-digest email if you invoke the Lambda manually).
   - Create.
5. Both tasks visible on Ali's board. Switch team filter to "Frontend" → only Sara's task; switch to "Backend" → only Omar's.
6. Sign out → sign in as `sara@example.com / DemoPass123!`. **Only see Sara's task**. Drag it from "To Do" → "In Progress" → "In Review" → "Done".
7. Sign out → sign in as `omar@example.com / DemoPass123!`. **Only see Omar's task**. Move it to "Done".
8. Sign out → sign in as Ali again. See both tasks, both in "Done", filter by team works.

If any step fails, find which member's verification was skipped and re-run it.

### 5.10 Record the demo video

Use QuickTime / OBS / Loom / Screen Studio. Cover:

1. **30s intro**: project name, your team, what the app is.
2. **2 min demo**: the dry-run above, talking through what you click.
3. **2 min architecture walk-through**: open the CloudWatch dashboard, the SNS topic, the SQS queue (showing recent messages from your demo task creates), the EventBridge schedule, one Lambda's CloudWatch logs showing it fired. Open the EC2 ASG showing 2 instances across AZs. Open CloudFront showing the distribution config. Open the architecture diagram PNG.
4. **30s wrap**: PDF requirements ticked off, GitHub repo URL.

Total ~5 minutes. Upload to YouTube (unlisted) or Google Drive. Put the link in the README and the submission form.

### 5.11 Architecture diagram

This is a deliverable you must produce manually — there's no script for it. Use [Lucidchart](https://www.lucidchart.com/) or PowerPoint with the [AWS standard icons set](https://aws.amazon.com/architecture/icons/) (the PDF explicitly links to this).

Diagram must show:
- 2 AZs in eu-central-1
- VPC with public + private subnets
- ALB in public subnets routing to EC2 in private subnets
- ASG group containing the EC2 instances
- NAT Gateway
- CloudFront in front of ALB
- Internet Gateway
- Cognito (off to the side, no AZ pinning)
- DynamoDB (regional)
- S3 originals + S3 resized
- Lambda image-resize (S3 → Lambda → S3)
- Lambda assignment-worker (SQS → Lambda → DynamoDB + CloudWatch)
- Lambda daily-digest (EventBridge → Lambda → DynamoDB + SNS)
- SNS topics (assignment, digest, alerts)
- SQS queue
- CloudWatch dashboard + alarm
- Lines showing data flow

Export as PNG, save as `docs/architecture-diagram.png` in the repo (the README already references this path).

### 5.12 Submit the Google Form

The PDF links to the [submission form](https://docs.google.com/forms/d/e/1FAIpQLSdOo4eouZwbf-dNVfwFvraYxGZx6TTdsflE-DISRQX3jWTPkg/viewform). Fill it in with:

- GitHub repo: `https://github.com/yraghy/SWCC-Project`
- CloudFront URL: `https://d1abcdef.cloudfront.net`
- Demo video URL
- Team member names

Submit **before 22 May 2026 23:59**.

### 5.13 Don't terminate

After submission, do not click Terminate on anything. Stop EC2 instances if you want (ASG → set desired = 0), but leave ALB, NAT Gateway, CloudFront, DynamoDB tables, S3 buckets, Lambdas, etc. in place. Per the PDF, terminated resources = zero.

### 5.14 Verification

The PDF demo scenario passes in a fresh incognito window at the CloudFront URL — that *is* the verification. If it passes, you're done.

---

## Appendix A — Glossary

| Term | What it is |
|---|---|
| **AZ (Availability Zone)** | A physically separate datacenter within an AWS region. We use two (`eu-central-1a` + `eu-central-1b`) for high availability. |
| **ALB (Application Load Balancer)** | HTTP/HTTPS load balancer. Receives requests on port 80/443 and forwards to EC2 instances. Runs health checks. |
| **ASG (Auto Scaling Group)** | A managed cluster of EC2 instances. Automatically replaces unhealthy instances. We set desired = 2. |
| **CloudFront** | AWS's CDN. Caches content at edge locations worldwide. Sits in front of the ALB. |
| **Cognito** | AWS's managed user identity service. Issues JWT tokens after login. |
| **DynamoDB** | NoSQL database. We use on-demand pricing (pay per request, no capacity planning). |
| **GSI (Global Secondary Index)** | A DynamoDB index that lets you query a table by a non-primary-key attribute. We have 3 on the tasks table. |
| **IAM (Identity and Access Management)** | AWS's permission system. Users have policies; resources have roles. |
| **Lambda** | AWS's serverless function service. We use 3 of them. |
| **NAT Gateway** | Network Address Translation. Lets resources in private subnets reach the internet outbound (but not inbound). |
| **SG (Security Group)** | A virtual firewall on a resource. We use 2 (one for ALB, one for EC2). |
| **SNS (Simple Notification Service)** | Publish/subscribe messaging. Fans out events to multiple subscribers (email, SQS, Lambda). |
| **SQS (Simple Queue Service)** | Message queue. Buffers messages for a worker to process at its own pace. |
| **SSM Parameter Store** | A managed key-value store for config. We use it to share env vars between members + EC2. |
| **VPC (Virtual Private Cloud)** | An isolated network you create inside AWS. Contains subnets, route tables, gateways. |

---

## Appendix B — `aws-config.json` final shape

After all 5 members are done, the file should look exactly like this (with real values):

```jsonc
{
  "region": "eu-central-1",

  "cognito": {
    "userPoolId": "eu-central-1_XXXXXXXXX",
    "clientId":   "XXXXXXXXXXXXXXXXXXXXXXX"
  },

  "dynamodb": {
    "users":    "swcc-project-users",
    "teams":    "swcc-project-teams",
    "projects": "swcc-project-projects",
    "tasks":    "swcc-project-tasks",
    "comments": "swcc-project-comments",
    "audit":    "swcc-project-audit",
    "gsi": {
      "tasksByTeam":     "byTeam",
      "tasksByAssignee": "byAssignee",
      "tasksByDeadline": "byDeadline"
    }
  },

  "s3": {
    "originals": "swcc-project-originals-<suffix>",
    "resized":   "swcc-project-resized-<suffix>"
  },

  "sns": {
    "assignmentTopicArn": "arn:aws:sns:eu-central-1:<acct>:swcc-project-assignment",
    "digestTopicArn":     "arn:aws:sns:eu-central-1:<acct>:swcc-project-digest",
    "alertsTopicArn":     "arn:aws:sns:eu-central-1:<acct>:swcc-project-alerts"
  },

  "sqs": {
    "assignmentQueueUrl": "https://sqs.eu-central-1.amazonaws.com/<acct>/swcc-project-assignments"
  },

  "iam": {
    "ec2Role":                "arn:aws:iam::<acct>:role/swcc-project-ec2",
    "lambdaImageResize":      "arn:aws:iam::<acct>:role/swcc-project-lambda-image-resize",
    "lambdaAssignmentWorker": "arn:aws:iam::<acct>:role/swcc-project-lambda-assignment-worker",
    "lambdaDailyDigest":      "arn:aws:iam::<acct>:role/swcc-project-lambda-daily-digest"
  },

  "lambda": {
    "imageResize":      "swcc-project-image-resize",
    "assignmentWorker": "swcc-project-assignment-worker",
    "dailyDigest":      "swcc-project-daily-digest",
    "sharpLayerArn":    "arn:aws:lambda:eu-central-1:<acct>:layer:swcc-project-sharp:1"
  },

  "cloudwatch": {
    "namespace":     "SWCCProject",
    "dashboardName": "SWCCProjectOps"
  },

  "hosting": {
    "vpcId":           "vpc-XXXXXXXX",
    "albDns":          "swcc-project-alb-XXX.eu-central-1.elb.amazonaws.com",
    "cloudfrontUrl":   "https://dXXXXXXXX.cloudfront.net",
    "asgName":         "swcc-project-asg",
    "launchTemplateId":"lt-XXXXXXXX"
  }
}
```

> This file is gitignored. Always share via the team chat, never commit it.

---

## Appendix C — Troubleshooting

Common errors and one-line fixes, organized by member.

### Member 1

| Error | Likely cause | Fix |
|---|---|---|
| `AccessDenied` creating Cognito custom attributes | Console session expired | Sign out, sign back in. |
| Cognito won't let you add `custom:teamId` with min length 0 | Cognito quirk on some console versions | Set min length 1 and use a sentinel like `none` for the manager. Update `auth.middleware.ts` to treat that as null if your team wants. |
| `aws sts get-caller-identity` returns wrong account | You configured with someone else's key | `aws configure` again, verify the access key ID matches what's in your IAM user's Security credentials tab. |

### Member 2

| Error | Likely cause | Fix |
|---|---|---|
| `npm install` fails with "EACCES" | Permissions on `~/.npm` | `sudo chown -R $(whoami) ~/.npm` |
| Backend starts but `/api/teams` returns empty array | Teams table not seeded | Re-run Member 1 step 1.8 team-seeding commands. |
| `ResourceNotFoundException` from DynamoDB | Table doesn't exist or wrong region | `aws dynamodb list-tables --region eu-central-1` — confirm table is there. |
| `CredentialsProviderError` | `aws configure` not run, or wrong profile | Re-run `aws configure`. Confirm with `aws sts get-caller-identity`. |
| `ssm put-parameter` returns ParameterAlreadyExists | Re-running the script | Add `--overwrite` (the script already has it). |

### Member 3

| Error | Likely cause | Fix |
|---|---|---|
| Lambda fails with "Cannot find module 'sharp'" | Layer not attached, or wrong architecture | Confirm sharp layer is added in Configuration → Layers. Confirm architecture is `x86_64` on both layer and function. |
| Image uploaded but no resized version appears | S3 trigger not set, or Lambda errors | Check Lambda → Monitor tab → CloudWatch logs. Common: wrong role permissions on resized bucket. |
| Assignment-worker fires but no audit row | DynamoDB write failed | Check Lambda CloudWatch logs for the actual error. Usually role missing DDB write permission. |
| EventBridge schedule doesn't fire daily-digest | Wrong cron syntax (AWS uses 6-field cron) | Use `cron(0 9 * * ? *)` — note the `?` for day-of-week. Test by manually invoking. |
| Subscribers not receiving emails | Email subscription unconfirmed | Open the SNS topic → Subscriptions tab → status must be "Confirmed" for each email. |

### Member 4

| Error | Likely cause | Fix |
|---|---|---|
| EC2 instances stuck in "Initializing" forever | User-data script failed | Connect via Session Manager: `sudo tail /var/log/cloud-init-output.log` |
| ALB targets all "unhealthy" | Backend not listening on 4000, or `/health` not responding | SSM into the instance: `curl localhost:4000/health`. If that works, check SG; if not, check `pm2 list` and `pm2 logs`. |
| 502 from ALB | EC2 returned an error or refused connection | Same debug path as above. |
| CloudFront returns 504 / Gateway Timeout | Origin (ALB) is unreachable from CloudFront | Confirm ALB is internet-facing and SG allows 0.0.0.0/0 on port 80. |

### Member 5

| Error | Likely cause | Fix |
|---|---|---|
| `next build` fails with "Dynamic route requires generateStaticParams" | Static export needs build-time params | Add `generateStaticParams() { return []; }` to the dynamic route file (see step 5.3). |
| Cognito login fails with "User does not exist" | Email casing mismatch, or pool ID wrong | Cognito emails are case-sensitive in some configurations. Confirm exact email in `aws cognito-idp list-users`. |
| Cognito login fails with "Incorrect username or password" | Permanent password not set | Re-run step 1.8's `admin-set-user-password` block. |
| Dashboard loads but shows no tasks | `NEXT_PUBLIC_USE_MOCKS=true` is leaking into prod build | Confirm the env var was `false` at build time, not at runtime. Re-build with `NEXT_PUBLIC_USE_MOCKS=false`. |
| Drag-and-drop doesn't update server | API call failed silently | Open browser devtools → Network → drag a card → look for failed `PATCH /api/tasks/<id>`. Likely 401 (auth issue) or 403 (team isolation). |

---

## Appendix D — Deliverables checklist

Tick off as you go. Submit only when all are ✅.

- [ ] **GitHub repo URL** — `https://github.com/yraghy/SWCC-Project` (already exists)
- [ ] **README.md updated with live URL** — Member 5 step 5.8
- [ ] **Architecture diagram** — `docs/architecture-diagram.png` using AWS standard icons, drawn in Lucidchart or PowerPoint (Member 5 step 5.11)
- [ ] **Demo video** — 5 min, uploaded to YouTube unlisted or Google Drive (Member 5 step 5.10)
- [ ] **Live CloudFront URL** — opens directly to the working app, no additional config (Member 4 step 4.9 + Member 5 step 5.6)
- [ ] **PDF demo scenario passes in incognito** — Ali / Sara / Omar (Member 5 step 5.9)
- [ ] **Submission form filled** — [Google Form](https://docs.google.com/forms/d/e/1FAIpQLSdOo4eouZwbf-dNVfwFvraYxGZx6TTdsflE-DISRQX3jWTPkg/viewform) (Member 5 step 5.12)
- [ ] **Nothing terminated** — EC2 may be stopped; everything else still provisioned (Member 5 step 5.13)

Final check: in the AWS console, switch to eu-central-1, search for `swcc-project` in the Resource Groups & Tag Editor. You should see ~40+ resources tagged `Project=swcc-project`. If any major service is missing, that piece of the architecture isn't deployed.

---

**End of doc.** If something here is unclear, fix it in a PR against `docs/MEMBER_GUIDE.md` and ping the team chat.
