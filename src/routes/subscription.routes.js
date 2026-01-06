import express from 'express';
import { 
  getPlans, 
  getCurrentSubscription, 
  createSubscription,
  cancelSubscription,
  verifyGooglePayment
} from '../controllers/subscription.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes
router.get('/plans', getPlans);

// Protected routes
router.get('/current', protect, getCurrentSubscription);
router.post('/create', protect, createSubscription);
router.post('/cancel', protect, cancelSubscription);
router.post('/verify-google-payment', protect, verifyGooglePayment);

export default router;
