import { randomUUID } from "node:crypto";
const { Pool } = require("pg");

type QueryArgs = Record<string, unknown>;
type VoteType = "UP" | "DOWN";
type PostType = "TEXT" | "IMAGE" | "LINK";
type ReactionType = "LIKE" | "LOVE" | "CARE" | "HAHA" | "WOW" | "SAD" | "ANGRY";

const getPostgresUrl = () => {
  const url =
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    "";
  return /^postgres(ql)?:\/\//i.test(url) ? url : null;
};

const shouldUsePostgresSsl = (url: string) => {
  if (process.env.POSTGRES_SSL === "false") return false;
  if (process.env.POSTGRES_SSL === "true") return true;
  return Boolean(process.env.VERCEL) || !/localhost|127\.0\.0\.1/i.test(url);
};

let poolInstance: any = null;

const getPool = () => {
  const connectionString = getPostgresUrl();

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL or POSTGRES_URL environment variable is missing. Please set it in your .env file."
    );
  }

  if (!poolInstance) {
    poolInstance = new Pool({
      connectionString,
      max: process.env.VERCEL ? 3 : 15,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
      ssl: shouldUsePostgresSsl(connectionString)
        ? { rejectUnauthorized: false }
        : undefined,
    });
  }

  return poolInstance;
};

const pool = {
  query: (...args: any[]) => getPool().query(...args),
};

let schemaInitialized = false;

const initSchema = async () => {
  if (schemaInitialized) return;
  schemaInitialized = true;
  try {
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
  
  // Safe Alter tables for new Facebook-style features
  await pool.query(`
    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS cover_photo TEXT;
    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS employment TEXT;
    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS education TEXT;
    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS location TEXT;
    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS life_events JSONB DEFAULT '[]';
    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS featured_photos JSONB DEFAULT '[]';
    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

    ALTER TABLE app_posts ADD COLUMN IF NOT EXISTS privacy TEXT DEFAULT 'PUBLIC';
    ALTER TABLE app_posts ADD COLUMN IF NOT EXISTS privacy_exceptions JSONB DEFAULT '[]';
    ALTER TABLE app_posts ADD COLUMN IF NOT EXISTS privacy_list_id TEXT;
    ALTER TABLE app_posts ADD COLUMN IF NOT EXISTS feeling_activity TEXT;
    ALTER TABLE app_posts ADD COLUMN IF NOT EXISTS location_tag TEXT;
    ALTER TABLE app_posts ADD COLUMN IF NOT EXISTS bg_color_card TEXT;
    ALTER TABLE app_posts ADD COLUMN IF NOT EXISTS media_urls JSONB DEFAULT '[]';
    ALTER TABLE app_posts ADD COLUMN IF NOT EXISTS poll_data JSONB;
    ALTER TABLE app_posts ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT FALSE;
    ALTER TABLE app_posts ADD COLUMN IF NOT EXISTS shared_from_id TEXT REFERENCES app_posts(id) ON DELETE SET NULL;

    ALTER TABLE app_comments ADD COLUMN IF NOT EXISTS parent_id TEXT REFERENCES app_comments(id) ON DELETE CASCADE;
    ALTER TABLE app_comments ADD COLUMN IF NOT EXISTS media_url TEXT;
    ALTER TABLE app_comments ADD COLUMN IF NOT EXISTS gif_url TEXT;

    CREATE TABLE IF NOT EXISTS app_friendships (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      receiver_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TEXT NOT NULL,
      UNIQUE(sender_id, receiver_id)
    );

    CREATE TABLE IF NOT EXISTS app_follows (
      follower_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      following_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      PRIMARY KEY (follower_id, following_id)
    );

    CREATE TABLE IF NOT EXISTS app_blocks (
      blocker_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      blocked_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      PRIMARY KEY (blocker_id, blocked_id)
    );

    CREATE TABLE IF NOT EXISTS app_snoozes (
      user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      target_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      until TEXT NOT NULL,
      PRIMARY KEY (user_id, target_id)
    );

    CREATE TABLE IF NOT EXISTS app_custom_lists (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      member_ids JSONB DEFAULT '[]',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_reactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      post_id TEXT REFERENCES app_posts(id) ON DELETE CASCADE,
      comment_id TEXT REFERENCES app_comments(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, post_id, comment_id)
    );

    CREATE TABLE IF NOT EXISTS app_pages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      description TEXT,
      cover_photo TEXT,
      avatar TEXT,
      owner_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      followers INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_marketplace_items (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      price NUMERIC NOT NULL,
      location TEXT NOT NULL,
      category TEXT NOT NULL,
      condition TEXT DEFAULT 'New',
      image_urls JSONB DEFAULT '[]',
      seller_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'AVAILABLE',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_conversations (
      id TEXT PRIMARY KEY,
      is_group BOOLEAN NOT NULL DEFAULT FALSE,
      name TEXT,
      admin_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_conversation_participants (
      conversation_id TEXT NOT NULL REFERENCES app_conversations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      PRIMARY KEY (conversation_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS app_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES app_conversations(id) ON DELETE CASCADE,
      sender_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      content TEXT,
      media_url TEXT,
      voice_note_url TEXT,
      created_at TEXT NOT NULL,
      reactions JSONB DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS app_notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      actor_id TEXT REFERENCES app_users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      link TEXT,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_reports (
      id TEXT PRIMARY KEY,
      reporter_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TEXT NOT NULL
    );
  `);

  // Safe Alter tables for messaging features (files, unsend, edit, admin)
  await pool.query(`
    ALTER TABLE app_conversations ADD COLUMN IF NOT EXISTS admin_id TEXT;
    ALTER TABLE app_messages ADD COLUMN IF NOT EXISTS file_url TEXT;
    ALTER TABLE app_messages ADD COLUMN IF NOT EXISTS file_name TEXT;
    ALTER TABLE app_messages ADD COLUMN IF NOT EXISTS file_type TEXT;
    ALTER TABLE app_messages ADD COLUMN IF NOT EXISTS file_size BIGINT;
    ALTER TABLE app_messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
    ALTER TABLE app_messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;
    ALTER TABLE app_messages ADD COLUMN IF NOT EXISTS edited_at TEXT;
  `);

  // Purge any fake default communities as requested by user
  await pool.query("DELETE FROM app_communities WHERE name IN ('programming', 'nextjs', 'webdev')");

  // Keep a destination available for the composer even before users create groups.
  await pool.query(
    `INSERT INTO app_communities (id, name, description, created_at, members, icon)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO NOTHING`,
    ["socialpulse-general", "general", "The public SocialPulse feed.", new Date().toISOString(), 1, "🌿"]
  );


  // Seed sample public Creator Page if empty
  const pagesCount = await pool.query("SELECT id FROM app_pages LIMIT 1");
  if (pagesCount.rowCount === 0) {
    let guestRes = await pool.query("SELECT * FROM app_users WHERE username = 'guest'");
    if (guestRes.rows.length === 0) {
      const id = randomUUID();
      guestRes = await pool.query(
        `INSERT INTO app_users (id, username, email, password, image, bio, role) 
         VALUES ($1, 'guest', 'guest@example.com', 'guest', 'https://api.dicebear.com/7.x/avataaars/svg?seed=guest', 'Guest user', 'admin') RETURNING *`,
        [id]
      );
    }
    const guestId = guestRes.rows[0]?.id || "guest-1";
    await pool.query(
      "INSERT INTO app_pages (id, name, category, description, cover_photo, avatar, owner_id, followers, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT DO NOTHING",
      ["page-1", "Next.js Developers", "Tech & Gaming", "The official public page for Next.js full-stack developers and enthusiasts.", "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80", "https://api.dicebear.com/7.x/initials/svg?seed=nextjs&backgroundColor=000000", guestId, 1250, new Date().toISOString()]
    );
  }
  } catch (error) {
    schemaInitialized = false;
    throw error;
  }
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
  coverPhoto: row.cover_photo || null,
  employment: row.employment || null,
  education: row.education || null,
  location: row.location || null,
  lifeEvents: typeof row.life_events === "string" ? JSON.parse(row.life_events) : (row.life_events || []),
  featuredPhotos: typeof row.featured_photos === "string" ? JSON.parse(row.featured_photos) : (row.featured_photos || []),
  role: row.role || "user",
});

