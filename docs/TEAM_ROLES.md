# Team Roles — Mini-Jira on AWS

A strict serial ordering for a 5-person team working in a single shared AWS account. Each member's **"go" signal** is the previous member finishing their handoff. This is the order to follow if you want zero blocking ambiguity; if you want more parallelism, see [Optional parallel work](#optional-parallel-work) at the bottom.

> **Deadline:** 22 May 2026 · ~12 days from kickoff.

---

## Sequence at a glance

| # | Member | Owns | Hands off |
|---|---|---|---|
| 1 | **Member 1 — Foundations** | AWS account ops, IAM users + group, Cognito user pool, DynamoDB tables + GSIs, S3 buckets, IAM roles for EC2 / Lambdas | All IDs / ARNs / names → `aws-config.json` + team chat |
| 2 | **Member 2 — Backend integration** | Wire backend to the real AWS resources, populate SSM Parameter Store, smoke-test API end-to-end locally, fix bugs | Working backend on `localhost:4000` hitting real DynamoDB/S3/Cognito |
| 3 | **Member 3 — Events & Lambdas** | SNS topics, SQS queue + subscription, 3 Lambdas (image-resize, assignment-worker, daily-digest), EventBridge schedule, CloudWatch dashboard + alarm | All event-driven plumbing live and observable in CloudWatch |
| 4 | **Member 4 — Hosting infrastructure** | VPC + subnets + NAT, EC2 launch template (uses `scripts/ec2-userdata.sh`), ASG across 2 AZs, ALB with `/health` health check, CloudFront in front of ALB with `/api/*` uncached | Public CloudFront URL serving the API |
| 5 | **Member 5 — Frontend & demo** | Image-upload UI in `TaskForm`, polish, wire to the deployed CloudFront URL, deploy the frontend, record the demo video | Live link in `README.md` + demo video |

---

## Member 1 — Foundations

**Starts:** Day 1. **Blocks:** everyone.

### Tasks (in order)

1. **AWS account & IAM**
   - Enable MFA on root, lock root credentials away.
   - Create an IAM group `MiniJiraTeam` with `PowerUserAccess`.
   - Create 5 IAM users (one per teammate); add them to the group; share the console URL `https://<ACCOUNT_ID>.signin.aws.amazon.com/console` and individual access keys.
   - Set a CloudWatch billing alarm at $5 to catch runaway charges.
