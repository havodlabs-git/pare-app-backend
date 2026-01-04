import express from 'express';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Protect all forum routes
router.use(protect);

// TODO: Implement forum routes
// GET /api/forum/posts - Get all posts
// POST /api/forum/posts - Create new post
// GET /api/forum/posts/:id - Get specific post
// PUT /api/forum/posts/:id - Update post
// DELETE /api/forum/posts/:id - Delete post
// POST /api/forum/posts/:id/comments - Add comment
// POST /api/forum/posts/:id/like - Like/unlike post

router.get('/posts', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Forum posts endpoint (TODO)'
  });
});

export default router;
