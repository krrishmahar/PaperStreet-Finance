# Project Context

## Database Schema

### users
- `id` (INTEGER, primary key, autoincrement)
- `username` (TEXT, unique, not null)
- `email` (TEXT, unique, not null)
- `password_hash` (TEXT, not null)
- `created_at` (DATETIME, default CURRENT_TIMESTAMP)

### posts
- `id` (INTEGER, primary key, autoincrement)
- `user_id` (INTEGER, foreign key → users.id, not null)
- `title` (TEXT, not null)
- `content` (TEXT, not null)
- `published_at` (DATETIME)

### comments
- `id` (INTEGER, primary key, autoincrement)
- `post_id` (INTEGER, foreign key → posts.id, not null)
- `user_id` (INTEGER, foreign key → users.id, not null)
- `body` (TEXT, not null)
- `created_at` (DATETIME, default CURRENT_TIMESTAMP)

## Health Check Endpoint

- **URL:** `/health`
- **Method:** `GET`
- **Response:** `200 OK` with JSON payload:
  ```json
  {
    "status": "healthy",
    "timestamp": "2024-01-01T12:00:00Z"
  }
  ```
- **Purpose:** Verify that the application, database connection, and dependent services are operational.

---

*Document last updated: 2024-08-28*
