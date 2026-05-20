#!/usr/bin/env bash
set -euo pipefail

declare -A PARAMS=(
  [COGNITO_USER_POOL_ID]="eu-central-1_zmKEdHhfj"
  [COGNITO_CLIENT_ID]="7eucu3noccovsjogul4lhjnc8a"
  [DDB_USERS_TABLE]="swcc-project-users"
  [DDB_TEAMS_TABLE]="swcc-project-teams"
  [DDB_PROJECTS_TABLE]="swcc-project-projects"
  [DDB_TASKS_TABLE]="swcc-project-tasks"
  [DDB_COMMENTS_TABLE]="swcc-project-comments"
  [DDB_AUDIT_TABLE]="swcc-project-audit"
  [DDB_TASKS_GSI_TEAM]="byTeam"
  [DDB_TASKS_GSI_ASSIGNEE]="byAssignee"
  [DDB_TASKS_GSI_DEADLINE]="byDeadline"
  [S3_ORIGINALS_BUCKET]="swcc-project-originals-flow"
  [S3_RESIZED_BUCKET]="swcc-project-resized-flow"
  [SNS_ASSIGNMENT_TOPIC_ARN]=""
  [SNS_DIGEST_TOPIC_ARN]=""
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