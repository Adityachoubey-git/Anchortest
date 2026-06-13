import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PostModel } from '../models/Post';
import { CommentModel } from '../models/Comment';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Configure Multer Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure Multer Upload
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|mp4|mov|avi|mkv|webm/i;
    const extname = filetypes.test(path.extname(file.originalname));
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only images and videos are allowed!'));
  }
});

// CREATE POST WITH OPTIONAL MEDIA UPLOADS
router.post('/', authenticateToken, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), async (req: AuthRequest, res: Response) => {
  try {
    const { title, body } = req.body;
    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body are required' });
    }

    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const imageUrl = files?.['image']?.[0] ? `/uploads/${files['image'][0].filename}` : '';
    const videoUrl = files?.['video']?.[0] ? `/uploads/${files['video'][0].filename}` : '';

    const post = new PostModel({
      title,
      body,
      author: req.user.id,
      imageUrl,
      videoUrl,
    });

    await post.save();
    return res.status(201).json({ message: 'Post created successfully', post });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET FEED (NEWEST FIRST)
router.get('/', async (req, res) => {
  try {
    const posts = await PostModel.find()
      .populate('author', 'name email totalCredits')
      .sort({ createdAt: -1 });
    return res.status(200).json({ posts });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET SINGLE POST BY ID
router.get('/:id', async (req, res) => {
  try {
    const post = await PostModel.findById(req.params.id)
      .populate('author', 'name email totalCredits');
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    post.views = (post.views || 0) + 1;
    await post.save();
    return res.status(200).json({ post });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// UPDATE POST (EDIT)
router.put('/:id', authenticateToken, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, body, removeImage, removeVideo } = req.body;

    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const post = await PostModel.findById(id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check ownership
    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (title !== undefined) post.title = title;
    if (body !== undefined) post.body = body;

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    // Handle image update/delete
    if (removeImage === 'true' || removeImage === true) {
      if (post.imageUrl) {
        const oldPath = path.join(__dirname, '../../', post.imageUrl);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      post.imageUrl = '';
    } else if (files?.['image']?.[0]) {
      if (post.imageUrl) {
        const oldPath = path.join(__dirname, '../../', post.imageUrl);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      post.imageUrl = `/uploads/${files['image'][0].filename}`;
    }

    // Handle video update/delete
    if (removeVideo === 'true' || removeVideo === true) {
      if (post.videoUrl) {
        const oldPath = path.join(__dirname, '../../', post.videoUrl);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      post.videoUrl = '';
    } else if (files?.['video']?.[0]) {
      if (post.videoUrl) {
        const oldPath = path.join(__dirname, '../../', post.videoUrl);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      post.videoUrl = `/uploads/${files['video'][0].filename}`;
    }

    await post.save();
    return res.status(200).json({ message: 'Post updated successfully', post });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// DELETE POST
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const post = await PostModel.findById(id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check ownership
    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Delete uploaded files
    if (post.imageUrl) {
      const imgPath = path.join(__dirname, '../../', post.imageUrl);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }
    if (post.videoUrl) {
      const vidPath = path.join(__dirname, '../../', post.videoUrl);
      if (fs.existsSync(vidPath)) fs.unlinkSync(vidPath);
    }

    // Delete comments under this post
    await CommentModel.deleteMany({ post: id });

    // Delete the post
    await PostModel.deleteOne({ _id: id });

    return res.status(200).json({ message: 'Post and comments deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// LIKE/UNLIKE POST
router.post('/:id/like', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const post = await PostModel.findById(id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const userId = req.user.id;
    const likeIndex = post.likes.indexOf(userId as any);
    
    if (likeIndex > -1) {
      // Unlike
      post.likes.splice(likeIndex, 1);
    } else {
      // Like
      post.likes.push(userId as any);
    }

    await post.save();
    return res.status(200).json({ message: 'Success', likes: post.likes });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
