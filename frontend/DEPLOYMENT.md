# Vercel Deployment

Deploy this `frontend` folder as the Vercel project root.

## Required Vercel settings

- Framework Preset: Next.js
- Root Directory: `frontend`
- Build Command: `npm run build`
- Install Command: `npm install`

## Required environment variables

Set one hosted Postgres connection string:

```text
POSTGRES_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
POSTGRES_SSL=true
```

The app uses Postgres when `POSTGRES_URL` or a normal `postgres://` `DATABASE_URL` exists. Without that, it falls back to the local JSON store for development.

## Import local data

After creating a hosted Postgres database, import your current local posts:

```bash
cd frontend
POSTGRES_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require" node scripts/import-store-to-postgres.mjs
```

Large image uploads are limited to 2 MB because Vercel serverless requests have a small payload limit.
