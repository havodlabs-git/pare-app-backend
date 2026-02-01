import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Import Firestore config
import { initializeFirestore } from './config/firestore.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import moduleRoutes from './routes/module.routes.js';
import achievementRoutes from './routes/achievement.routes.js';
import forumRoutes from './routes/forum.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import appointmentRoutes from './routes/appointment.routes.js';
import professionalRoutes from './routes/professional.routes.js';
import adminRoutes from './routes/admin.routes.js';
import chatRoutes from './routes/chat.routes.js';
import stripeWebhookRoutes from './routes/stripe-webhook.routes.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 8080;

// Initialize Firestore
initializeFirestore();

// Security middleware - configurado para permitir CORS
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  contentSecurityPolicy: false // Desabilitar CSP para permitir requisições cross-origin
}));

// CORS configuration - permitir todas as origens em desenvolvimento
const corsOptions = {
  origin: true, // Permite qualquer origem
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// Preflight requests
app.options('*', cors(corsOptions));

// Rate limiting - DESABILITADO TEMPORARIAMENTE para resolver problemas de login
// O rate limiter estava bloqueando requisições legítimas
// TODO: Reabilitar com configuração mais permissiva após estabilizar
/*
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests por 15 min
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);
*/

// Stripe webhook precisa do raw body ANTES do json parser
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Pare! API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/professionals', professionalRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/stripe', stripeWebhookRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint não encontrado'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS Origin: ${process.env.CORS_ORIGIN || '*'}`);
});

export default app;
