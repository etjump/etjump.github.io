# ETJump Maps - Setup Guide

## Prerequisites

- [Bun](https://bun.sh/) (v1.0+) - JavaScript runtime and package manager
- [Node.js](https://nodejs.org/) (v18+) - required by the `sharp` image processing library

```bash
# Linux / macOS
curl -fsSL https://bun.sh/install | bash

# Windows (via PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"
```

## Backend (maps-api)

```bash
cd maps-api
bun install
cp .env.example .env
```

Edit `.env` and set `UPLOAD_SECRET` to a secret key of your choice. The other defaults work out of the box for local development.

```bash
# Create the database and tables
bun run db:migrate

# Start the API (auto-reloads on changes)
bun run dev
```

The API runs at `http://localhost:3001`.

The migration creates the SQLite database file and its tables. It's safe to run repeatedly - it only creates what doesn't exist yet.

## Frontend (maps-web)

```bash
cd maps-web
bun install
bun run dev
```

The frontend runs at `http://localhost:5173`. API calls to `/api/*` are automatically proxied to the backend during development.

## Testing the Upload Flow

1. Open `http://localhost:5173`
2. Click the key icon and enter the secret key you set in `.env`
3. Go to Upload, select a `.pk3` file, fill in details, and save
4. The map appears in the list with metadata extracted from the BSP file
