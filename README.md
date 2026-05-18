# Reddit Clone — Social Media Platform

A full-stack Reddit-style social media platform built with **Next.js 16**, **Express.js**, **Tailwind CSS**, and **TypeScript**.

![Reddit Clone](https://img.shields.io/badge/Next.js-16-black?logo=next.js) ![Express](https://img.shields.io/badge/Express-4.x-green?logo=express) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript) ![TailwindCSS](https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss)

---

## ✨ Features

- 📝 **Create & browse posts** across communities
- 👍 **Upvote / Downvote** with optimistic UI updates
- 💬 **Comments** on posts
- 🔐 **User authentication** (register & login)
- 🏘️ **Communities** — browse, filter by subreddit
- 📊 **Trending page** with hot posts
- 👤 **User profiles**
- 🌙 **Dark mode** (cinematic UI)
- ⚡ **Fast** — powered by Next.js Turbopack

---

## 🗂️ Project Structure

```
Social Media Platform/
├── frontend/          # Next.js 16 app (UI + API routes)
│   ├── src/
│   │   ├── app/       # Pages & API routes (App Router)
│   │   ├── components/ # Reusable UI components
│   │   ├── contexts/  # React context (auth, etc.)
│   │   └── lib/       # Data store & utilities
│   └── ...
└── backend/           # Express.js API server (optional)
    └── server.js
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18 or higher

### 1. Install dependencies

```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies (optional)
cd ../backend
npm install
```

### 2. Run the development servers

**Frontend (Next.js):**
```bash
cd frontend
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) 🎉

**Backend (Express, optional):**
```bash
cd backend
npm run dev
```
Runs on [http://localhost:5000](http://localhost:5000)

---

## ⚙️ Environment Variables

The app works out-of-the-box with no environment variables — it uses a local JSON data store by default.

To connect a real PostgreSQL database, create `frontend/.env`:
```env
# Copy from frontend/.env.example
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS, Radix UI, Framer Motion |
| Backend | Express.js 4, Node.js |
| Database | JSON file store (dev) / PostgreSQL (prod) |
| Auth | Session tokens (JWT-compatible) |

---

## 📄 License

MIT — feel free to use this project for learning or as a starter template.
