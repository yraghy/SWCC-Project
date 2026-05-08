# Software Cloud Computing Project

A lightweight team task-management platform built on AWS — supporting role-based access, event-driven notifications, and a Kanban board UI.

> **Live URL:** `https://xxxx.cloudfront.net`

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js · TypeScript · Tailwind · shadcn/ui |
| Backend | Node.js · Express · TypeScript |
| Auth | AWS Cognito |
| Database | AWS DynamoDB |
| Storage | AWS S3 |
| Events | AWS SNS · SQS · EventBridge |
| Compute | AWS EC2 (Auto Scaling Group, 2 AZs) |
| CDN | AWS CloudFront + Application Load Balancer |
| Monitoring | AWS CloudWatch |
| Functions | AWS Lambda (image resize, assignment worker, daily digest) |

---

## Architecture

![Architecture Diagram](docs/architecture-diagram.png)

---

## Repo Structure

```
mini-jira/
├── backend/        # Express REST API (runs on EC2)
├── frontend/       # Next.js app
├── lambdas/        # image-resize / assignment-worker / daily-digest
├── shared/         # Shared TypeScript types
├── scripts/        # EC2 user-data startup script
└── docs/           # Architecture diagram, API reference
```

---

## Local Setup

### Prerequisites
- Node.js 20+
- AWS credentials configured (`aws configure`)
- `aws-config.json` in repo root (get from Member 2)

### Backend
```bash
cd backend
cp .env.example .env      # fill in values from aws-config.json
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev               # runs on localhost:3000
```

### Lambdas
```bash
cd lambdas/image-resize
npm install
# test locally using AWS SAM or invoke directly via AWS console
```

---

## Demo Scenario

| User | Role | Sees |
|---|---|---|
| `ali` | Manager | All tasks across all teams |
| `sara` | Employee — Frontend | Task A only |
| `omar` | Employee — Backend | Task B only |

> Credentials pinned in the team group chat.

---

## Team

| Member | Responsibility |
|---|---|
| Member 1 | Infrastructure — VPC, EC2, ALB, ASG, CloudFront |
| Member 2 | Auth, DynamoDB, S3, SNS, SQS, EventBridge, IAM |
| Member 3 | Backend API |
| Member 4 | Frontend |
| Member 5 | Lambdas, CloudWatch |

---

## Deployment

EC2 instances pull from `main` on startup via `scripts/ec2-userdata.sh`.
To redeploy: push to `main` → GitHub Actions SSHs into EC2 → `git pull` → `pm2 restart`.

---

**Deadline:** 22 May 2026 · German International University — Software Cloud Computing
