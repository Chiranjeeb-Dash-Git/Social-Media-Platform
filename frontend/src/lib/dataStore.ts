import { randomUUID } from "node:crypto";
const { Pool } = require("pg");

type QueryArgs = Record<string, unknown>;
type VoteType = "UP" | "DOWN";
type PostType = "TEXT" | "IMAGE" | "LINK";

const getPostgresUrl = () => {
  const url =
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    "";
  return /^postgres(ql)?:\/\//i.test(url) ? url : null;
};

const connectionString = getPostgresUrl();

if (!connectionString) {
  throw new Error(
    "DATABASE_URL or POSTGRES_URL environment variable is missing. Please set it in your .env file."
  );
}

const shouldUsePostgresSsl = (url: string) => {
  if (process.env.POSTGRES_SSL === "false") return false;
  if (process.env.POSTGRES_SSL === "true") return true;
  return Boolean(process.env.VERCEL) || !/localhost|127\.0\.0\.1/i.test(url);
};

const pool = new Pool({
  connectionString,
  max: 15,
  ssl: shouldUsePostgresSsl(connectionString)
    ? { rejectUnauthorized: false }
    : undefined,
});

let schemaInitialized = false;

const initSchema = async () => {
  if (schemaInitialized) return;
  
  await pool.query(`
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
  
  // Seed basic communities if empty
  const { rowCount } = await pool.query("SELECT id FROM app_communities LIMIT 1");
  if (rowCount === 0) {
    const defaultCommunities = [
      { id: "1", name: "programming", desc: "Talk about code, tools, and software engineering.", icon: "https://api.dicebear.com/7.x/initials/svg?seed=programming&backgroundColor=4f46e5" },
      { id: "2", name: "nextjs", desc: "Server components, routing, data fetching, and Next.js apps.", icon: "https://api.dicebear.com/7.x/initials/svg?seed=nextjs&backgroundColor=000000" },
      { id: "3", name: "webdev", desc: "Frontend, backend, design systems, and web product craft.", icon: "https://api.dicebear.com/7.x/initials/svg?seed=webdev&backgroundColor=059669" }
    ];
    
    for (const c of defaultCommunities) {
      await pool.query(
        "INSERT INTO app_communities (id, name, description, created_at, icon) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING",
        [c.id, c.name, c.desc, new Date().toISOString(), c.icon]
      );
    }
  }

  schemaInitialized = true;
};

// Utilities
const mapUser = (row: any) => ({
  id: row.id,
  username: row.username,
  email: row.email,
  image: row.image,
  bio: row.bio,
  karma: row.karma,
  isVerified: row.is_verified,
});

const hydratePost = async (postRow: any) => {
  const [authorRes, communityRes, votesRes, commentsRes] = await Promise.all([
    pool.query("SELECT * FROM app_users WHERE id = $1", [postRow.author_id]),
    pool.query("SELECT * FROM app_communities WHERE id = $1", [postRow.community_id]),
    pool.query("SELECT * FROM app_votes WHERE post_id = $1", [postRow.id]),
    pool.query("SELECT COUNT(*) as count FROM app_comments WHERE post_id = $1", [postRow.id])
  ]);

  const author = authorRes.rows[0];
  const community = communityRes.rows[0];
  const votes = votesRes.rows;

  return {
    id: postRow.id,
    title: postRow.title,
    content: postRow.content,
    type: postRow.type,
    url: postRow.url,
    imageUrl: postRow.image_url,
    createdAt: postRow.created_at,
    updatedAt: postRow.updated_at,
    author: author ? mapUser(author) : null,
    community: community ? { id: community.id, name: community.name, icon: community.icon } : null,
    upvotes: votes.filter((v: any) => v.type === "UP").length,
    downvotes: votes.filter((v: any) => v.type === "DOWN").length,
    votes: votes.map((v: any) => ({ userId: v.user_id, postId: v.post_id, type: v.type })),
    _count: { comments: parseInt(commentsRes.rows[0].count, 10) }
  };
};

const dataStore = {
  post: {
    findMany: async () => {
      await initSchema();
      const res = await pool.query("SELECT * FROM app_posts ORDER BY created_at DESC");
      return Promise.all(res.rows.map(hydratePost));
    },
    findUnique: async (args: any) => {
      await initSchema();
      const res = await pool.query("SELECT * FROM app_posts WHERE id = $1", [args?.where?.id]);
      if (res.rows.length === 0) return null;
      return hydratePost(res.rows[0]);
    },
    create: async (args: { data: any }) => {
      await initSchema();
      const { title, content, type, url, imageUrl, communityId, authorId } = args.data;
      const id = randomUUID();
      const createdAt = new Date().toISOString();
      
      const res = await pool.query(
        `INSERT INTO app_posts (id, title, content, type, url, image_url, created_at, author_id, community_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [id, title, content || "", type || "TEXT", url, imageUrl, createdAt, authorId, communityId]
      );
      
      return hydratePost(res.rows[0]);
    },
    update: async (args: { where: { id: string }, data: any }) => {
      await initSchema();
      const { title, content, type, url, imageUrl } = args.data;
      const updatedAt = new Date().toISOString();
      
      const res = await pool.query(
        `UPDATE app_posts SET 
          title = COALESCE($1, title),
          content = COALESCE($2, content),
          type = COALESCE($3, type),
          url = COALESCE($4, url),
          image_url = COALESCE($5, image_url),
          updated_at = $6
         WHERE id = $7 RETURNING *`,
        [title, content, type, url, imageUrl, updatedAt, args.where.id]
      );
      
      if (res.rows.length === 0) return null;
      return hydratePost(res.rows[0]);
    },
    delete: async (args: { where: { id: string } }) => {
      await initSchema();
      const res = await pool.query("DELETE FROM app_posts WHERE id = $1 RETURNING *", [args.where.id]);
      if (res.rows.length === 0) return null;
      return hydratePost(res.rows[0]);
    }
  },
  
  comment: {
    findMany: async (args: { where: { postId: string } }) => {
      await initSchema();
      const res = await pool.query("SELECT * FROM app_comments WHERE post_id = $1 ORDER BY created_at ASC", [args.where.postId]);
      
      return Promise.all(res.rows.map(async (row: any) => {
        const authorRes = await pool.query("SELECT * FROM app_users WHERE id = $1", [row.author_id]);
        return {
          id: row.id,
          postId: row.post_id,
          content: row.content,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          author: authorRes.rows[0] ? mapUser(authorRes.rows[0]) : null
        };
      }));
    },
    create: async (args: { data: { postId: string, content: string, authorId: string } }) => {
      await initSchema();
      const id = randomUUID();
      const createdAt = new Date().toISOString();
      const res = await pool.query(
        "INSERT INTO app_comments (id, post_id, content, created_at, author_id) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [id, args.data.postId, args.data.content, createdAt, args.data.authorId]
      );
      
      const authorRes = await pool.query("SELECT * FROM app_users WHERE id = $1", [args.data.authorId]);
      
      return {
        id: res.rows[0].id,
        postId: res.rows[0].post_id,
        content: res.rows[0].content,
        createdAt: res.rows[0].created_at,
        updatedAt: res.rows[0].updated_at,
        author: authorRes.rows[0] ? mapUser(authorRes.rows[0]) : null
      };
    },
    delete: async (args: { where: { id: string } }) => {
      await initSchema();
      const res = await pool.query("DELETE FROM app_comments WHERE id = $1 RETURNING *", [args.where.id]);
      if (res.rows.length === 0) return null;
      return { id: res.rows[0].id, postId: res.rows[0].post_id, content: res.rows[0].content };
    }
  },
  
  community: {
    findUnique: async (args: any) => {
      await initSchema();
      const where = args?.where;
      const res = await pool.query(
        "SELECT * FROM app_communities WHERE id = $1 OR LOWER(name) = LOWER($2)",
        [where?.id, where?.name]
      );
      
      if (res.rows.length === 0) return null;
      const community = res.rows[0];
      
      const postsRes = await pool.query("SELECT * FROM app_posts WHERE community_id = $1 ORDER BY created_at DESC", [community.id]);
      const posts = await Promise.all(postsRes.rows.map(hydratePost));
      
      return {
        id: community.id,
        name: community.name,
        description: community.description,
        createdAt: community.created_at,
        members: community.members,
        icon: community.icon,
        posts,
        _count: { posts: posts.length }
      };
    },
    findMany: async () => {
      await initSchema();
      const res = await pool.query("SELECT * FROM app_communities");
      
      return Promise.all(res.rows.map(async (row: any) => {
        const postsCountRes = await pool.query("SELECT COUNT(*) as count FROM app_posts WHERE community_id = $1", [row.id]);
        return {
          id: row.id,
          name: row.name,
          description: row.description,
          createdAt: row.created_at,
          members: row.members,
          icon: row.icon,
          _count: { posts: parseInt(postsCountRes.rows[0].count, 10) }
        };
      }));
    }
  },
  
  user: {
    findByUsername: async (username: string) => {
      await initSchema();
      const res = await pool.query("SELECT * FROM app_users WHERE LOWER(username) = LOWER($1)", [username]);
      return res.rows[0] ? res.rows[0] : null;
    },
    getPublicByUsername: async (username: string) => {
      await initSchema();
      const res = await pool.query("SELECT * FROM app_users WHERE LOWER(username) = LOWER($1)", [username]);
      return res.rows[0] ? mapUser(res.rows[0]) : null;
    }
  },
  
  auth: {
    getOrCreateGuestUser: async () => {
      await initSchema();
      let res = await pool.query("SELECT * FROM app_users WHERE username = 'guest'");
      
      if (res.rows.length === 0) {
        const id = randomUUID();
        res = await pool.query(
          `INSERT INTO app_users (id, username, email, password, image, bio) 
           VALUES ($1, 'guest', 'guest@example.com', 'guest', 'https://api.dicebear.com/7.x/avataaars/svg?seed=guest', 'Guest user') RETURNING *`,
          [id]
        );
      }
      return mapUser(res.rows[0]);
    },
    login: async (email: string, password: string) => {
      await initSchema();
      const res = await pool.query("SELECT * FROM app_users WHERE LOWER(email) = LOWER($1)", [email]);
      const user = res.rows[0];
      
      if (!user || user.password !== password) return null;
      
      const token = `${user.id}.${randomUUID()}`;
      await pool.query("INSERT INTO app_sessions (token, user_id) VALUES ($1, $2)", [token, user.id]);
      
      return { token, user: mapUser(user) };
    },
    register: async (username: string, email: string, password: string) => {
      await initSchema();
      const checkRes = await pool.query("SELECT id FROM app_users WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($2)", [email, username]);
      if (checkRes.rows.length > 0) return null;
      
      const id = randomUUID();
      const image = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`;
      
      const res = await pool.query(
        "INSERT INTO app_users (id, username, email, password, image, bio) VALUES ($1, $2, $3, $4, $5, '') RETURNING *",
        [id, username, email, password, image]
      );
      
      const token = `${id}.${randomUUID()}`;
      await pool.query("INSERT INTO app_sessions (token, user_id) VALUES ($1, $2)", [token, id]);
      
      return { token, user: mapUser(res.rows[0]) };
    },
    getUserFromToken: async (token: string) => {
      await initSchema();
      const sessionRes = await pool.query("SELECT user_id FROM app_sessions WHERE token = $1", [token]);
      if (sessionRes.rows.length === 0) return null;
      
      const userRes = await pool.query("SELECT * FROM app_users WHERE id = $1", [sessionRes.rows[0].user_id]);
      return userRes.rows[0] ? mapUser(userRes.rows[0]) : null;
    },
    logout: async (token: string) => {
      await initSchema();
      await pool.query("DELETE FROM app_sessions WHERE token = $1", [token]);
    }
  },
  
  vote: {
    findUnique: async (args: any) => {
      await initSchema();
      const { userId, postId } = args.where.userId_postId;
      const res = await pool.query("SELECT * FROM app_votes WHERE user_id = $1 AND post_id = $2", [userId, postId]);
      if (res.rows.length === 0) return null;
      return { userId: res.rows[0].user_id, postId: res.rows[0].post_id, type: res.rows[0].type };
    },
    create: async (args: any) => {
      await initSchema();
      const { userId, postId, type } = args.data;
      await pool.query("INSERT INTO app_votes (user_id, post_id, type) VALUES ($1, $2, $3)", [userId, postId, type]);
      return args.data;
    },
    update: async (args: any) => {
      await initSchema();
      const { userId, postId } = args.where.userId_postId;
      const { type } = args.data;
      const res = await pool.query("UPDATE app_votes SET type = $1 WHERE user_id = $2 AND post_id = $3 RETURNING *", [type, userId, postId]);
      if (res.rows.length === 0) return null;
      return { userId: res.rows[0].user_id, postId: res.rows[0].post_id, type: res.rows[0].type };
    },
    delete: async (args: any) => {
      await initSchema();
      const { userId, postId } = args.where.userId_postId;
      const res = await pool.query("DELETE FROM app_votes WHERE user_id = $1 AND post_id = $2 RETURNING *", [userId, postId]);
      if (res.rows.length === 0) return null;
      return { userId: res.rows[0].user_id, postId: res.rows[0].post_id, type: res.rows[0].type };
    },
    toggle: async (args: { userId: string, postId: string, type: VoteType }) => {
      await initSchema();
      const { userId, postId, type } = args;
      
      const existingRes = await pool.query("SELECT type FROM app_votes WHERE user_id = $1 AND post_id = $2", [userId, postId]);
      let userVote: VoteType | null = type;
      
      if (existingRes.rows.length > 0) {
        if (existingRes.rows[0].type === type) {
          await pool.query("DELETE FROM app_votes WHERE user_id = $1 AND post_id = $2", [userId, postId]);
          userVote = null;
        } else {
          await pool.query("UPDATE app_votes SET type = $1 WHERE user_id = $2 AND post_id = $3", [type, userId, postId]);
        }
      } else {
        await pool.query("INSERT INTO app_votes (user_id, post_id, type) VALUES ($1, $2, $3)", [userId, postId, type]);
      }
      
      const postRes = await pool.query("SELECT * FROM app_posts WHERE id = $1", [postId]);
      if (postRes.rows.length === 0) return null;
      
      const updatedPost = await hydratePost(postRes.rows[0]);
      return {
        post: updatedPost,
        userVote,
        score: updatedPost.upvotes - updatedPost.downvotes
      };
    }
  }
};

export default dataStore;
