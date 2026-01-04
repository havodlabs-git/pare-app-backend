import express from 'express';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Protect all user routes
router.use(protect);

// TODO: Implement user routes
// GET /api/users/profile - Get user profile
// PUT /api/users/profile - Update user profile
// DELETE /api/users/account - Delete user account
// PUT /api/users/password - Change password

router.get('/profile', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'User profile endpoint (TODO)'
  });
});

export default router;
