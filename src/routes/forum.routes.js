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

// Protect all forum routes
router.use(protect);

router.get('/stats', getForumStats);

router.route('/posts')
  .get(getPosts)
  .post(createPost);

router.route('/posts/:id')
  .get(getPost)
  .put(updatePost)
  .delete(deletePost);

router.post('/posts/:id/like', toggleLike);
router.post('/posts/:id/reply', addReply);
router.delete('/posts/:id/reply/:replyId', deleteReply);

export default router;