2. **Region lock-in** — pick one (`eu-central-1` is the code default) and post it everywhere.
3. **Cognito user pool** — see [`CLOUD_SETUP.md` §2](./CLOUD_SETUP.md#2-cognito-user-pool). Required attributes plus custom `custom:role` and `custom:teamId`. Seed Ali / Sara / Omar.
4. **DynamoDB tables** — [§3](./CLOUD_SETUP.md#3-dynamodb-tables). All six tables + the three GSIs on `tasks`. Create GSIs at table-creation time (in-place GSI add is slow).
5. **S3 buckets** — [§4](./CLOUD_SETUP.md#4-s3-buckets). Versioning **ON** for `mini-jira-originals`.
6. **IAM roles** — one each for EC2 (DynamoDB CRUD + S3 + SNS publish + CloudWatch metrics + SSM read), image-resize Lambda (S3 read/write), assignment-worker Lambda (SQS + DDB + CloudWatch), daily-digest Lambda (DDB scan + SNS publish).

### Handoff (commit-or-paste to team chat)

```jsonc
// aws-config.json
{
  "region": "eu-central-1",
  "cognito": { "userPoolId": "eu-central-1_XXXX", "clientId": "XXXX" },
  "dynamodb": { "users": "mini-jira-users", "teams": "mini-jira-teams", "...": "..." },
  "s3": { "originals": "mini-jira-originals", "resized": "mini-jira-resized" }
}
```

Done when: Member 2 can run the backend locally and a `GET /api/teams` against real DynamoDB returns the seeded teams.

---

## Member 2 — Backend integration

**Starts:** when Member 1 hands off. **Blocks:** Members 3 and 4.

### Tasks (in order)

1. **Local dev against real AWS** — copy `aws-config.json` into `backend/.env`, set `AUTH_DEV_BYPASS=false`, `aws configure` with personal access key, run `npm run dev`.
2. **Smoke tests** with `curl` + a real Cognito ID token:
   - `GET /health` → `{ ok: true }`
   - `POST /api/users/me` (auth'd as Ali) → upserts manager.
   - `POST /api/projects` → creates project.
   - `POST /api/tasks` → creates task, fires SNS publish (may fail loudly here — that's OK, Member 3 hasn't built SNS yet; comment out or note for them).
3. **Fix bugs** surfaced by real AWS (cold start latency, IAM permission denials, etc.).
4. **Write SSM parameters** for every key in `backend/.env.example` under `/mini-jira/<KEY>`, so the EC2 user-data script can pull them at boot:
   ```bash
   aws ssm put-parameter --name /mini-jira/COGNITO_USER_POOL_ID --type String --value "eu-central-1_XXXX"
   # ... repeat for every key
   ```

### Handoff

- Confirm in chat: "backend is live on localhost against real DynamoDB; SSM is populated; ready for M3 and M4."
- Optionally open a PR with any backend bug fixes that surfaced (`fix(backend): …`).

Done when: Member 3 can publish a test message to the assignment SNS topic and see the backend log it.

---

## Member 3 — Events & Lambdas

**Starts:** when Member 2 hands off. **Blocks:** Member 4.

### Tasks (in order)

1. **SNS + SQS** — [`CLOUD_SETUP.md` §6](./CLOUD_SETUP.md#6-sns--sqs--assignment-events). Topic + SQS subscription + email subscription (**confirm the email**).
2. **Image-resize Lambda** — [§5](./CLOUD_SETUP.md#5-lambda--image-resize). Build the sharp layer **on Linux x64**, not your Mac:
   ```bash
   cd lambdas/layers/sharp/nodejs
   npm install --platform=linux --arch=x64 --libc=glibc sharp
   ```
   Trigger on S3 PUT on the originals bucket.
3. **Assignment-worker Lambda** — [§7](./CLOUD_SETUP.md#7-lambda--assignment-worker). Trigger on SQS. Verify: `POST /api/tasks` against the backend should write an audit row and bump the `TasksAssignedPerTeam` metric within a minute.
4. **Daily-digest Lambda + EventBridge** — [§8](./CLOUD_SETUP.md#8-eventbridge--daily-digest). Test by invoking manually before relying on the 9 AM cron.
5. **CloudWatch dashboard + alarm** — [§9](./CLOUD_SETUP.md#9-cloudwatch). Four widgets + one alarm publishing to an alerts SNS topic.

### Handoff

- All three Lambdas live, dashboard URL pinned in the chat.
- One demo of the full event chain: create task via backend → email arrives + audit row written + metric visible on the dashboard.

Done when: Member 4 can boot a fresh EC2 instance and watch metrics flow into CloudWatch.

---

## Member 4 — Hosting infrastructure

**Starts:** when Member 3 hands off. **Blocks:** Member 5.

### Tasks (in order)

1. **VPC** — [`CLOUD_SETUP.md` §10](./CLOUD_SETUP.md#10-ec2--alb--auto-scaling). 2 public + 2 private subnets across 2 AZs, NAT gateway, security groups (ALB SG allows 80/443; EC2 SG allows 4000 from ALB SG only).
2. **EC2 launch template** — Amazon Linux 2023, `t3.micro`, instance profile from Member 1, user-data = `scripts/ec2-userdata.sh` (**update `REPO_URL` to your fork**).
3. **Auto Scaling Group** — min/desired 2, across both private subnets.
4. **Application Load Balancer** — public subnets, listener port 80 → target group port 4000, health check path `/health`. Wait for both EC2 instances to go healthy.
5. **Smoke test** — `curl http://<alb-dns>/health` from your laptop → `{ ok: true }`.
6. **CloudFront** — [§11](./CLOUD_SETUP.md#11-cloudfront). Origin = ALB DNS. Behavior: `/api/*` → TTL 0, forward all headers + cookies + query strings. Default → cache as normal.

### Handoff

Post the CloudFront URL in the chat, e.g. `https://d123abc.cloudfront.net` — that's what Member 5 sets as `NEXT_PUBLIC_API_BASE_URL`.

Done when: `curl https://<cloudfront>/api/health` returns `{ ok: true }` end-to-end through CloudFront → ALB → EC2.

---

## Member 5 — Frontend & demo

**Starts:** when Member 4 hands off (but can scaffold image-upload UI against mocks earlier). **Blocks:** nothing — final step.

### Tasks (in order)

1. **Image-upload UI** in `frontend/src/components/tasks/TaskForm.tsx` — file input → `api.presignUpload` → `PUT` to the returned `uploadUrl` with the matching `Content-Type` → `api.attachImage` with the key.
2. **Polish** — empty states, error toasts where missing, consistent spacing, dark-mode if time allows (not required).
3. **Production env vars** — in the frontend deploy environment:
   ```
   NEXT_PUBLIC_USE_MOCKS=false
   NEXT_PUBLIC_API_BASE_URL=https://<cloudfront>.cloudfront.net
   NEXT_PUBLIC_COGNITO_USER_POOL_ID=eu-central-1_XXXX
   NEXT_PUBLIC_COGNITO_CLIENT_ID=XXXX
   ```
4. **Deploy the frontend** — simplest path: `next build && next export` (or static export) into an S3 bucket fronted by the same CloudFront distribution (different path prefix), OR a separate CloudFront distribution. Avoid Vercel if the grader will look closely at "everything on AWS".
5. **Update `README.md`** — replace the live URL placeholder with the real one.
6. **Demo dry-run** — full PDF scenario:
   - Ali signs in → creates Task A (assignee Sara, team Frontend) and Task B (assignee Omar, team Backend).
   - Sara signs in → sees only Task A.
   - Omar signs in → sees only Task B.
   - Ali signs back in → sees both; filters by team.
7. **Record the demo video** — screen record the dry-run with narration covering each AWS service in the architecture.

Done when: a fresh browser at the CloudFront URL passes the PDF demo scenario, and the video is uploaded.

---

## Optional parallel work

If you want to shave days off the critical path:

- **M3 can scaffold Lambdas locally** during M2's window. They can write handler code, build the sharp layer, and unit-test handlers with the AWS SDK pointed at LocalStack or with mocked events. End-to-end verification still has to wait for M2.
- **M5 can polish the frontend and build the image-upload UI** against mocks during any earlier window. The only thing that has to wait for M4 is the production wiring.
- **M4 can pre-build the VPC, ALB, and ASG with a placeholder backend image** during M3's window. Swap the user-data once M2/M3 finish.

---

## Communication rules

- **All ARNs / IDs / DNS names go in `aws-config.json` AND get pinned in chat.** Don't share over voice/screen-share only — the next member will need to look them up.
- **Region is fixed.** If you see a resource you didn't create, you're probably in the wrong region.
- **Nobody runs `Terminate`** on any resource until grades are released. Per the PDF, terminated resources = zero.
- **Tag every resource** `Project=mini-jira` so you can list and stop them as a group between sessions.
