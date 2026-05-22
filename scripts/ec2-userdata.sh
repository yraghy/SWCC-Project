#!/usr/bin/env bash
# EC2 user-data script — runs once on instance boot.
# Replace REPO_URL with your fork before launching the ASG.
set -euxo pipefail

REPO_URL="https://github.com/yraghy/SWCC-Project.git"
APP_DIR="/opt/mini-jira"
NODE_VERSION="20"

# --- system deps ---
dnf update -y || yum update -y
dnf install -y git || yum install -y git

# --- Node.js (Amazon Linux 2023 / 2) ---
curl -fsSL "https://rpm.nodesource.com/setup_${NODE_VERSION}.x" | bash -
dnf install -y nodejs || yum install -y nodejs
npm install -g pm2

# --- clone & install ---
mkdir -p "$APP_DIR"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" pull
else
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR/backend"
npm ci 
npm run build

# --- env file ---
# Pulls SSM parameters into /opt/mini-jira/backend/.env. Provision these
# with `aws ssm put-parameter` during manual setup. Keys mirror .env.example.
ENV_PATH="$APP_DIR/backend/.env"
{
  echo "NODE_ENV=production"
  echo "PORT=4000"
  echo "AUTH_DEV_BYPASS=false"
  echo "AWS_REGION=$(ec2-metadata --availability-zone | awk '{print $2}' | sed 's/[a-z]$//')"
  for KEY in COGNITO_USER_POOL_ID COGNITO_CLIENT_ID \
             DDB_USERS_TABLE DDB_TEAMS_TABLE DDB_PROJECTS_TABLE DDB_TASKS_TABLE DDB_COMMENTS_TABLE DDB_AUDIT_TABLE \
             DDB_TASKS_GSI_TEAM DDB_TASKS_GSI_ASSIGNEE DDB_TASKS_GSI_DEADLINE \
             S3_ORIGINALS_BUCKET S3_RESIZED_BUCKET \
             SNS_ASSIGNMENT_TOPIC_ARN SNS_DIGEST_TOPIC_ARN CW_NAMESPACE; do
    VAL=$(aws ssm get-parameter --name "/mini-jira/${KEY}" --with-decryption --query Parameter.Value --output text 2>/dev/null || echo "")
    echo "${KEY}=${VAL}"
  done
} > "$ENV_PATH"
chmod 600 "$ENV_PATH"

# --- build frontend (served statically by the backend) ---
cd "$APP_DIR/frontend"
npm ci
NEXT_PUBLIC_USE_MOCKS=false \
NEXT_PUBLIC_API_BASE_URL="$(aws ssm get-parameter --name /swcc-project/CLOUDFRONT_URL --query Parameter.Value --output text)" \
NEXT_PUBLIC_COGNITO_USER_POOL_ID="$(aws ssm get-parameter --name /swcc-project/COGNITO_USER_POOL_ID --query Parameter.Value --output text)" \
NEXT_PUBLIC_COGNITO_CLIENT_ID="$(aws ssm get-parameter --name /swcc-project/COGNITO_CLIENT_ID --query Parameter.Value --output text)" \
npm run build

cd "$APP_DIR/backend"

# --- run with pm2 ---
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash
