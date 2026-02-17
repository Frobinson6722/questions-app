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
- `ADMIN_USERNAME=Frobinson6722 ADMIN_PASSWORD=3rdeyeEsg! npm start`

Then call:

- `POST /admin/clear` with header `x-admin-token: yourtoken` (or `Authorization: Bearer yourtoken`).

## Database

This app uses PostgreSQL. Set:

- `DATABASE_URL=postgres://user:pass@host:5432/dbname`

## API

- `POST /question` `{ "text": "..." }`
- `POST /vote` `{ "id": 1, "direction": "up" | "down" }`
- `GET /questions?sort=top|newest|low`
- `POST /admin/clear`
- `POST /admin/login` `{ "username": "...", "password": "..." }`
- `DELETE /admin/question/:id`
