import express from 'express';
import {
  getAllAchievements,
  getUserAchievements,
  getAchievementsStatus,
  checkAndUnlockAchievements,
  initializeAchievements
} from '../controllers/achievement.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Protect all achievement routes
router.use(protect);

router.get('/', getAllAchievements);
router.get('/user', getUserAchievements);
router.get('/status', getAchievementsStatus);
router.post('/check/:moduleId', checkAndUnlockAchievements);
router.post('/initialize', initializeAchievements);

export default router;
