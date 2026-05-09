# API Reference

Base URL: `https://<cloudfront>.cloudfront.net/api` (prod) · `http://localhost:4000/api` (dev).

All `/api/*` endpoints require `Authorization: Bearer <Cognito ID token>`.
In dev with `AUTH_DEV_BYPASS=true`, send `X-Dev-User: {JSON AuthClaims}` instead.

Server enforces team isolation: employees only see/modify tasks where `task.teamId === user.teamId`. Managers/admins bypass this filter.

## Health

`GET /health` → `{ ok: true }` (no auth)

## Users

| Method | Path | Notes |
|---|---|---|
| `GET` | `/users/me` | Upserts the caller from token claims, returns the user. |
| `GET` | `/users` | `?teamId=` optional. |
| `GET` | `/users/:id` | |
| `POST` | `/users` | Manager only. Body: `CreateUserDto`. |

## Teams

| Method | Path | Notes |
|---|---|---|
| `GET` | `/teams` | |
| `GET` | `/teams/:id` | |
| `POST` | `/teams` | Manager only. Body: `{ name }`. |

## Projects

| Method | Path | Notes |
|---|---|---|
| `GET` | `/projects` | |
| `GET` | `/projects/:id` | |
| `POST` | `/projects` | Manager only. Body: `CreateProjectDto`. |
| `PATCH` | `/projects/:id` | Manager only. |
| `DELETE` | `/projects/:id` | Manager only. |

## Tasks

| Method | Path | Notes |
|---|---|---|
| `GET` | `/tasks` | `?teamId=&assigneeId=&status=` — server-side team filter applied for employees. |
| `GET` | `/tasks/:id` | Returns presigned URLs for image attachments. |
| `POST` | `/tasks` | Manager only. Publishes SNS assignment event. |
| `PATCH` | `/tasks/:id` | Manager: any field. Employee: only their own task's `status`. |
| `DELETE` | `/tasks/:id` | Manager only. Deletes S3 originals + resized. |
| `GET` | `/tasks/:id/audit` | Audit log (status changes, reassignments). |
| `POST` | `/tasks/:id/images/presign` | Body: `{ contentType }` → `{ uploadUrl, key }`. |
| `POST` | `/tasks/:id/images` | Body: `{ key }` — attach uploaded image to task. |

## Comments

| Method | Path | Notes |
|---|---|---|
| `GET` | `/comments/tasks/:taskId` | Team isolation enforced via task lookup. |
| `POST` | `/comments/tasks/:taskId` | Body: `{ body }`. |

## Status flow

`todo → in_progress → in_review → done`. Server validates status is one of these four; transitions in any direction are allowed (drag-and-drop friendly).
