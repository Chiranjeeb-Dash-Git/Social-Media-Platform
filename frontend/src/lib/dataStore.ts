import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const { Pool } = require("pg");

type QueryArgs = Record<string, unknown>;
type VoteType = "UP" | "DOWN";
type PostType = "TEXT" | "IMAGE" | "LINK";

type User = {
  id: string;
  username: string;
  email: string;
  password: string;
  image?: string;
  bio?: string;
  karma: number;
  isVerified: boolean;
};

type PublicUser = Omit<User, "password">;

type Community = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  members: number;
  icon?: string;
};

type StoredPost = {
  id: string;
  title: string;
  content: string;
  type: PostType;
  url?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt?: string;
  authorId: string;
  communityId: string;
};

type StoredComment = {
  id: string;
  postId: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  authorId: string;
};

type Vote = {
  userId: string;
  postId: string;
  type: VoteType;
};

type Store = {
  users: User[];
  communities: Community[];
  posts: StoredPost[];
  comments: StoredComment[];
  votes: Vote[];
  sessions: Record<string, string>;
  nextIds: {
    user: number;
    post: number;
    community: number;
    comment: number;
  };
};

const getProjectRoot = () => {
  const cwd = process.cwd();
  return path.basename(cwd).toLowerCase() === "frontend"
    ? path.dirname(cwd)
    : cwd;
};

const storeDir = path.join(getProjectRoot(), ".data");
const storePath = path.join(storeDir, "store.json");
const lastGoodStorePath = path.join(storeDir, "store.last-good.json");

const seedStore = (): Store => ({
  users: [
    {
      id: "1",
      username: "johndoe",
      email: "john@example.com",
      password: "password123",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
      bio: "Full-stack developer",
      karma: 1250,
      isVerified: true,
    },
    {
      id: "2",
      username: "janedoe",
      email: "jane@example.com",
      password: "password123",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jane",
      bio: "Design-minded builder",
      karma: 420,
      isVerified: false,
    },
  ],
  communities: [
    {
      id: "1",
      name: "programming",
      description: "Talk about code, tools, and software engineering.",
      createdAt: "2026-04-20T12:00:00.000Z",
      members: 15420,
      icon: "https://api.dicebear.com/7.x/initials/svg?seed=programming&backgroundColor=4f46e5",
    },
    {
      id: "2",
      name: "nextjs",
      description: "Server components, routing, data fetching, and Next.js apps.",
      createdAt: "2026-04-21T12:00:00.000Z",
      members: 8932,
      icon: "https://api.dicebear.com/7.x/initials/svg?seed=nextjs&backgroundColor=000000",
    },
    {
      id: "3",
      name: "webdev",
      description: "Frontend, backend, design systems, and web product craft.",
      createdAt: "2026-04-22T12:00:00.000Z",
      members: 23156,
      icon: "https://api.dicebear.com/7.x/initials/svg?seed=webdev&backgroundColor=059669",
    },
    {
      id: "4",
      name: "design",
      description: "A space for UI, UX, visual systems, and product design.",
      createdAt: "2026-04-23T12:00:00.000Z",
      members: 1800,
      icon: "https://api.dicebear.com/7.x/initials/svg?seed=design&backgroundColor=db2777",
    },
    {
      id: "5",
      name: "javascript",
      description: "JavaScript, TypeScript, browser APIs, and tooling.",
      createdAt: "2026-04-24T12:00:00.000Z",
      members: 12040,
      icon: "https://api.dicebear.com/7.x/initials/svg?seed=javascript&backgroundColor=f59e0b",
    },
  ],
  posts: [
    {
      id: "1",
      title: "Why Next.js is a game changer for web development",
      content:
        "Server components, app router, and improved caching make Next.js incredibly powerful. The performance improvements are noticeable right away, and the developer experience is better than ever.",
      type: "TEXT",
      createdAt: "2026-05-01T12:00:00.000Z",
      authorId: "1",
      communityId: "2",
    },
    {
      id: "2",
      title: "What is your favorite programming language and why?",
      content:
        "I have been using TypeScript mostly for web development, but I want to learn Rust for systems programming. What languages are you excited about this year?",
      type: "TEXT",
      createdAt: "2026-05-02T12:00:00.000Z",
      authorId: "2",
      communityId: "1",
    },
    {
      id: "3",
      title: "Building a Reddit clone with Next.js and TypeScript",
      content:
        "Just started working on a Reddit clone project. Using Next.js 14 with the app router, TypeScript for type safety, and Tailwind CSS for styling. The goal is to create a fully functional social media platform with posts, comments, voting, and user authentication.",
      type: "TEXT",
      createdAt: "2026-05-03T15:30:00.000Z",
      authorId: "1",
      communityId: "2",
    },
    {
      id: "4",
      title: "Best practices for React component design",
      content:
        "What are your thoughts on component composition vs inheritance in React? I've been leaning towards composition lately, but I'm curious about other approaches. Also, how do you handle prop drilling in large applications?",
      type: "TEXT",
      createdAt: "2026-05-04T09:15:00.000Z",
      authorId: "2",
      communityId: "1",
    },
    {
      id: "5",
      title: "Check out this amazing CSS animation library!",
      content: "",
      type: "LINK",
      url: "https://framer.com/motion",
      createdAt: "2026-05-05T14:20:00.000Z",
      authorId: "1",
      communityId: "3",
    },
  ],
  votes: [
    { userId: "1", postId: "1", type: "UP" },
    { userId: "2", postId: "1", type: "UP" },
    { userId: "1", postId: "2", type: "UP" },
  ],
  comments: [
    {
      id: "1",
      postId: "1",
      content: "This app router setup feels much cleaner once the data flow is wired end to end.",
      createdAt: "2026-05-01T13:00:00.000Z",
      authorId: "2",
    },
    {
      id: "2",
      postId: "2",
      content: "TypeScript for web work, Rust when I need lower-level control.",
      createdAt: "2026-05-02T13:00:00.000Z",
      authorId: "1",
    },
  ],
  sessions: {},
  nextIds: {
    user: 3,
    post: 6,
    community: 6,
    comment: 3,
  },
});