const batchFetchUsers = async (userIds: string[]) => {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueIds.length === 0) return new Map<string, any>();
  const res = await pool.query("SELECT * FROM app_users WHERE id = ANY($1)", [uniqueIds]);
  return new Map<string, any>(res.rows.map((u: any) => [u.id, mapUser(u)]));
};

const hydratePosts = async (postRows: any[]) => {
  if (!postRows || postRows.length === 0) return [];
  const authorIds = Array.from(new Set(postRows.map(p => p.author_id).filter(Boolean)));
  const communityIds = Array.from(new Set(postRows.map(p => p.community_id).filter(Boolean)));
  const postIds = Array.from(new Set(postRows.map(p => p.id).filter(Boolean)));

  const [authorRes, communityRes, votesRes, commentsRes, reactionsRes] = await Promise.all([
    authorIds.length > 0 ? pool.query("SELECT * FROM app_users WHERE id = ANY($1)", [authorIds]) : { rows: [] },
    communityIds.length > 0 ? pool.query("SELECT * FROM app_communities WHERE id = ANY($1)", [communityIds]) : { rows: [] },
    postIds.length > 0 ? pool.query("SELECT * FROM app_votes WHERE post_id = ANY($1)", [postIds]) : { rows: [] },
    postIds.length > 0 ? pool.query("SELECT post_id, COUNT(*) as count FROM app_comments WHERE post_id = ANY($1) GROUP BY post_id", [postIds]) : { rows: [] },
    postIds.length > 0 ? pool.query("SELECT * FROM app_reactions WHERE post_id = ANY($1)", [postIds]) : { rows: [] }
  ]);

  const authorsMap = new Map<string, any>(authorRes.rows.map((u: any) => [u.id, mapUser(u)]));
  const communitiesMap = new Map<string, any>(communityRes.rows.map((c: any) => [c.id, { id: c.id, name: c.name, icon: c.icon }]));
  const votesByPost = new Map<string, any[]>();
  votesRes.rows.forEach((v: any) => {
    const list = votesByPost.get(v.post_id) || [];
    list.push(v);
    votesByPost.set(v.post_id, list);
  });
  const commentsCountByPost = new Map<string, number>(commentsRes.rows.map((c: any) => [c.post_id, parseInt(c.count, 10) || 0]));
  const reactionsByPost = new Map<string, any[]>();
  reactionsRes.rows.forEach((r: any) => {
    const list = reactionsByPost.get(r.post_id) || [];
    list.push(r);
    reactionsByPost.set(r.post_id, list);
  });

  return postRows.map((postRow: any) => {
    const author = authorsMap.get(postRow.author_id) || null;
    const community = communitiesMap.get(postRow.community_id) || null;
    const votes = votesByPost.get(postRow.id) || [];
    const reactions = reactionsByPost.get(postRow.id) || [];

    const reactionCounts: Record<string, number> = {
      LIKE: 0, LOVE: 0, CARE: 0, HAHA: 0, WOW: 0, SAD: 0, ANGRY: 0
    };
    reactions.forEach((r: any) => {
      if (reactionCounts[r.type] !== undefined) {
        reactionCounts[r.type]++;
      } else {
        reactionCounts[r.type] = 1;
      }
    });

    return {
      id: postRow.id,
      title: postRow.title,
      content: postRow.content,
      type: postRow.type,
      url: postRow.url,
      imageUrl: postRow.image_url,
      createdAt: postRow.created_at,
      updatedAt: postRow.updated_at,
      author: author as any,
      community: community as any,
      upvotes: votes.filter((v: any) => v.type === "UP").length,
      downvotes: votes.filter((v: any) => v.type === "DOWN").length,
      votes: votes.map((v: any) => ({ userId: v.user_id, postId: v.post_id, type: v.type })),
      reactions: reactions.map((r: any) => ({ id: r.id, userId: r.user_id, postId: r.post_id, type: r.type })),
      reactionCounts,
      privacy: postRow.privacy || "PUBLIC",
      privacyExceptions: typeof postRow.privacy_exceptions === "string" ? JSON.parse(postRow.privacy_exceptions) : (postRow.privacy_exceptions || []),
      privacyListId: postRow.privacy_list_id || null,
      feelingActivity: postRow.feeling_activity || null,
      locationTag: postRow.location_tag || null,
      bgColorCard: postRow.bg_color_card || null,
      mediaUrls: typeof postRow.media_urls === "string" ? JSON.parse(postRow.media_urls) : (postRow.media_urls || []),
      pollData: typeof postRow.poll_data === "string" ? JSON.parse(postRow.poll_data) : (postRow.poll_data || null),
      isLive: Boolean(postRow.is_live),
      sharedFromId: postRow.shared_from_id || null,
      _count: { comments: commentsCountByPost.get(postRow.id) || 0 }
    };
  });
};

