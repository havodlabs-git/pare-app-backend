import express from 'express';
import {
  getProfile,
  updateProfile,
  changePassword,
  updatePlan,
  deleteAccount,
  getDashboard
} from '../controllers/user.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Protect all user routes
router.use(protect);

router.get('/dashboard', getDashboard);

router.route('/profile')
  .get(getProfile)
  .put(updateProfile);

router.put('/password', changePassword);
router.put('/plan', updatePlan);
router.delete('/account', deleteAccount);

export default router;
