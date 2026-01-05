import express from 'express';
import {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  toggleLike,
  addReply,
  deleteReply,
  getForumStats
} from '../controllers/forum.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes (no auth required)
router.get('/stats', getForumStats);
router.get('/posts', getPosts);
router.get('/posts/:id', getPost);

// Protected routes (auth required)
router.post('/posts', protect, createPost);
router.put('/posts/:id', protect, updatePost);
router.delete('/posts/:id', protect, deletePost);

router.post('/posts/:id/like', protect, toggleLike);
router.post('/posts/:id/reply', protect, addReply);
router.delete('/posts/:id/reply/:replyId', protect, deleteReply);

export default router;
