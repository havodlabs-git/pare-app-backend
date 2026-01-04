import express from 'express';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Protect all achievement routes
router.use(protect);

// TODO: Implement achievement routes
// GET /api/achievements - Get all achievements
// GET /api/achievements/user - Get user's unlocked achievements
// POST /api/achievements/unlock/:id - Unlock an achievement

router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Achievements endpoint (TODO)'
  });
});

export default router;
