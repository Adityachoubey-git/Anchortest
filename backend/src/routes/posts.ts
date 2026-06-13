import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { postController } from '../controllers/PostController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

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

router.post('/', authenticateToken, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), postController.createPost);

router.get('/', postController.getPosts);
router.get('/:id', postController.getPostById);

router.put('/:id', authenticateToken, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), postController.updatePost);

router.delete('/:id', authenticateToken, postController.deletePost);
router.post('/:id/like', authenticateToken, postController.likePost);

export default router;
