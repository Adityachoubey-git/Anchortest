import { Router } from 'express';
import { commentController } from '../controllers/CommentController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/posts/:postId/comments', commentController.getComments);
router.post('/posts/:postId/comments', authenticateToken, commentController.createComment);
router.delete('/comments/:commentId', authenticateToken, commentController.deleteComment);

export default router;
