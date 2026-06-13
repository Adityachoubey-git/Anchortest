import { Router } from 'express';
import { authController } from '../controllers/AuthController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', authenticateToken, authController.getMe);
router.get('/me/credits-history', authenticateToken, authController.getCreditsHistory);

export default router;