const ensureStore = () => {
  if (!fs.existsSync(storeDir)) {
    fs.mkdirSync(storeDir, { recursive: true });
  }

  if (!fs.existsSync(storePath)) {
    writeStore(seedStore(), { backupCurrent: false });
  }
};

const readStore = (): Store => {
  ensureStore();

  try {
    return parseStoreFile(storePath);
  } catch (error) {
    console.error("Error reading store file:", error);

    preserveUnreadableStore();

    const fallback = findReadableFallbackStore();
    if (fallback) {
      writeStore(fallback, { backupCurrent: false });
      return fallback;
    }

    throw error;
  }
};

const normalizeStore = (store: Store): Store => {
  const comments = Array.isArray(store.comments) ? store.comments : [];
  const nextCommentId =
    store.nextIds?.comment ??
    Math.max(0, ...comments.map((comment) => Number(comment.id) || 0)) + 1;

  return {
    ...store,
    comments,
    sessions: store.sessions ?? {},
    nextIds: {
      user: store.nextIds?.user ?? 1,
      post: store.nextIds?.post ?? 1,
      community: store.nextIds?.community ?? 1,
      comment: nextCommentId,
    },
  };
};

const parseStoreFile = (filePath: string): Store => {
  const data = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");

  if (!data || data.trim() === "") {
    throw new Error(`Store file is empty: ${filePath}`);
  }

  return normalizeStore(JSON.parse(data) as Store);
};

const preserveUnreadableStore = () => {
  try {
    if (!fs.existsSync(storePath)) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    fs.copyFileSync(storePath, `${storePath}.corrupt-${timestamp}`);
  } catch (backupError) {
    console.error("Error preserving unreadable store:", backupError);
  }
};

const findReadableFallbackStore = () => {
  const fallbackPaths = [
    lastGoodStorePath,
    ...fs
      .readdirSync(storeDir)
      .filter((fileName) => fileName.startsWith("store.json") && fileName.endsWith(".backup"))
      .map((fileName) => path.join(storeDir, fileName))
      .sort(
        (a, b) =>
          fs.statSync(b).mtime.getTime() - fs.statSync(a).mtime.getTime()
      ),
  ];

  for (const fallbackPath of fallbackPaths) {
    try {
      if (fs.existsSync(fallbackPath)) {
        return parseStoreFile(fallbackPath);
      }
    } catch (fallbackError) {
      console.error(`Fallback store is not readable: ${fallbackPath}`, fallbackError);
    }
  }

  return null;
};

