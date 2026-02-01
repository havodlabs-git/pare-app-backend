import express from 'express';
import { handleStripeWebhook } from '../controllers/stripe-webhook.controller.js';

const router = express.Router();

// Stripe webhook endpoint - não precisa de autenticação, usa assinatura do Stripe
router.post('/webhook', handleStripeWebhook);

export default router;
