# Questions App

Simple Q&A voting app with a Node/Express backend and a static frontend.

## Run

1. Install deps:
   - `npm install`
2. Start server:
   - `npm start`
3. Open in browser:
   - `http://localhost:3000`

## Admin

Set an admin token to clear questions:

- `ADMIN_TOKEN=yourtoken npm start`

Then call:

- `POST /admin/clear` with header `x-admin-token: yourtoken` (or `Authorization: Bearer yourtoken`).

## Persistence

SQLite file location:

- Default: `questions.db` in the project root.
- Override: `DB_PATH=/path/to/questions.db`

## API

- `POST /question` `{ "text": "..." }`
- `POST /vote` `{ "id": 1, "direction": "up" | "down" }`
- `GET /questions?sort=top|newest|low`
- `POST /admin/clear`
