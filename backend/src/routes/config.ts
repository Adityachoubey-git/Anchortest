import { Router } from 'express';
import { configController } from '../controllers/ConfigController';

const router = Router();

router.get('/', configController.getConfig);
router.post('/', configController.saveConfig);

export default router;