const writeStore = (
  store: Store,
  options: { backupCurrent?: boolean } = {}
) => {
  if (!fs.existsSync(storeDir)) {
    fs.mkdirSync(storeDir, { recursive: true });
  }

  if (options.backupCurrent !== false && fs.existsSync(storePath)) {
    fs.copyFileSync(storePath, lastGoodStorePath);
  }

  const tempPath = path.join(
    storeDir,
    `store.${process.pid}.${Date.now()}.tmp`
  );

  fs.writeFileSync(tempPath, JSON.stringify(store, null, 2));
  fs.renameSync(tempPath, storePath);
};

const publicUser = ({ password, ...user }: User): PublicUser => {
  void password;
  return user;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const normalizeUsername = (username: string) => username.trim();

const findUser = (store: Store, userId: string) =>
  store.users.find((user) => user.id === userId) ?? store.users[0];

const findCommunity = (store: Store, communityIdOrName: string) =>
  store.communities.find(
    (community) =>
      community.id === communityIdOrName ||
      community.name.toLowerCase() === communityIdOrName.toLowerCase()
  ) ?? store.communities[0];

const hydratePost = (store: Store, post: StoredPost) => {
  const votes = store.votes.filter((vote) => vote.postId === post.id);
  const community = findCommunity(store, post.communityId);
  const comments = store.comments.filter((comment) => comment.postId === post.id);

  return {
    id: post.id,
    title: post.title,
    content: post.content,
    type: post.type,
    url: post.url,
    imageUrl: post.imageUrl,
    createdAt: post.createdAt,
    author: publicUser(findUser(store, post.authorId)),
    community: {
      id: community.id,
      name: community.name,
      icon: community.icon,
    },
    upvotes: votes.filter((vote) => vote.type === "UP").length,
    downvotes: votes.filter((vote) => vote.type === "DOWN").length,
    votes,
    _count: { comments: comments.length },
  };
};

const hydrateComment = (store: Store, comment: StoredComment) => ({
  id: comment.id,
  postId: comment.postId,
  content: comment.content,
  createdAt: comment.createdAt,
  updatedAt: comment.updatedAt,
  author: publicUser(findUser(store, comment.authorId)),
});

const createToken = (store: Store, userId: string) => {
  const token = `${userId}.${randomUUID()}`;
  store.sessions[token] = userId;
  writeStore(store);
  return token;
};

const jsonDataStore = {
  post: {
    findMany: async (args?: QueryArgs) => {
      void args;
      const store = readStore();
      return store.posts
        .map((post) => hydratePost(store, post))
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    },
    findUnique: async (args?: QueryArgs) => {
      const store = readStore();
      const where = args?.where as { id?: string } | undefined;
      const post = store.posts.find((item) => item.id === where?.id);
      return post ? hydratePost(store, post) : null;
    },
    create: async (args: {
      data: {
        title: string;
        content?: string;
        type?: PostType;
        url?: string;
        imageUrl?: string;
        communityId: string;
        authorId: string;
      };
    }) => {
      const store = readStore();
      const author = findUser(store, args.data.authorId);
      const community = findCommunity(store, args.data.communityId);
      const post: StoredPost = {
        id: String(store.nextIds.post++),
        title: args.data.title.trim(),
        content: args.data.content?.trim() ?? "",
        type: args.data.type ?? "TEXT",
        url: args.data.url?.trim(),
        imageUrl: args.data.imageUrl,
        createdAt: new Date().toISOString(),
        authorId: author.id,
        communityId: community.id,
      };

      store.posts.unshift(post);
      writeStore(store);

      return hydratePost(store, post);
    },
    update: async (args: {
      where: { id: string };
      data: {
        title?: string;
        content?: string;
        type?: PostType;
        url?: string;
        imageUrl?: string;
      };
    }) => {
      const store = readStore();
      const post = store.posts.find((item) => item.id === args.where.id);

      if (!post) return null;

      if (typeof args.data.title === "string") {
        post.title = args.data.title.trim();
      }
      if (typeof args.data.content === "string") {
        post.content = args.data.content.trim();
      }
      if (args.data.type && ["TEXT", "IMAGE", "LINK"].includes(args.data.type)) {
        post.type = args.data.type;
      }
      if (typeof args.data.url === "string") {
        post.url = args.data.url.trim();
      }
      if (typeof args.data.imageUrl === "string") {
        post.imageUrl = args.data.imageUrl;
      }

      post.updatedAt = new Date().toISOString();
      writeStore(store);

      return hydratePost(store, post);
    },
    delete: async (args: { where: { id: string } }) => {
      const store = readStore();
      const post = store.posts.find((item) => item.id === args.where.id);

      if (!post) return null;

      store.posts = store.posts.filter((item) => item.id !== args.where.id);
      store.votes = store.votes.filter((vote) => vote.postId !== args.where.id);
      store.comments = store.comments.filter(
        (comment) => comment.postId !== args.where.id
      );
      writeStore(store);

      return hydratePost(store, post);
    },
  },
  comment: {
    findMany: async (args: { where: { postId: string } }) => {
      const store = readStore();
      return store.comments
        .filter((comment) => comment.postId === args.where.postId)
        .map((comment) => hydrateComment(store, comment))
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
    },
    create: async (args: {
      data: { postId: string; content: string; authorId: string };
    }) => {
      const store = readStore();
      const post = store.posts.find((item) => item.id === args.data.postId);
      const author = findUser(store, args.data.authorId);

      if (!post) return null;

      const comment: StoredComment = {
        id: String(store.nextIds.comment++),
        postId: post.id,
        content: args.data.content.trim(),
        createdAt: new Date().toISOString(),
        authorId: author.id,
      };

      store.comments.push(comment);
      writeStore(store);

      return hydrateComment(store, comment);
    },
    delete: async (args: { where: { id: string } }) => {
      const store = readStore();
      const comment = store.comments.find((item) => item.id === args.where.id);

      if (!comment) return null;

      store.comments = store.comments.filter((item) => item.id !== args.where.id);
      writeStore(store);

      return hydrateComment(store, comment);
    },
  },
  community: {
    findUnique: async (args?: QueryArgs) => {
      const store = readStore();
      const where = args?.where as { id?: string; name?: string } | undefined;
      const community =
        store.communities.find(
          (item) =>
            item.id === where?.id ||
            item.name.toLowerCase() === where?.name?.toLowerCase()
        ) ?? null;

      if (!community) return null;

      const posts = store.posts
        .filter((post) => post.communityId === community.id)
        .map((post) => hydratePost(store, post))
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

      return {
        ...community,
        posts,
        _count: { posts: posts.length },
      };
    },
    findMany: async (args?: QueryArgs) => {
      void args;
      const store = readStore();
      return store.communities.map((community) => ({
        ...community,
        _count: {
          posts: store.posts.filter((post) => post.communityId === community.id)
            .length,
        },
      }));
    },
  },
  user: {
    findByUsername: async (username: string) => {
      const store = readStore();
      return store.users.find(
        (user) => user.username.toLowerCase() === username.toLowerCase()
      );
    },
    getPublicByUsername: async (username: string) => {
      const store = readStore();
      const user = store.users.find(
        (item) => item.username.toLowerCase() === username.toLowerCase()
      );
      return user ? publicUser(user) : null;
    },
  },
  auth: {
    getOrCreateGuestUser: async () => {
      const store = readStore();
      
      // Look for existing guest user
      let guestUser = store.users.find((user) => user.username === "guest");
      
      if (!guestUser) {
        // Create a new guest user
        guestUser = {
          id: String(store.nextIds.user++),
          username: "guest",
          email: "guest@example.com",
          password: "guest", // Simple password for guest
          image: `https://api.dicebear.com/7.x/avataaars/svg?seed=guest`,
          bio: "Guest user",
          karma: 0,
          isVerified: false,
        };
        store.users.push(guestUser);
        writeStore(store);
      }
      
      return publicUser(guestUser);
    },
    login: async (email: string, password: string) => {
      const store = readStore();
      const user = store.users.find(
        (item) => normalizeEmail(item.email) === normalizeEmail(email)
      );

      if (!user || user.password !== password) return null;

      return {
        token: createToken(store, user.id),
        user: publicUser(user),
      };
    },
    register: async (username: string, email: string, password: string) => {
      const store = readStore();
      const cleanUsername = normalizeUsername(username);
      const cleanEmail = normalizeEmail(email);
      const existingUser = store.users.find(
        (user) =>
          normalizeEmail(user.email) === cleanEmail ||
          user.username.toLowerCase() === cleanUsername.toLowerCase()
      );

      if (existingUser) return null;

      const user: User = {
        id: String(store.nextIds.user++),
        username: cleanUsername,
        email: cleanEmail,
        password,
        image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
          cleanUsername
        )}`,
        bio: "",
        karma: 0,
        isVerified: false,
      };

      store.users.push(user);

      return {
        token: createToken(store, user.id),
        user: publicUser(user),
      };
    },
    getUserFromToken: async (token: string) => {
      const store = readStore();
      const userId = store.sessions[token];
      const user = store.users.find((item) => item.id === userId);
      return user ? publicUser(user) : null;
    },
    logout: async (token: string) => {
      const store = readStore();
      delete store.sessions[token];
      writeStore(store);
    },
  },
  vote: {
    findUnique: async (args: {
      where: { userId_postId: { userId: string; postId: string } };
    }) => {
      const store = readStore();
      return (
        store.votes.find(
          (vote) =>
            vote.userId === args.where.userId_postId.userId &&
            vote.postId === args.where.userId_postId.postId
        ) ?? null
      );
    },
    create: async (args: {
      data: { userId: string; postId: string; type: VoteType };
    }) => {
      const store = readStore();
      store.votes.push(args.data);
      writeStore(store);
      return args.data;
    },
    update: async (args: {
      where: { userId_postId: { userId: string; postId: string } };
      data: { type: VoteType };
    }) => {
      const store = readStore();
      const vote = store.votes.find(
        (item) =>
          item.userId === args.where.userId_postId.userId &&
          item.postId === args.where.userId_postId.postId
      );
      if (vote) vote.type = args.data.type;
      writeStore(store);
      return vote ?? null;
    },
    delete: async (args: {
      where: { userId_postId: { userId: string; postId: string } };
    }) => {
      const store = readStore();
      const index = store.votes.findIndex(
        (vote) =>
          vote.userId === args.where.userId_postId.userId &&
          vote.postId === args.where.userId_postId.postId
      );
      const [deletedVote] = index >= 0 ? store.votes.splice(index, 1) : [];
      writeStore(store);
      return deletedVote ?? null;
    },
    toggle: async (args: { userId: string; postId: string; type: VoteType }) => {
      const store = readStore();
      const post = store.posts.find((item) => item.id === args.postId);

      if (!post) return null;

      const existingVote = store.votes.find(
        (vote) => vote.userId === args.userId && vote.postId === args.postId
      );

      let userVote: VoteType | null = args.type;

      if (existingVote) {
        if (existingVote.type === args.type) {
          store.votes = store.votes.filter(
            (vote) =>
              !(vote.userId === args.userId && vote.postId === args.postId)
          );
          userVote = null;
        } else {
          existingVote.type = args.type;
        }
      } else {
        store.votes.push(args);
      }

      writeStore(store);

      const updatedPost = hydratePost(store, post);

      return {
        post: updatedPost,
        userVote,
        score: updatedPost.upvotes - updatedPost.downvotes,
      };
    },
  },
};

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
  return Boolean(process.env.VERCEL) && !/localhost|127\.0\.0\.1/i.test(url);
};

let postgresPool: any = null;
let postgresSchemaReady: Promise<void> | null = null;

const getPostgresPool = () => {
  const connectionString = getPostgresUrl();

  if (!connectionString) {
    throw new Error(
      "Set POSTGRES_URL or a postgres:// DATABASE_URL to use the Postgres store."
    );
  }

  if (!postgresPool) {
    postgresPool = new Pool({
      connectionString,
      max: 5,
      ssl: shouldUsePostgresSsl(connectionString)
        ? { rejectUnauthorized: false }
        : undefined,
    });
  }

  return postgresPool;
};

const ensurePostgresSchema = async () => {
  if (!postgresSchemaReady) {
    postgresSchemaReady = (async () => {
      const pool = getPostgresPool();

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
    })();
  }

  return postgresSchemaReady;
};

const maxNumericId = (items: Array<{ id: string }>) =>
  Math.max(0, ...items.map((item) => Number(item.id) || 0));

const withComputedNextIds = (store: Omit<Store, "nextIds">): Store =>
  normalizeStore({
    ...store,
    nextIds: {
      user: maxNumericId(store.users) + 1,
      post: maxNumericId(store.posts) + 1,
      community: maxNumericId(store.communities) + 1,
      comment: maxNumericId(store.comments) + 1,
    },
  });

const readPostgresStoreOnce = async (): Promise<Store> => {
  const pool = getPostgresPool();
  const [users, communities, posts, comments, votes, sessions] =
    await Promise.all([
      pool.query("SELECT * FROM app_users"),
      pool.query("SELECT * FROM app_communities"),
      pool.query("SELECT * FROM app_posts"),
      pool.query("SELECT * FROM app_comments"),
      pool.query("SELECT * FROM app_votes"),
      pool.query("SELECT * FROM app_sessions"),
    ]);

  return withComputedNextIds({
    users: users.rows.map((row: any) => ({
      id: row.id,
      username: row.username,
      email: row.email,
      password: row.password,
      image: row.image ?? undefined,
      bio: row.bio ?? undefined,
      karma: Number(row.karma) || 0,
      isVerified: Boolean(row.is_verified),
    })),
    communities: communities.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: row.created_at,
      members: Number(row.members) || 0,
      icon: row.icon ?? undefined,
    })),
    posts: posts.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      content: row.content ?? "",
      type: row.type,
      url: row.url ?? undefined,
      imageUrl: row.image_url ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at ?? undefined,
      authorId: row.author_id,
      communityId: row.community_id,
    })),
    comments: comments.rows.map((row: any) => ({
      id: row.id,
      postId: row.post_id,
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at ?? undefined,
      authorId: row.author_id,
    })),
    votes: votes.rows.map((row: any) => ({
      userId: row.user_id,
      postId: row.post_id,
      type: row.type,
    })),
    sessions: Object.fromEntries(
      sessions.rows.map((row: any) => [row.token, row.user_id])
    ),
  });
};

const readPostgresStore = async (): Promise<Store> => {
  await ensurePostgresSchema();
  let store = await readPostgresStoreOnce();

  if (store.users.length === 0 && store.communities.length === 0) {
    await writePostgresStore(seedStore());
    store = await readPostgresStoreOnce();
  }

  return store;
};

const writePostgresStore = async (store: Store) => {
  await ensurePostgresSchema();
  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM app_sessions");
    await client.query("DELETE FROM app_votes");
    await client.query("DELETE FROM app_comments");
    await client.query("DELETE FROM app_posts");
    await client.query("DELETE FROM app_communities");
    await client.query("DELETE FROM app_users");

    for (const user of store.users) {
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
          user.karma,
          user.isVerified,
        ]
      );
    }

    for (const community of store.communities) {
      await client.query(
        `INSERT INTO app_communities
          (id, name, description, created_at, members, icon)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          community.id,
          community.name,
          community.description,
          community.createdAt,
          community.members,
          community.icon ?? null,
        ]
      );
    }

    for (const post of store.posts) {
      await client.query(
        `INSERT INTO app_posts
          (id, title, content, type, url, image_url, created_at, updated_at, author_id, community_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          post.id,
          post.title,
          post.content,
          post.type,
          post.url ?? null,
          post.imageUrl ?? null,
          post.createdAt,
          post.updatedAt ?? null,
          post.authorId,
          post.communityId,
        ]
      );
    }

    for (const comment of store.comments) {
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

    for (const vote of store.votes) {
      await client.query(
        `INSERT INTO app_votes (user_id, post_id, type)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, post_id) DO UPDATE SET type = EXCLUDED.type`,
        [vote.userId, vote.postId, vote.type]
      );
    }

    for (const [token, userId] of Object.entries(store.sessions)) {
      await client.query(
        "INSERT INTO app_sessions (token, user_id) VALUES ($1, $2)",
        [token, userId]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const updatePostgresStore = async <T>(
  updater: (store: Store) => T | Promise<T>
) => {
  const store = await readPostgresStore();
  const result = await updater(store);
  await writePostgresStore(store);
  return result;
};

const createPostgresToken = async (store: Store, userId: string) => {
  const token = `${userId}.${randomUUID()}`;
  store.sessions[token] = userId;
  return token;
};

const createPostgresDataStore = () => ({
  post: {
    findMany: async (args?: QueryArgs) => {
      void args;
      const store = await readPostgresStore();
      return store.posts
        .map((post) => hydratePost(store, post))
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    },
    findUnique: async (args?: QueryArgs) => {
      const store = await readPostgresStore();
      const where = args?.where as { id?: string } | undefined;
      const post = store.posts.find((item) => item.id === where?.id);
      return post ? hydratePost(store, post) : null;
    },
    create: async (args: {
      data: {
        title: string;
        content?: string;
        type?: PostType;
        url?: string;
        imageUrl?: string;
        communityId: string;
        authorId: string;
      };
    }) =>
      updatePostgresStore((store) => {
        const author = findUser(store, args.data.authorId);
        const community = findCommunity(store, args.data.communityId);
        const post: StoredPost = {
          id: String(store.nextIds.post++),
          title: args.data.title.trim(),
          content: args.data.content?.trim() ?? "",
          type: args.data.type ?? "TEXT",
          url: args.data.url?.trim(),
          imageUrl: args.data.imageUrl,
          createdAt: new Date().toISOString(),
          authorId: author.id,
          communityId: community.id,
        };

        store.posts.unshift(post);
        return hydratePost(store, post);
      }),
    update: async (args: {
      where: { id: string };
      data: {
        title?: string;
        content?: string;
        type?: PostType;
        url?: string;
        imageUrl?: string;
      };
    }) =>
      updatePostgresStore((store) => {
        const post = store.posts.find((item) => item.id === args.where.id);

        if (!post) return null;

        if (typeof args.data.title === "string") {
          post.title = args.data.title.trim();
        }
        if (typeof args.data.content === "string") {
          post.content = args.data.content.trim();
        }
        if (args.data.type && ["TEXT", "IMAGE", "LINK"].includes(args.data.type)) {
          post.type = args.data.type;
        }
        if (typeof args.data.url === "string") {
          post.url = args.data.url.trim();
        }
        if (typeof args.data.imageUrl === "string") {
          post.imageUrl = args.data.imageUrl;
        }

        post.updatedAt = new Date().toISOString();
        return hydratePost(store, post);
      }),
    delete: async (args: { where: { id: string } }) =>
      updatePostgresStore((store) => {
        const post = store.posts.find((item) => item.id === args.where.id);

        if (!post) return null;

        store.posts = store.posts.filter((item) => item.id !== args.where.id);
        store.votes = store.votes.filter((vote) => vote.postId !== args.where.id);
        store.comments = store.comments.filter(
          (comment) => comment.postId !== args.where.id
        );

        return hydratePost(store, post);
      }),
  },
  comment: {
    findMany: async (args: { where: { postId: string } }) => {
      const store = await readPostgresStore();
      return store.comments
        .filter((comment) => comment.postId === args.where.postId)
        .map((comment) => hydrateComment(store, comment))
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
    },
    create: async (args: {
      data: { postId: string; content: string; authorId: string };
    }) =>
      updatePostgresStore((store) => {
        const post = store.posts.find((item) => item.id === args.data.postId);
        const author = findUser(store, args.data.authorId);

        if (!post) return null;

        const comment: StoredComment = {
          id: String(store.nextIds.comment++),
          postId: post.id,
          content: args.data.content.trim(),
          createdAt: new Date().toISOString(),
          authorId: author.id,
        };

        store.comments.push(comment);
        return hydrateComment(store, comment);
      }),
    delete: async (args: { where: { id: string } }) =>
      updatePostgresStore((store) => {
        const comment = store.comments.find((item) => item.id === args.where.id);

        if (!comment) return null;

        store.comments = store.comments.filter((item) => item.id !== args.where.id);
        return hydrateComment(store, comment);
      }),
  },
  community: {
    findUnique: async (args?: QueryArgs) => {
      const store = await readPostgresStore();
      const where = args?.where as { id?: string; name?: string } | undefined;
      const community =
        store.communities.find(
          (item) =>
            item.id === where?.id ||
            item.name.toLowerCase() === where?.name?.toLowerCase()
        ) ?? null;

      if (!community) return null;

      const posts = store.posts
        .filter((post) => post.communityId === community.id)
        .map((post) => hydratePost(store, post))
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

      return {
        ...community,
        posts,
        _count: { posts: posts.length },
      };
    },
    findMany: async (args?: QueryArgs) => {
      void args;
      const store = await readPostgresStore();
      return store.communities.map((community) => ({
        ...community,
        _count: {
          posts: store.posts.filter((post) => post.communityId === community.id)
            .length,
        },
      }));
    },
  },
  user: {
    findByUsername: async (username: string) => {
      const store = await readPostgresStore();
      return store.users.find(
        (user) => user.username.toLowerCase() === username.toLowerCase()
      );
    },
    getPublicByUsername: async (username: string) => {
      const store = await readPostgresStore();
      const user = store.users.find(
        (item) => item.username.toLowerCase() === username.toLowerCase()
      );
      return user ? publicUser(user) : null;
    },
  },
  auth: {
    getOrCreateGuestUser: async () =>
      updatePostgresStore((store) => {
        let guestUser = store.users.find((user) => user.username === "guest");

        if (!guestUser) {
          guestUser = {
            id: String(store.nextIds.user++),
            username: "guest",
            email: "guest@example.com",
            password: "guest",
            image: "https://api.dicebear.com/7.x/avataaars/svg?seed=guest",
            bio: "Guest user",
            karma: 0,
            isVerified: false,
          };
          store.users.push(guestUser);
        }

        return publicUser(guestUser);
      }),
    login: async (email: string, password: string) =>
      updatePostgresStore(async (store) => {
        const user = store.users.find(
          (item) => normalizeEmail(item.email) === normalizeEmail(email)
        );

        if (!user || user.password !== password) return null;

        return {
          token: await createPostgresToken(store, user.id),
          user: publicUser(user),
        };
      }),
    register: async (username: string, email: string, password: string) =>
      updatePostgresStore(async (store) => {
        const cleanUsername = normalizeUsername(username);
        const cleanEmail = normalizeEmail(email);
        const existingUser = store.users.find(
          (user) =>
            normalizeEmail(user.email) === cleanEmail ||
            user.username.toLowerCase() === cleanUsername.toLowerCase()
        );

        if (existingUser) return null;

        const user: User = {
          id: String(store.nextIds.user++),
          username: cleanUsername,
          email: cleanEmail,
          password,
          image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
            cleanUsername
          )}`,
          bio: "",
          karma: 0,
          isVerified: false,
        };

        store.users.push(user);

        return {
          token: await createPostgresToken(store, user.id),
          user: publicUser(user),
        };
      }),
    getUserFromToken: async (token: string) => {
      const store = await readPostgresStore();
      const userId = store.sessions[token];
      const user = store.users.find((item) => item.id === userId);
      return user ? publicUser(user) : null;
    },
    logout: async (token: string) =>
      updatePostgresStore((store) => {
        delete store.sessions[token];
      }),
  },
  vote: {
    findUnique: async (args: {
      where: { userId_postId: { userId: string; postId: string } };
    }) => {
      const store = await readPostgresStore();
      return (
        store.votes.find(
          (vote) =>
            vote.userId === args.where.userId_postId.userId &&
            vote.postId === args.where.userId_postId.postId
        ) ?? null
      );
    },
    create: async (args: {
      data: { userId: string; postId: string; type: VoteType };
    }) =>
      updatePostgresStore((store) => {
        store.votes.push(args.data);
        return args.data;
      }),
    update: async (args: {
      where: { userId_postId: { userId: string; postId: string } };
      data: { type: VoteType };
    }) =>
      updatePostgresStore((store) => {
        const vote = store.votes.find(
          (item) =>
            item.userId === args.where.userId_postId.userId &&
            item.postId === args.where.userId_postId.postId
        );
        if (vote) vote.type = args.data.type;
        return vote ?? null;
      }),
    delete: async (args: {
      where: { userId_postId: { userId: string; postId: string } };
    }) =>
      updatePostgresStore((store) => {
        const index = store.votes.findIndex(
          (vote) =>
            vote.userId === args.where.userId_postId.userId &&
            vote.postId === args.where.userId_postId.postId
        );
        const [deletedVote] = index >= 0 ? store.votes.splice(index, 1) : [];
        return deletedVote ?? null;
      }),
    toggle: async (args: { userId: string; postId: string; type: VoteType }) =>
      updatePostgresStore((store) => {
        const post = store.posts.find((item) => item.id === args.postId);

        if (!post) return null;

        const existingVote = store.votes.find(
          (vote) => vote.userId === args.userId && vote.postId === args.postId
        );

        let userVote: VoteType | null = args.type;

        if (existingVote) {
          if (existingVote.type === args.type) {
            store.votes = store.votes.filter(
              (vote) =>
                !(vote.userId === args.userId && vote.postId === args.postId)
            );
            userVote = null;
          } else {
            existingVote.type = args.type;
          }
        } else {
          store.votes.push(args);
        }

        const updatedPost = hydratePost(store, post);

        return {
          post: updatedPost,
          userVote,
          score: updatedPost.upvotes - updatedPost.downvotes,
        };
      }),
  },
});

const dataStore = getPostgresUrl() ? createPostgresDataStore() : jsonDataStore;

export default dataStore;
