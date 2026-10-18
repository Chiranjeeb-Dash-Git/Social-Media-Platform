# SocialPulse

<p align="center">
  <a href="https://social-media-platform-azure-ten.vercel.app/"><img src="https://social-media-platform-azure-ten.vercel.app/socialpulse-mark.svg" alt="SocialPulse" width="640" /></a>
</p>

<p align="center">
  <a href="https://social-media-platform-azure-ten.vercel.app/"><img src="https://img.shields.io/badge/Live%20website-Open%20SocialPulse-FF5A36?style=for-the-badge&logo=vercel&logoColor=white" alt="Open live website" /></a>
  <img src="https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js" alt="Next.js 14" />
  <img src="https://img.shields.io/badge/TypeScript-React-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript and React" />
  <img src="https://img.shields.io/badge/PostgreSQL-Neon-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
</p>

SocialPulse is a full-stack social network for posts, stories, direct and group messaging, communities, creator pages, profiles, notifications, and friend relationships. It is designed around registered users and PostgreSQL-backed data rather than seeded demo identities.

## Product highlights

- User-ID and password authentication with hashed passwords, bearer sessions, account security controls, and logout-everywhere support.
- Real posts, comments, reactions, sharing, profiles, friend relationships, groups, pages, and expiring stories.
- Direct and group messaging with photos, documents, voice notes, message editing/unsending, unread notifications, online presence, and clear-chat history.
- Responsive chat UI with constrained media, mobile-safe scrolling, refresh-based real-time sync, and notification sound/toast alerts.
- SocialPulse landing experience for logged-out visitors and a focused authenticated feed for members.

## Architecture

The production application lives in `frontend/`:

- **Next.js App Router** for the web application and serverless API route handlers.
- **React 18 + TypeScript** for the client UI.
- **Tailwind CSS, Radix UI, Framer Motion, and Lucide** for accessible, responsive interface components.
- **Neon PostgreSQL + `pg`** for persistent application data and connection pooling.
- **Vercel** for production hosting.

All backend endpoints are colocated with the app in `frontend/src/app/api/`. The repository intentionally does not include a second obsolete server or local database dump; production data is accessed through the configured PostgreSQL connection.

## Main API areas

`/api/auth` · `/api/users` · `/api/posts` · `/api/comments` · `/api/reactions` · `/api/messages` · `/api/stories` · `/api/communities` · `/api/pages` · `/api/notifications`

## Local development

Requirements: Node.js 18.17+ and a PostgreSQL/Neon database.

```bash
git clone https://github.com/Chiranjeeb-Dash-Git/Social-Media-Platform.git
cd Social-Media-Platform
npm install
```

Create `frontend/.env.local`:

```env
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
```

Run the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Production deployment

The Vercel project uses `frontend` as its Root Directory. Configure `DATABASE_URL` in the Vercel project environment, then deploy with `vercel --prod`.

Live application: **[social-media-platform-azure-ten.vercel.app](https://social-media-platform-azure-ten.vercel.app/)**

## Project layout

```text
frontend/
  src/app/          Pages and API route handlers
  src/components/   Reusable UI and feature components
  src/contexts/     Authentication and theme state
  src/lib/          PostgreSQL data access and shared utilities
  public/           Public assets and project branding
```

## License

This project is maintained as a personal portfolio application by Chiranjeeb Dash.