const hydratePost = async (postRow: any) => {
  if (!postRow) return null;
  const res = await hydratePosts([postRow]);
  return res[0] || null;
};

const dataStore = {
  post: {
    findMany: async (args?: any) => {
      await initSchema();
      const res = await pool.query("SELECT * FROM app_posts ORDER BY created_at DESC LIMIT 50");
      return hydratePosts(res.rows);
    },
    findUnique: async (args: any) => {
      await initSchema();
      const res = await pool.query("SELECT * FROM app_posts WHERE id = $1", [args?.where?.id]);
      if (res.rows.length === 0) return null;
      return hydratePost(res.rows[0]);
    },
    create: async (args: { data: any }) => {
      await initSchema();
      const {
        title, content, type, url, imageUrl, communityId, authorId,
        privacy, privacyExceptions, privacyListId, feelingActivity, locationTag,
        bgColorCard, mediaUrls, pollData, isLive, sharedFromId
      } = args.data;
      const id = randomUUID();
      const createdAt = new Date().toISOString();
      
      const res = await pool.query(
        `INSERT INTO app_posts (
          id, title, content, type, url, image_url, created_at, author_id, community_id,
          privacy, privacy_exceptions, privacy_list_id, feeling_activity, location_tag,
          bg_color_card, media_urls, poll_data, is_live, shared_from_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) RETURNING *`,
        [
          id, title, content || "", type || "TEXT", url || null, imageUrl || null, createdAt, authorId, communityId,
          privacy || "PUBLIC", JSON.stringify(privacyExceptions || []), privacyListId || null,
          feelingActivity || null, locationTag || null, bgColorCard || null,
          JSON.stringify(mediaUrls || []), pollData ? JSON.stringify(pollData) : null,
          Boolean(isLive), sharedFromId || null
        ]
      );
      
      return hydratePost(res.rows[0]);
    },
    update: async (args: { where: { id: string }, data: any }) => {
      await initSchema();
      const { title, content, type, url, imageUrl, privacy, feelingActivity, locationTag, bgColorCard, pollData } = args.data;
      const updatedAt = new Date().toISOString();
      
      const res = await pool.query(
        `UPDATE app_posts SET 
          title = COALESCE($1, title),
          content = COALESCE($2, content),
          type = COALESCE($3, type),
          url = COALESCE($4, url),
          image_url = COALESCE($5, image_url),
          privacy = COALESCE($6, privacy),
          feeling_activity = COALESCE($7, feeling_activity),
          location_tag = COALESCE($8, location_tag),
          bg_color_card = COALESCE($9, bg_color_card),
          poll_data = COALESCE($10, poll_data),
          updated_at = $11
         WHERE id = $12 RETURNING *`,
        [
          title, content, type, url, imageUrl, privacy, feelingActivity,
          locationTag, bgColorCard, pollData ? JSON.stringify(pollData) : null,
          updatedAt, args.where.id
        ]
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
      if (res.rows.length === 0) return [];

      const authorIds = res.rows.map(r => r.author_id);
      const commentIds = res.rows.map(r => r.id);
      const [authorsMap, reactionsRes] = await Promise.all([
        batchFetchUsers(authorIds),
        commentIds.length > 0 ? pool.query("SELECT * FROM app_reactions WHERE comment_id = ANY($1)", [commentIds]) : { rows: [] }
      ]);

      const reactionsByComment = new Map<string, any[]>();
      reactionsRes.rows.forEach((r: any) => {
        const list = reactionsByComment.get(r.comment_id) || [];
        list.push(r);
        reactionsByComment.set(r.comment_id, list);
      });

      return res.rows.map((row: any) => {
        const reactions = reactionsByComment.get(row.id) || [];
        const reactionCounts: Record<string, number> = { LIKE: 0, LOVE: 0, HAHA: 0, WOW: 0, SAD: 0, ANGRY: 0 };
        reactions.forEach((r: any) => {
          reactionCounts[r.type] = (reactionCounts[r.type] || 0) + 1;
        });

        return {
          id: row.id,
          postId: row.post_id,
          parentId: row.parent_id || null,
          content: row.content,
          mediaUrl: row.media_url || null,
          gifUrl: row.gif_url || null,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          author: authorsMap.get(row.author_id) || null,
          reactions: reactions.map((r: any) => ({ id: r.id, userId: r.user_id, type: r.type })),
          reactionCounts
        };
      });
    },
    create: async (args: { data: { postId: string, content: string, authorId: string, parentId?: string, mediaUrl?: string, gifUrl?: string } }) => {
      await initSchema();
      const id = randomUUID();
      const createdAt = new Date().toISOString();
      const res = await pool.query(
        "INSERT INTO app_comments (id, post_id, content, created_at, author_id, parent_id, media_url, gif_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
        [id, args.data.postId, args.data.content, createdAt, args.data.authorId, args.data.parentId || null, args.data.mediaUrl || null, args.data.gifUrl || null]
      );
      
      const authorRes = await pool.query("SELECT * FROM app_users WHERE id = $1", [args.data.authorId]);
      
      return {
        id: res.rows[0].id,
        postId: res.rows[0].post_id,
        parentId: res.rows[0].parent_id || null,
        content: res.rows[0].content,
        mediaUrl: res.rows[0].media_url || null,
        gifUrl: res.rows[0].gif_url || null,
        createdAt: res.rows[0].created_at,
        updatedAt: res.rows[0].updated_at,
        author: authorRes.rows[0] ? mapUser(authorRes.rows[0]) : null,
        reactions: [],
        reactionCounts: { LIKE: 0, LOVE: 0, HAHA: 0, WOW: 0, SAD: 0, ANGRY: 0 }
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
      const posts = await hydratePosts(postsRes.rows);
      
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
    findMany: async (args?: any) => {
      await initSchema();
      const [commsRes, countsRes] = await Promise.all([
        pool.query("SELECT * FROM app_communities"),
        pool.query("SELECT community_id, COUNT(*) as count FROM app_posts GROUP BY community_id")
      ]);
      const countMap = new Map(countsRes.rows.map((r: any) => [r.community_id, parseInt(r.count, 10) || 0]));
      
      return commsRes.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        createdAt: row.created_at,
        members: row.members,
        icon: row.icon,
        _count: { posts: countMap.get(row.id) || 0 }
      }));
    }
  },
  
  user: {
    findByUsername: async (username: string) => {
      await initSchema();
      const res = await pool.query("SELECT * FROM app_users WHERE LOWER(username) = LOWER($1)", [username]);
      return res.rows[0] ? mapUser(res.rows[0]) : null;
    },
    getPublicByUsername: async (username: string) => {
      await initSchema();
      const res = await pool.query("SELECT * FROM app_users WHERE LOWER(username) = LOWER($1)", [username]);
      return res.rows[0] ? mapUser(res.rows[0]) : null;
    },
    findById: async (id: string) => {
      await initSchema();
      const res = await pool.query("SELECT * FROM app_users WHERE id = $1", [id]);
      return res.rows[0] ? mapUser(res.rows[0]) : null;
    },
    findMany: async () => {
      await initSchema();
      const res = await pool.query("SELECT * FROM app_users ORDER BY username ASC LIMIT 50");
      return res.rows.map(mapUser);
    },
    updateProfile: async (id: string, data: any) => {
      await initSchema();
      const { bio, coverPhoto, employment, education, location, lifeEvents, featuredPhotos, image } = data;
      const res = await pool.query(
        `UPDATE app_users SET
          bio = COALESCE($1, bio),
          cover_photo = COALESCE($2, cover_photo),
          employment = COALESCE($3, employment),
          education = COALESCE($4, education),
          location = COALESCE($5, location),
          life_events = COALESCE($6, life_events),
          featured_photos = COALESCE($7, featured_photos),
          image = COALESCE($8, image)
         WHERE id = $9 RETURNING *`,
        [
          bio, coverPhoto, employment, education, location,
          lifeEvents ? JSON.stringify(lifeEvents) : null,
          featuredPhotos ? JSON.stringify(featuredPhotos) : null,
          image, id
        ]
      );
      return res.rows[0] ? mapUser(res.rows[0]) : null;
    }
  },

  relationships: {
    getStatus: async (userId1: string, userId2: string) => {
      await initSchema();
      if (userId1 === userId2) return { isSelf: true };
      
      const [friendRes, followRes, blockRes, snoozeRes] = await Promise.all([
        pool.query("SELECT * FROM app_friendships WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)", [userId1, userId2]),
        pool.query("SELECT * FROM app_follows WHERE follower_id = $1 AND following_id = $2", [userId1, userId2]),
        pool.query("SELECT * FROM app_blocks WHERE blocker_id = $1 AND blocked_id = $2", [userId1, userId2]),
        pool.query("SELECT * FROM app_snoozes WHERE user_id = $1 AND target_id = $2 AND until > $3", [userId1, userId2, new Date().toISOString()])
      ]);

      const friendship = friendRes.rows[0];
      return {
        isSelf: false,
        friendStatus: friendship ? friendship.status : null,
        isSender: friendship ? friendship.sender_id === userId1 : false,
        friendshipId: friendship ? friendship.id : null,
        isFollowing: followRes.rows.length > 0,
        isBlocked: blockRes.rows.length > 0,
        isSnoozed: snoozeRes.rows.length > 0
      };
    },
    getFriends: async (userId: string) => {
      await initSchema();
      const res = await pool.query(
        `SELECT u.* FROM app_users u
         JOIN app_friendships f ON (f.sender_id = u.id OR f.receiver_id = u.id)
         WHERE (f.sender_id = $1 OR f.receiver_id = $1) AND u.id != $1 AND f.status = 'ACCEPTED'`,
        [userId]
      );
      return res.rows.map(mapUser);
    },
    getPendingRequests: async (userId: string) => {
      await initSchema();
      const res = await pool.query(
        `SELECT f.id as request_id, u.* FROM app_users u
         JOIN app_friendships f ON f.sender_id = u.id
         WHERE f.receiver_id = $1 AND f.status = 'PENDING'`,
        [userId]
      );
      return res.rows.map((row: any) => ({ requestId: row.request_id, user: mapUser(row) }));
    },
    sendFriendRequest: async (senderId: string, receiverId: string) => {
      await initSchema();
      const id = randomUUID();
      const createdAt = new Date().toISOString();
      await pool.query(
        "INSERT INTO app_friendships (id, sender_id, receiver_id, status, created_at) VALUES ($1, $2, $3, 'PENDING', $4) ON CONFLICT (sender_id, receiver_id) DO NOTHING",
        [id, senderId, receiverId, createdAt]
      );
      // Auto-create notification
      await dataStore.notification.create({
        userId: receiverId,
        actorId: senderId,
        type: "FRIEND_REQUEST",
        content: "sent you a friend request.",
        link: "/friends"
      });
      return { success: true };
    },
    respondFriendRequest: async (requestId: string, status: "ACCEPTED" | "REJECTED") => {
      await initSchema();
      if (status === "REJECTED") {
        await pool.query("DELETE FROM app_friendships WHERE id = $1", [requestId]);
      } else {
        await pool.query("UPDATE app_friendships SET status = 'ACCEPTED' WHERE id = $1", [requestId]);
      }
      return { success: true };
    },
    unfriend: async (userId1: string, userId2: string) => {
      await initSchema();
      await pool.query("DELETE FROM app_friendships WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)", [userId1, userId2]);
      return { success: true };
    },
    toggleFollow: async (followerId: string, followingId: string) => {
      await initSchema();
      const check = await pool.query("SELECT * FROM app_follows WHERE follower_id = $1 AND following_id = $2", [followerId, followingId]);
      if (check.rows.length > 0) {
        await pool.query("DELETE FROM app_follows WHERE follower_id = $1 AND following_id = $2", [followerId, followingId]);
        return { isFollowing: false };
      } else {
        await pool.query("INSERT INTO app_follows (follower_id, following_id, created_at) VALUES ($1, $2, $3)", [followerId, followingId, new Date().toISOString()]);
        await dataStore.notification.create({
          userId: followingId,
          actorId: followerId,
          type: "FOLLOW",
          content: "started following you.",
          link: `/u/${followerId}`
        });
        return { isFollowing: true };
      }
    },
    toggleBlock: async (blockerId: string, blockedId: string) => {
      await initSchema();
      const check = await pool.query("SELECT * FROM app_blocks WHERE blocker_id = $1 AND blocked_id = $2", [blockerId, blockedId]);
      if (check.rows.length > 0) {
        await pool.query("DELETE FROM app_blocks WHERE blocker_id = $1 AND blocked_id = $2", [blockerId, blockedId]);
        return { isBlocked: false };
      } else {
        await pool.query("INSERT INTO app_blocks (blocker_id, blocked_id, created_at) VALUES ($1, $2, $3)", [blockerId, blockedId, new Date().toISOString()]);
        // Also remove friendship or follows
        await pool.query("DELETE FROM app_friendships WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)", [blockerId, blockedId]);
        await pool.query("DELETE FROM app_follows WHERE (follower_id = $1 AND following_id = $2) OR (follower_id = $2 AND following_id = $1)", [blockerId, blockedId]);
        return { isBlocked: true };
      }
    },
    toggleSnooze: async (userId: string, targetId: string) => {
      await initSchema();
      const check = await pool.query("SELECT * FROM app_snoozes WHERE user_id = $1 AND target_id = $2", [userId, targetId]);
      if (check.rows.length > 0) {
        await pool.query("DELETE FROM app_snoozes WHERE user_id = $1 AND target_id = $2", [userId, targetId]);
        return { isSnoozed: false };
      } else {
        const until = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        await pool.query("INSERT INTO app_snoozes (user_id, target_id, until) VALUES ($1, $2, $3)", [userId, targetId, until]);
        return { isSnoozed: true, until };
      }
    }
  },

  lists: {
    findMany: async (userId: string) => {
      await initSchema();
      const res = await pool.query("SELECT * FROM app_custom_lists WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
      return res.rows.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        memberIds: typeof row.member_ids === "string" ? JSON.parse(row.member_ids) : (row.member_ids || [])
      }));
    },
    create: async (userId: string, name: string, memberIds: string[]) => {
      await initSchema();
      const id = randomUUID();
      const createdAt = new Date().toISOString();
      await pool.query(
        "INSERT INTO app_custom_lists (id, user_id, name, member_ids, created_at) VALUES ($1, $2, $3, $4, $5)",
        [id, userId, name, JSON.stringify(memberIds), createdAt]
      );
      return { id, userId, name, memberIds };
    }
  },
  
  reaction: {
    toggle: async (args: { userId: string, postId?: string, commentId?: string, type: ReactionType }) => {
      await initSchema();
      const { userId, postId, commentId, type } = args;
      
      const whereClause = postId ? "user_id = $1 AND post_id = $2" : "user_id = $1 AND comment_id = $2";
      const targetId = postId || commentId;
      
      const existingRes = await pool.query(`SELECT type FROM app_reactions WHERE ${whereClause}`, [userId, targetId]);
      let userReaction: ReactionType | null = type;
      
      if (existingRes.rows.length > 0) {
        if (existingRes.rows[0].type === type) {
          await pool.query(`DELETE FROM app_reactions WHERE ${whereClause}`, [userId, targetId]);
          userReaction = null;
        } else {
          await pool.query(`UPDATE app_reactions SET type = $1 WHERE ${whereClause.replace("$1", "$2").replace("$2", "$3")}`, [type, userId, targetId]);
        }
      } else {
        const id = randomUUID();
        if (postId) {
          await pool.query("INSERT INTO app_reactions (id, user_id, post_id, type, created_at) VALUES ($1, $2, $3, $4, $5)", [id, userId, postId, type, new Date().toISOString()]);
        } else {
          await pool.query("INSERT INTO app_reactions (id, user_id, comment_id, type, created_at) VALUES ($1, $2, $3, $4, $5)", [id, userId, commentId, type, new Date().toISOString()]);
        }
      }
      
      // Auto notification for post reactions
      if (postId && userReaction) {
        const postRes = await pool.query("SELECT author_id, title FROM app_posts WHERE id = $1", [postId]);
        if (postRes.rows[0] && postRes.rows[0].author_id !== userId) {
          await dataStore.notification.create({
            userId: postRes.rows[0].author_id,
            actorId: userId,
            type: "REACTION",
            content: `reacted with ${type} to your post: "${postRes.rows[0].title.slice(0, 25)}..."`,
            link: `/post/${postId}`
          });
        }
      }
      
      if (postId) {
        const postRes = await pool.query("SELECT * FROM app_posts WHERE id = $1", [postId]);
        const updatedPost = await hydratePost(postRes.rows[0]);
        return { post: updatedPost, userReaction };
      }
      return { userReaction };
    }
  },

  page: {
    findMany: async () => {
      await initSchema();
      const res = await pool.query("SELECT * FROM app_pages ORDER BY followers DESC");
      const ownersMap = await batchFetchUsers(res.rows.map((r: any) => r.owner_id));
      return res.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        category: row.category,
        description: row.description,
        coverPhoto: row.cover_photo,
        avatar: row.avatar,
        followers: row.followers,
        createdAt: row.created_at,
        owner: ownersMap.get(row.owner_id) || null
      }));
    },
    findUnique: async (id: string) => {
      await initSchema();
      const res = await pool.query("SELECT * FROM app_pages WHERE id = $1 OR LOWER(name) = LOWER($1)", [id]);
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      const ownerRes = await pool.query("SELECT * FROM app_users WHERE id = $1", [row.owner_id]);
      return {
        id: row.id,
        name: row.name,
        category: row.category,
        description: row.description,
        coverPhoto: row.cover_photo,
        avatar: row.avatar,
        followers: row.followers,
        createdAt: row.created_at,
        owner: ownerRes.rows[0] ? mapUser(ownerRes.rows[0]) : null
      };
    },
    create: async (data: any) => {
      await initSchema();
      const id = randomUUID();
      const createdAt = new Date().toISOString();
      const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.name)}&backgroundColor=000000`;
      const coverPhoto = data.coverPhoto || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80";
      await pool.query(
        "INSERT INTO app_pages (id, name, category, description, cover_photo, avatar, owner_id, followers, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [id, data.name, data.category || "General", data.description || "", coverPhoto, avatar, data.ownerId, 1, createdAt]
      );
      return dataStore.page.findUnique(id);
    }
  },

  marketplace: {
    findMany: async (args?: any) => {
      await initSchema();
      const res = await pool.query("SELECT * FROM app_marketplace_items WHERE status = 'AVAILABLE' ORDER BY created_at DESC LIMIT 50");
      const sellersMap = await batchFetchUsers(res.rows.map((r: any) => r.seller_id));
      return res.rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        price: Number(row.price),
        location: row.location,
        category: row.category,
        condition: row.condition,
        imageUrls: typeof row.image_urls === "string" ? JSON.parse(row.image_urls) : (row.image_urls || []),
        status: row.status,
        createdAt: row.created_at,
        seller: sellersMap.get(row.seller_id) || null
      }));
    },
    create: async (data: any) => {
      await initSchema();
      const id = randomUUID();
      const createdAt = new Date().toISOString();
      await pool.query(
        "INSERT INTO app_marketplace_items (id, title, description, price, location, category, condition, image_urls, seller_id, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'AVAILABLE', $10)",
        [id, data.title, data.description, Number(data.price), data.location || "Online", data.category || "General", data.condition || "New", JSON.stringify(data.imageUrls || []), data.sellerId, createdAt]
      );
      const sellerRes = await pool.query("SELECT * FROM app_users WHERE id = $1", [data.sellerId]);
      return {
        id,
        title: data.title,
        description: data.description,
        price: Number(data.price),
        location: data.location || "Online",
        category: data.category || "General",
        condition: data.condition || "New",
        imageUrls: data.imageUrls || [],
        status: "AVAILABLE",
        createdAt,
        seller: sellerRes.rows[0] ? mapUser(sellerRes.rows[0]) : null
      };
    }
  },

  messenger: {
    getConversations: async (userId: string) => {
      await initSchema();
      const res = await pool.query(
        `SELECT c.* FROM app_conversations c
         JOIN app_conversation_participants p ON p.conversation_id = c.id
         WHERE p.user_id = $1 ORDER BY c.created_at DESC`,
        [userId]
      );
      return Promise.all(res.rows.map(async (row: any) => {
        const partsRes = await pool.query(
          `SELECT u.* FROM app_users u
           JOIN app_conversation_participants p ON p.user_id = u.id
           WHERE p.conversation_id = $1`,
          [row.id]
        );
        const lastMsgRes = await pool.query("SELECT * FROM app_messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 1", [row.id]);
        return {
          id: row.id,
          isGroup: row.is_group,
          name: row.name,
          adminId: row.admin_id || null,
          createdAt: row.created_at,
          participants: partsRes.rows.map(mapUser),
          lastMessage: lastMsgRes.rows[0] ? {
            id: lastMsgRes.rows[0].id,
            content: lastMsgRes.rows[0].content,
            senderId: lastMsgRes.rows[0].sender_id,
            createdAt: lastMsgRes.rows[0].created_at
          } : null
        };
      }));
    },
    getMessages: async (conversationId: string) => {
      await initSchema();
      const res = await pool.query("SELECT * FROM app_messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT 100", [conversationId]);
      const sendersMap = await batchFetchUsers(res.rows.map((r: any) => r.sender_id));
      return res.rows.map((row: any) => ({
        id: row.id,
        conversationId: row.conversation_id,
        senderId: row.sender_id,
        content: row.content,
        mediaUrl: row.media_url || null,
        voiceNoteUrl: row.voice_note_url || null,
        fileUrl: row.file_url || null,
        fileName: row.file_name || null,
        fileType: row.file_type || null,
        fileSize: row.file_size ? Number(row.file_size) : null,
        isDeleted: Boolean(row.is_deleted),
        isEdited: Boolean(row.is_edited),
        editedAt: row.edited_at || null,
        createdAt: row.created_at,
        reactions: typeof row.reactions === "string" ? JSON.parse(row.reactions) : (row.reactions || {}),
        sender: sendersMap.get(row.sender_id) || null
      }));
    },
    sendMessage: async (data: { conversationId: string, senderId: string, content?: string, mediaUrl?: string, voiceNoteUrl?: string, fileUrl?: string, fileName?: string, fileType?: string, fileSize?: number }) => {
      await initSchema();
      const id = randomUUID();
      const createdAt = new Date().toISOString();
      await pool.query(
        "INSERT INTO app_messages (id, conversation_id, sender_id, content, media_url, voice_note_url, file_url, file_name, file_type, file_size, created_at, reactions, is_deleted, is_edited) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, '{}', false, false)",
        [id, data.conversationId, data.senderId, data.content || "", data.mediaUrl || null, data.voiceNoteUrl || null, data.fileUrl || null, data.fileName || null, data.fileType || null, data.fileSize || null, createdAt]
      );
      
      // Update conversation timestamp
      await pool.query("UPDATE app_conversations SET created_at = $1 WHERE id = $2", [createdAt, data.conversationId]);
      
      // Notify other participants
      const partsRes = await pool.query("SELECT user_id FROM app_conversation_participants WHERE conversation_id = $1 AND user_id != $2", [data.conversationId, data.senderId]);
      const senderRes = await pool.query("SELECT * FROM app_users WHERE id = $1", [data.senderId]);
      const senderName = senderRes.rows[0]?.username || "Someone";
      
      for (const p of partsRes.rows) {
        await dataStore.notification.create({
          userId: p.user_id,
          actorId: data.senderId,
          type: "MESSAGE",
          content: `sent you a message in Messenger.`,
          link: `/messages?cid=${data.conversationId}`
        });
      }

      return {
        id,
        conversationId: data.conversationId,
        senderId: data.senderId,
        content: data.content || "",
        mediaUrl: data.mediaUrl || null,
        voiceNoteUrl: data.voiceNoteUrl || null,
        fileUrl: data.fileUrl || null,
        fileName: data.fileName || null,
        fileType: data.fileType || null,
        fileSize: data.fileSize || null,
        isDeleted: false,
        isEdited: false,
        editedAt: null,
        createdAt,
        reactions: {},
        sender: senderRes.rows[0] ? mapUser(senderRes.rows[0]) : null
      };
    },
    deleteMessage: async (messageId: string, userId: string) => {
      await initSchema();
      const check = await pool.query("SELECT m.*, c.admin_id FROM app_messages m JOIN app_conversations c ON c.id = m.conversation_id WHERE m.id = $1", [messageId]);
      if (check.rows.length === 0) throw new Error("Message not found");
      const msg = check.rows[0];
      if (msg.sender_id !== userId && msg.admin_id !== userId) {
        throw new Error("Unauthorized: Only sender or group admin can delete this message");
      }
      const isByAdmin = msg.sender_id !== userId && msg.admin_id === userId;
      const deletedText = isByAdmin ? "This message was deleted by Group Admin" : "This message was deleted";
      
      const res = await pool.query(
        "UPDATE app_messages SET is_deleted = TRUE, content = $1, media_url = NULL, voice_note_url = NULL, file_url = NULL WHERE id = $2 RETURNING *",
        [deletedText, messageId]
      );
      return res.rows[0];
    },
    editMessage: async (messageId: string, userId: string, newContent: string) => {
      await initSchema();
      const check = await pool.query("SELECT * FROM app_messages WHERE id = $1 AND sender_id = $2", [messageId, userId]);
      if (check.rows.length === 0) throw new Error("Unauthorized or message not found");
      
      const editedAt = new Date().toISOString();
      const res = await pool.query(
        "UPDATE app_messages SET content = $1, is_edited = TRUE, edited_at = $2 WHERE id = $3 RETURNING *",
        [newContent, editedAt, messageId]
      );
      return res.rows[0];
    },
    createConversation: async (data: { isGroup?: boolean, name?: string, participantIds: string[], adminId?: string }) => {
      await initSchema();
      // If 1-on-1, check existing
      if (!data.isGroup && data.participantIds.length === 2) {
        const check = await pool.query(
          `SELECT p1.conversation_id FROM app_conversation_participants p1
           JOIN app_conversation_participants p2 ON p1.conversation_id = p2.conversation_id
           JOIN app_conversations c ON c.id = p1.conversation_id
           WHERE p1.user_id = $1 AND p2.user_id = $2 AND c.is_group = false`,
          [data.participantIds[0], data.participantIds[1]]
        );
        if (check.rows.length > 0) {
          const convs = await dataStore.messenger.getConversations(data.participantIds[0]);
          const found = convs.find(c => c.id === check.rows[0].conversation_id);
          if (found) return found;
        }
      }
      
      const id = randomUUID();
      const createdAt = new Date().toISOString();
      const adminId = data.isGroup ? (data.adminId || data.participantIds[0]) : null;
      await pool.query("INSERT INTO app_conversations (id, is_group, name, admin_id, created_at) VALUES ($1, $2, $3, $4, $5)", [id, Boolean(data.isGroup), data.name || null, adminId, createdAt]);
      
      for (const uid of data.participantIds) {
        await pool.query("INSERT INTO app_conversation_participants (conversation_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [id, uid]);
      }
      
      const convs = await dataStore.messenger.getConversations(data.participantIds[0]);
      return convs.find(c => c.id === id);
    },
    updateGroup: async (conversationId: string, userId: string, data: { name?: string; addParticipantIds?: string[]; removeParticipantId?: string }) => {
      await initSchema();
      const check = await pool.query("SELECT * FROM app_conversations WHERE id = $1 AND is_group = TRUE", [conversationId]);
      if (check.rows.length === 0) throw new Error("Group not found");
      const conv = check.rows[0];
      
      if (!conv.admin_id) {
        await pool.query("UPDATE app_conversations SET admin_id = $1 WHERE id = $2", [userId, conversationId]);
        conv.admin_id = userId;
      }

      if (data.name !== undefined) {
        if (conv.admin_id !== userId) throw new Error("Only admin can change group name");
        await pool.query("UPDATE app_conversations SET name = $1 WHERE id = $2", [data.name, conversationId]);
      }

      if (data.addParticipantIds && data.addParticipantIds.length > 0) {
        for (const uid of data.addParticipantIds) {
          await pool.query("INSERT INTO app_conversation_participants (conversation_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [conversationId, uid]);
        }
      }

      if (data.removeParticipantId) {
        if (conv.admin_id !== userId && data.removeParticipantId !== userId) {
          throw new Error("Only admin can remove members");
        }
        await pool.query("DELETE FROM app_conversation_participants WHERE conversation_id = $1 AND user_id = $2", [conversationId, data.removeParticipantId]);
      }

      const convs = await dataStore.messenger.getConversations(userId);
      return convs.find(c => c.id === conversationId) || null;
    }
  },

  notification: {
    findMany: async (userId: string) => {
      await initSchema();
      const res = await pool.query("SELECT * FROM app_notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30", [userId]);
      const actorsMap = await batchFetchUsers(res.rows.map((r: any) => r.actor_id));
      return res.rows.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        actorId: row.actor_id || null,
        type: row.type,
        content: row.content,
        link: row.link || "/",
        isRead: row.is_read,
        createdAt: row.created_at,
        actor: actorsMap.get(row.actor_id) || null
      }));
    },
    create: async (data: { userId: string, actorId?: string, type: string, content: string, link?: string }) => {
      await initSchema();
      if (data.userId === data.actorId) return null;
      const id = randomUUID();
      const createdAt = new Date().toISOString();
      await pool.query(
        "INSERT INTO app_notifications (id, user_id, actor_id, type, content, link, is_read, created_at) VALUES ($1, $2, $3, $4, $5, $6, false, $7)",
        [id, data.userId, data.actorId || null, data.type, data.content, data.link || "/", createdAt]
      );
      return { id };
    },
    markRead: async (id: string) => {
      await initSchema();
      await pool.query("UPDATE app_notifications SET is_read = true WHERE id = $1", [id]);
      return { success: true };
    },
    markAllRead: async (userId: string) => {
      await initSchema();
      await pool.query("UPDATE app_notifications SET is_read = true WHERE user_id = $1", [userId]);
      return { success: true };
    }
  },

  report: {
    findMany: async () => {
      await initSchema();
      const res = await pool.query("SELECT * FROM app_reports ORDER BY created_at DESC LIMIT 50");
      const reportersMap = await batchFetchUsers(res.rows.map((r: any) => r.reporter_id));
      return res.rows.map((row: any) => ({
        id: row.id,
        reporterId: row.reporter_id,
        targetType: row.target_type,
        targetId: row.target_id,
        reason: row.reason,
        status: row.status,
        createdAt: row.created_at,
        reporter: reportersMap.get(row.reporter_id) || null
      }));
    },
    create: async (data: { reporterId: string, targetType: "POST" | "COMMENT" | "USER", targetId: string, reason: string }) => {
      await initSchema();
      const id = randomUUID();
      const createdAt = new Date().toISOString();
      await pool.query(
        "INSERT INTO app_reports (id, reporter_id, target_type, target_id, reason, status, created_at) VALUES ($1, $2, $3, $4, $5, 'PENDING', $6)",
        [id, data.reporterId, data.targetType, data.targetId, data.reason, createdAt]
      );
      return { id };
    },
    updateStatus: async (id: string, status: string) => {
      await initSchema();
      await pool.query("UPDATE app_reports SET status = $1 WHERE id = $2", [status, id]);
      return { success: true };
    }
  },

  search: {
    query: async (q: string) => {
      await initSchema();
      const term = `%${q.toLowerCase()}%`;
      const [usersRes, postsRes, commsRes, pagesRes, marketRes] = await Promise.all([
        pool.query("SELECT * FROM app_users WHERE LOWER(username) LIKE $1 OR LOWER(bio) LIKE $1 LIMIT 15", [term]),
        pool.query("SELECT * FROM app_posts WHERE LOWER(title) LIKE $1 OR LOWER(content) LIKE $1 ORDER BY created_at DESC LIMIT 20", [term]),
        pool.query("SELECT * FROM app_communities WHERE LOWER(name) LIKE $1 OR LOWER(description) LIKE $1 LIMIT 10", [term]),
        pool.query("SELECT * FROM app_pages WHERE LOWER(name) LIKE $1 OR LOWER(description) LIKE $1 LIMIT 10", [term]),
        pool.query("SELECT * FROM app_marketplace_items WHERE status = 'AVAILABLE' AND (LOWER(title) LIKE $1 OR LOWER(description) LIKE $1) LIMIT 15", [term])
      ]);

      const posts = await hydratePosts(postsRes.rows);

      return {
        users: usersRes.rows.map(mapUser),
        posts,
        communities: commsRes.rows.map((c: any) => ({ id: c.id, name: c.name, description: c.description, icon: c.icon, members: c.members })),
        pages: pagesRes.rows.map((p: any) => ({ id: p.id, name: p.name, category: p.category, description: p.description, avatar: p.avatar, followers: p.followers })),
        marketplace: marketRes.rows.map((m: any) => ({ id: m.id, title: m.title, price: Number(m.price), location: m.location, imageUrls: typeof m.image_urls === "string" ? JSON.parse(m.image_urls) : (m.image_urls || []) }))
      };
    }
  },
  
  auth: {
    getOrCreateGuestUser: async () => {
      await initSchema();
      let res = await pool.query("SELECT * FROM app_users WHERE username = 'guest'");
      
      if (res.rows.length === 0) {
        const id = randomUUID();
        res = await pool.query(
          `INSERT INTO app_users (id, username, email, password, image, bio, role) 
           VALUES ($1, 'guest', 'guest@example.com', 'guest', 'https://api.dicebear.com/7.x/avataaars/svg?seed=guest', 'Guest user', 'admin') RETURNING *`,
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
        "INSERT INTO app_users (id, username, email, password, image, bio, role) VALUES ($1, $2, $3, $4, $5, '', 'user') RETURNING *",
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
