# Questions App

Simple Q&A voting app with a Node/Express backend and a static frontend.

## Live App

http://running-phoebe-esg-3rdeye-79b074ba.koyeb.app/

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

---

## Claude Code + GitHub Workflow Guide

How to build and deploy a new web app using Claude Code (this chat interface).

### The Big Picture

```
Claude Code (chat)
      ↓  writes & edits code
 Git repo on the server
      ↓  git push
    GitHub repo
      ↓  auto-deploys on push
 Live web app
      ↕  reads/writes
 External Postgres database (persists forever)
```

### Step 1: Create a GitHub Repo

1. Go to github.com → New repository
2. Give it a name (e.g. `my-new-app`)
3. Leave it empty (no README) — you'll push code into it
4. Copy the repo URL

### Step 2: Start a New Chat and Tell Claude Your Stack

Open a new Claude Code conversation and say something like:

> "Build me an MVP of [your idea]. Use Node.js + Express + PostgreSQL. It should be deployable via a Dockerfile. The database URL comes from a `DATABASE_URL` environment variable."

That's the stack that works great because:
- **Node/Express** — simple server
- **PostgreSQL** — persistent external database (survives redeploys)
- **Dockerfile** — any host can run it
- **`DATABASE_URL` env var** — set it on the host, never hardcode it

### Step 3: The Database — Why It Never Loses Data

Your Postgres database lives **outside** the app (on Neon, Supabase, Railway, etc.).
The app is stateless — it can be rebuilt or redeployed and your data is safe.

The key pattern is using `IF NOT EXISTS` when creating tables:

```sql
CREATE TABLE IF NOT EXISTS my_table (...);
```

- First deploy → creates the table
- Every subsequent deploy → skips creation, leaves your data alone

Always use `CREATE TABLE IF NOT EXISTS` in your new apps.

### Step 4: Pick a Postgres Host (Free Options)

| Service | Notes |
|---|---|
| [neon.tech](https://neon.tech) | Free tier, easy setup, copy the connection string |
| [supabase.com](https://supabase.com) | Free tier, includes a data browser UI |
| [Railway](https://railway.app) | Can host your app and Postgres together |

You get a `DATABASE_URL` that looks like:
```
postgresql://user:password@host/dbname?sslmode=require
```

### Step 5: Pick an App Host

| Service | Notes |
|---|---|
| [Koyeb](https://koyeb.com) | Detects Dockerfile automatically, free tier |
| [Railway](https://railway.app) | Easiest, connects directly to GitHub |
| [Render](https://render.com) | GitHub-connected, free tier |

All of these:
1. Connect to your GitHub repo
2. Auto-deploy every time you push to `main`
3. Let you set environment variables in their dashboard

### Step 6: Set Environment Variables on the Host

In your hosting dashboard, set:

| Variable | Value |
|---|---|
| `DATABASE_URL` | your Postgres connection string |
| `ADMIN_TOKEN` | a secret string for any admin routes |
| `PORT` | usually set automatically by the host |

### Step 7: What Claude Does in Each Chat Session

1. Claude edits your files directly
2. Claude commits with `git commit`
3. Claude pushes to your branch with `git push`
4. GitHub receives the push
5. Your host sees the new commit and redeploys automatically

You describe what you want — Claude handles the code, git, and push.

### Starter Prompt for a New App

Copy and paste this into a new Claude Code chat, filling in the blanks:

```
Build me an MVP of [describe your idea].

Use Node.js, Express, and PostgreSQL (connection string via DATABASE_URL env var).
Include a Dockerfile so it can be deployed anywhere.
Use "CREATE TABLE IF NOT EXISTS" so data persists across redeploys.
The GitHub repo is [your repo URL].
Push the finished code to the main branch.

[Add any specifics: auth, file uploads, extra tables, admin routes, etc.]
```
