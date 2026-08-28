# Project Context

## Database Schema

| Table    | Columns                                                                 | Description               |
|----------|-------------------------------------------------------------------------|---------------------------|
| users    | id (PK, UUID), name (VARCHAR), email (VARCHAR, unique), created_at (TIMESTAMP) | Stores user accounts |
| posts    | id (PK, UUID), user_id (FK → users.id), title (VARCHAR), body (TEXT), created_at (TIMESTAMP) | Blog posts |
| comments | id (PK, UUID), post_id (FK → posts.id), user_id (FK → users.id), content (TEXT), created_at (TIMESTAMP) | Comments on posts |

### ER Diagram
*(Insert diagram or description)*

## API Endpoints

### Health Check

- **URL**: `/health`
- **Method**: `GET`
- **Description**: Returns the health status of the service.
- **Responses**:
  - `200 OK` – Service is healthy.
  - `503 Service Unavailable` – Service is unhealthy.

Response body (JSON):
```json
{
  "status": "ok",
  "timestamp": "2024-08-28T12:34:56Z"
}
```

# Project Documentation

This repository contains the full documentation for the project, including the database schema and API specifications.

## Files

- `docs/Context.md` – Detailed context, database schema, and health check endpoint.
- `docs/README.md` – Overview of the documentation set.

## Getting Started

1. Clone the repository.
2. Open `docs/Context.md` for detailed technical information.
3. Use the health check endpoint (`GET /health`) to verify service status.

## License

MIT