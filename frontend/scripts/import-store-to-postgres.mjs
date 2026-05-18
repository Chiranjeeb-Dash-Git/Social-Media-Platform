import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const { Pool } = pg;

const postgresUrl =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL;

if (!postgresUrl || !/^postgres(ql)?:\/\//i.test(postgresUrl)) {
  console.error("Set POSTGRES_URL to a hosted postgres:// connection string.");
  process.exit(1);
}

const storePath =
  process.env.DATA_STORE_PATH ||
  path.resolve(process.cwd(), "..", ".data", "store.json");

if (!fs.existsSync(storePath)) {
  console.error(`Store file not found: ${storePath}`);
  process.exit(1);
}

const store = JSON.parse(fs.readFileSync(storePath, "utf8").replace(/^\uFEFF/, ""));
const pool = new Pool({
  connectionString: postgresUrl,
  ssl:
    process.env.POSTGRES_SSL === "false"
      ? undefined
      : { rejectUnauthorized: false },
});

const query = (text, params) => pool.query(text, params);

await query(`
  CREATE TABLE IF NOT EXISTS app_users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    image TEXT,
    bio TEXT,
    karma INTEGER NOT NULL DEFAULT 0,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE
  );

  CREATE TABLE IF NOT EXISTS app_communities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    created_at TEXT NOT NULL,
    members INTEGER NOT NULL DEFAULT 0,
    icon TEXT
  );

  CREATE TABLE IF NOT EXISTS app_posts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL DEFAULT 'TEXT',
    url TEXT,
    image_url TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    author_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    community_id TEXT NOT NULL REFERENCES app_communities(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS app_comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL REFERENCES app_posts(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    author_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS app_votes (
    user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    post_id TEXT NOT NULL REFERENCES app_posts(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    PRIMARY KEY (user_id, post_id)
  );

  CREATE TABLE IF NOT EXISTS app_sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE
  );
`);

const client = await pool.connect();

try {
  await client.query("BEGIN");
  await client.query("DELETE FROM app_sessions");
  await client.query("DELETE FROM app_votes");
  await client.query("DELETE FROM app_comments");
  await client.query("DELETE FROM app_posts");
  await client.query("DELETE FROM app_communities");
  await client.query("DELETE FROM app_users");

  for (const user of store.users ?? []) {
    await client.query(
      `INSERT INTO app_users
        (id, username, email, password, image, bio, karma, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        user.id,
        user.username,
        user.email,
        user.password,
        user.image ?? null,
        user.bio ?? null,
        user.karma ?? 0,
        Boolean(user.isVerified),
      ]
    );
  }

  for (const community of store.communities ?? []) {
    await client.query(
      `INSERT INTO app_communities
        (id, name, description, created_at, members, icon)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        community.id,
        community.name,
        community.description,
        community.createdAt,
        community.members ?? 0,
        community.icon ?? null,
      ]
    );
  }

  for (const post of store.posts ?? []) {
    await client.query(
      `INSERT INTO app_posts
        (id, title, content, type, url, image_url, created_at, updated_at, author_id, community_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        post.id,
        post.title,
        post.content ?? "",
        post.type ?? "TEXT",
        post.url ?? null,
        post.imageUrl ?? null,
        post.createdAt,
        post.updatedAt ?? null,
        post.authorId,
        post.communityId,
      ]
    );
  }

  for (const comment of store.comments ?? []) {
    await client.query(
      `INSERT INTO app_comments
        (id, post_id, content, created_at, updated_at, author_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        comment.id,
        comment.postId,
        comment.content,
        comment.createdAt,
        comment.updatedAt ?? null,
        comment.authorId,
      ]
    );
  }

  for (const vote of store.votes ?? []) {
    await client.query(
      `INSERT INTO app_votes (user_id, post_id, type)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, post_id) DO UPDATE SET type = EXCLUDED.type`,
      [vote.userId, vote.postId, vote.type]
    );
  }

  for (const [token, userId] of Object.entries(store.sessions ?? {})) {
    await client.query(
      "INSERT INTO app_sessions (token, user_id) VALUES ($1, $2)",
      [token, userId]
    );
  }

  await client.query("COMMIT");
  console.log(`Imported ${store.posts?.length ?? 0} posts into Postgres.`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
