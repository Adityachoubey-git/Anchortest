import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { PostModel } from '../models/Post';
import { CommentModel } from '../models/Comment';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_anchor_key_2026_12';

// SIGNUP
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = new UserModel({
      name,
      email: email.toLowerCase(),
      passwordHash,
      totalCredits: 0
    });

    await user.save();

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

    const isLocalhost = req.headers.host?.includes('localhost') || req.headers.host?.includes('127.0.0.1');
    const secureFlag = process.env.NODE_ENV === 'production' && !isLocalhost;

    res.cookie('token', token, {
      httpOnly: true,
      secure: secureFlag,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    return res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: user._id, name: user.name, email: user.email, totalCredits: user.totalCredits }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// LOGIN
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

    const isLocalhost = req.headers.host?.includes('localhost') || req.headers.host?.includes('127.0.0.1');
    const secureFlag = process.env.NODE_ENV === 'production' && !isLocalhost;

    res.cookie('token', token, {
      httpOnly: true,
      secure: secureFlag,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    return res.status(200).json({
      message: 'Logged in successfully',
      token,
      user: { id: user._id, name: user.name, email: user.email, totalCredits: user.totalCredits }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// LOGOUT
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('token');
  return res.status(200).json({ message: 'Logged out successfully' });
});

// GET CURRENT USER PROFILE
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const user = await UserModel.findById(req.user.id).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.status(200).json({ user });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET USER CREDITS DYNAMIC STATISTICS
router.get('/me/credits-history', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const userId = req.user.id;

    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Fetch user's posts
    const userPosts = await PostModel.find({ author: userId }).sort({ createdAt: -1 });
    const postIds = userPosts.map(p => p._id);

    // Filter comments that earned credits (creditsAwarded > 0) and are active (not deleted)
    const activeComments = await CommentModel.find({
      post: { $in: postIds },
      isDeleted: false,
      creditsAwarded: { $gt: 0 }
    });

    // Calculate credits in the last 10 days
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    let last10DaysCredits = 0;
    const postCreditsMap: { [key: string]: number } = {};

    activeComments.forEach(c => {
      // Per-post summing
      const pId = c.post.toString();
      postCreditsMap[pId] = (postCreditsMap[pId] || 0) + c.creditsAwarded;

      // Last 10 days checking
      if (new Date(c.createdAt) >= tenDaysAgo) {
        last10DaysCredits += c.creditsAwarded;
      }
    });

    const postsCredits = userPosts.map(p => ({
      _id: p._id,
      title: p.title,
      createdAt: p.createdAt,
      creditsEarned: postCreditsMap[p._id.toString()] || 0
    }));

    return res.status(200).json({
      totalCredits: user.totalCredits,
      last10DaysCredits,
      postsCredits
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
