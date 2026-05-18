const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 5000;
const JWT_SECRET = 'your-super-secret-jwt-key-change-this-in-production';

// Middleware
app.use(cors());
app.use(express.json());

// Mock database
let users = [
  {
    id: '1',
    username: 'johndoe',
    email: 'john@example.com',
    password: '$2b$10$K7L1OJ45/4Y2nIvhR1tz.FZ1p1m2RjvUGN0aVq2c2c2c2c2',
    bio: 'Full-stack developer',
    karma: 1250,
    isVerified: true,
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John'
  }
];

let posts = [
  {
    id: '1',
    title: 'Why Next.js 15 is a game changer for web development',
    content: 'Server components, app router, and improved caching make Next.js 15 incredibly powerful. The performance improvements are noticeable right away, and developer experience is better than ever.',
    authorId: '1',
    communityId: '1',
    upvotes: 15,
    downvotes: 2,
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    title: 'What is your favorite programming language in 2024 and why?',
    content: 'I have been using TypeScript mostly for web development, but I want to learn Rust for systems programming. What languages are you all excited about this year?',
    authorId: '1',
    communityId: '2',
    upvotes: 8,
    downvotes: 1,
    createdAt: new Date().toISOString()
  }
];

let communities = [
  { id: '1', name: 'programming', icon: '💻', members: 15420 },
  { id: '2', name: 'nextjs', icon: '⚛️', members: 8932 },
  { id: '3', name: 'webdev', icon: '🌐', members: 23156 }
];

// Helper functions
const getUserById = (id) => users.find(user => user.id === id);
const getCommunityById = (id) => communities.find(community => community.id === id);

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Routes
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  const user = users.find(u => u.email === email);
  if (!user || password !== 'password123') {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token, user });
});

app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'User already exists' });
  }

  const newUser = {
    id: String(users.length + 1),
    username,
    email,
    password: 'hashed_password',
    bio: '',
    karma: 0,
    isVerified: false,
    image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
  };

  users.push(newUser);

  const token = jwt.sign(
    { id: newUser.id, username: newUser.username, email: newUser.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token, user: newUser });
});

app.get('/api/users/profile', authenticateToken, (req, res) => {
  const user = getUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

app.get('/api/posts', (req, res) => {
  const postsWithDetails = posts.map(post => ({
    ...post,
    author: getUserById(post.authorId),
    community: getCommunityById(post.communityId),
    _count: { comments: Math.floor(Math.random() * 20) }
  }));
  res.json(postsWithDetails);
});

app.post('/api/posts', authenticateToken, (req, res) => {
  const { title, content, communityId } = req.body;
  const newPost = {
    id: String(posts.length + 1),
    title,
    content,
    authorId: req.user.id,
    communityId,
    upvotes: 0,
    downvotes: 0,
    createdAt: new Date().toISOString()
  };
  posts.push(newPost);
  res.json(newPost);
});

app.get('/api/communities', (req, res) => {
  res.json(communities);
});

app.post('/api/vote', authenticateToken, (req, res) => {
  const { postId, type } = req.body;
  const post = posts.find(p => p.id === postId);
  
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  if (type === 'UP') {
    post.upvotes++;
  } else if (type === 'DOWN') {
    post.downvotes++;
  }

  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
