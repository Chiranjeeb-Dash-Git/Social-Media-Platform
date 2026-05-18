const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET =
  process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production";

app.use(cors());
app.use(express.json());

const users = [
  {
    id: "1",
    username: "johndoe",
    email: "john@example.com",
    password: "password123",
    bio: "Full-stack developer",
    karma: 1250,
    isVerified: true,
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
  },
];

const communities = [
  {
    id: "1",
    name: "programming",
    description: "Talk about code, tools, and software engineering.",
    icon: "code",
    members: 15420,
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    name: "nextjs",
    description: "Next.js discussions, tips, and builds.",
    icon: "next",
    members: 8932,
    createdAt: new Date().toISOString(),
  },
  {
    id: "3",
    name: "webdev",
    description: "Frontend, backend, and everything web.",
    icon: "web",
    members: 23156,
    createdAt: new Date().toISOString(),
  },
];

const posts = [
  {
    id: "1",
    title: "Why Next.js 15 is a game changer for web development",
    content:
      "Server components, app router, and improved caching make Next.js 15 incredibly powerful.",
    authorId: "1",
    communityId: "2",
    upvotes: 15,
    downvotes: 2,
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    title: "What is your favorite programming language and why?",
    content:
      "I have been using TypeScript mostly for web development, but I want to learn Rust for systems programming.",
    authorId: "1",
    communityId: "1",
    upvotes: 8,
    downvotes: 1,
    createdAt: new Date().toISOString(),
  },
];

const votes = [];

const publicUser = (user) => {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
};

const getUserById = (id) => users.find((user) => user.id === id);
const getCommunityById = (id) =>
  communities.find((community) => community.id === id);

const withPostDetails = (post) => ({
  ...post,
  author: publicUser(getUserById(post.authorId)),
  community: getCommunityById(post.communityId),
  _count: { comments: 0 },
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(403).json({ error: "Invalid token" });
  }
};

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const user = users.find((item) => item.email === email);

  if (!user || user.password !== password) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: user.id, userId: user.id, username: user.username, email: user.email },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ token, user: publicUser(user) });
});

app.post("/api/auth/register", (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (users.some((user) => user.email === email || user.username === username)) {
    return res.status(400).json({ error: "User already exists" });
  }

  const user = {
    id: String(users.length + 1),
    username,
    email,
    password,
    bio: "",
    karma: 0,
    isVerified: false,
    image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
  };

  users.push(user);

  const token = jwt.sign(
    { id: user.id, userId: user.id, username: user.username, email: user.email },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.status(201).json({ token, user: publicUser(user) });
});

app.get("/api/users/profile", authenticateToken, (req, res) => {
  const user = getUserById(req.user.userId || req.user.id);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json(publicUser(user));
});

app.get("/api/communities", (_req, res) => {
  res.json(
    communities.map((community) => ({
      ...community,
      _count: {
        posts: posts.filter((post) => post.communityId === community.id).length,
      },
    }))
  );
});

app.get("/api/posts", (req, res) => {
  const { community } = req.query;
  const filteredPosts = community
    ? posts.filter((post) => post.communityId === community)
    : posts;

  res.json({
    posts: filteredPosts.map(withPostDetails),
    pagination: {
      page: 1,
      limit: filteredPosts.length,
      total: filteredPosts.length,
      pages: 1,
    },
  });
});

app.post("/api/posts", authenticateToken, (req, res) => {
  const { title, content, communityId } = req.body;

  if (!title || !communityId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const community = getCommunityById(communityId);
  if (!community) {
    return res.status(404).json({ error: "Community not found" });
  }

  const post = {
    id: String(posts.length + 1),
    title,
    content: content || "",
    authorId: req.user.userId || req.user.id,
    communityId,
    upvotes: 0,
    downvotes: 0,
    createdAt: new Date().toISOString(),
  };

  posts.unshift(post);
  res.status(201).json(withPostDetails(post));
});

app.post("/api/posts/:id/vote", authenticateToken, (req, res) => {
  const { type } = req.body;
  const post = posts.find((item) => item.id === req.params.id);

  if (!post) {
    return res.status(404).json({ error: "Post not found" });
  }

  if (type !== "UP" && type !== "DOWN") {
    return res.status(400).json({ error: "Invalid vote type" });
  }

  const userId = req.user.userId || req.user.id;
  const existingVote = votes.find(
    (vote) => vote.postId === post.id && vote.userId === userId
  );

  if (existingVote) {
    if (existingVote.type === "UP") post.upvotes -= 1;
    if (existingVote.type === "DOWN") post.downvotes -= 1;
    existingVote.type = type;
  } else {
    votes.push({ userId, postId: post.id, type });
  }

  if (type === "UP") post.upvotes += 1;
  if (type === "DOWN") post.downvotes += 1;

  res.json({ voted: true, type, post: withPostDetails(post) });
});

app.use((error, _req, res, _next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
