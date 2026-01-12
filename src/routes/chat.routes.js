import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { protectProfessional } from '../middleware/professional.middleware.js';
import {
  startConversation,
  getUserConversations,
  getProfessionalConversations,
  sendMessage,
  getMessages,
  endConversation,
  getAvailableProfessionals
} from '../controllers/chat.controller.js';

const router = express.Router();

// ==================== ROTAS PARA USUÁRIOS ====================
// Todas requerem autenticação de usuário

// Obter profissionais disponíveis para chat
router.get('/professionals', protect, getAvailableProfessionals);

// Iniciar conversa com profissional
router.post('/conversations', protect, startConversation);

// Obter conversas do usuário
router.get('/conversations', protect, getUserConversations);

// Obter mensagens de uma conversa (usuário)
router.get('/conversations/:conversationId/messages', protect, getMessages);

// Enviar mensagem (usuário)
router.post('/messages', protect, sendMessage);

// Encerrar conversa (usuário)
router.post('/conversations/:conversationId/end', protect, endConversation);

// ==================== ROTAS PARA PROFISSIONAIS ====================
// Todas requerem autenticação de profissional

// Obter conversas do profissional
router.get('/professional/conversations', protectProfessional, getProfessionalConversations);

// Obter mensagens de uma conversa (profissional)
router.get('/professional/conversations/:conversationId/messages', protectProfessional, getMessages);

// Enviar mensagem (profissional)
router.post('/professional/messages', protectProfessional, sendMessage);

// Encerrar conversa (profissional)
router.post('/professional/conversations/:conversationId/end', protectProfessional, endConversation);

export default router;
