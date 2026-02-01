import express from 'express';
import crypto from 'crypto';
import { getFirestore } from '../config/firestore.js';
import { sendOTPEmail } from '../services/email.service.js';

const router = express.Router();

// Configurações de OTP
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const MAX_OTP_ATTEMPTS = 5;

/**
 * Gera um código OTP numérico
 * @param {number} length - Tamanho do código
 * @returns {string} Código OTP
 */
const generateOTPCode = (length = OTP_LENGTH) => {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += digits[crypto.randomInt(0, digits.length)];
  }
  return code;
};

/**
 * POST /api/otp/send
 * Envia um código OTP para o email do usuário
 */
router.post('/send', async (req, res) => {
  try {
    const { email, purpose = 'login' } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email é obrigatório'
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Email inválido'
      });
    }

    const db = getFirestore();
    const normalizedEmail = email.toLowerCase().trim();

    // Verificar se o usuário existe (para login)
    if (purpose === 'login') {
      const userSnapshot = await db.collection('users')
        .where('email', '==', normalizedEmail)
        .get();

      if (userSnapshot.empty) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }
    }

    // Verificar cooldown de reenvio
    const recentOTP = await db.collection('otp_codes')
      .where('email', '==', normalizedEmail)
      .where('purpose', '==', purpose)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (!recentOTP.empty) {
      const lastOTP = recentOTP.docs[0].data();
      const lastSentAt = lastOTP.createdAt.toDate();
      const secondsSinceLastSend = (Date.now() - lastSentAt.getTime()) / 1000;

      if (secondsSinceLastSend < OTP_RESEND_COOLDOWN_SECONDS) {
        const waitTime = Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLastSend);
        return res.status(429).json({
          success: false,
          message: `Aguarde ${waitTime} segundos antes de solicitar um novo código`,
          retryAfter: waitTime
        });
      }
    }

    // Gerar novo código OTP
    const code = generateOTPCode();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Invalidar códigos anteriores
    const previousCodes = await db.collection('otp_codes')
      .where('email', '==', normalizedEmail)
      .where('purpose', '==', purpose)
      .where('used', '==', false)
      .get();

    const batch = db.batch();
    previousCodes.forEach(doc => {
      batch.update(doc.ref, { used: true, invalidatedAt: new Date() });
    });

    // Salvar novo código
    const otpRef = db.collection('otp_codes').doc();
    batch.set(otpRef, {
      email: normalizedEmail,
      code,
      purpose,
      used: false,
      attempts: 0,
      createdAt: new Date(),
      expiresAt,
    });

    await batch.commit();

    // Buscar nome do usuário para personalizar o email
    let userName = '';
    const userSnapshot = await db.collection('users')
      .where('email', '==', normalizedEmail)
      .get();
    
    if (!userSnapshot.empty) {
      userName = userSnapshot.docs[0].data().name || '';
    }

    // Enviar email com OTP
    try {
      await sendOTPEmail(normalizedEmail, code, userName);
      console.log(`OTP sent to ${normalizedEmail} for ${purpose}`);
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError);
      // Em desenvolvimento, retornar o código para teste
      if (process.env.NODE_ENV === 'development') {
        return res.status(200).json({
          success: true,
          message: 'Código gerado (email não configurado)',
          devCode: code, // Apenas em desenvolvimento
          expiresIn: OTP_EXPIRY_MINUTES * 60
        });
      }
      return res.status(500).json({
        success: false,
        message: 'Erro ao enviar email. Tente novamente.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Código enviado para seu email',
      expiresIn: OTP_EXPIRY_MINUTES * 60
    });

  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao enviar código'
    });
  }
});

/**
 * POST /api/otp/verify
 * Verifica um código OTP
 */
router.post('/verify', async (req, res) => {
  try {
    const { email, code, purpose = 'login' } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email e código são obrigatórios'
      });
    }

    const db = getFirestore();
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedCode = code.trim();

    // Buscar OTP válido
    const otpSnapshot = await db.collection('otp_codes')
      .where('email', '==', normalizedEmail)
      .where('purpose', '==', purpose)
      .where('used', '==', false)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (otpSnapshot.empty) {
      return res.status(400).json({
        success: false,
        message: 'Código inválido ou expirado. Solicite um novo código.'
      });
    }

    const otpDoc = otpSnapshot.docs[0];
    const otpData = otpDoc.data();

    // Verificar expiração
    const expiresAt = otpData.expiresAt.toDate();
    if (new Date() > expiresAt) {
      await otpDoc.ref.update({ used: true, expiredAt: new Date() });
      return res.status(400).json({
        success: false,
        message: 'Código expirado. Solicite um novo código.'
      });
    }

    // Verificar tentativas
    if (otpData.attempts >= MAX_OTP_ATTEMPTS) {
      await otpDoc.ref.update({ used: true, blockedAt: new Date() });
      return res.status(400).json({
        success: false,
        message: 'Muitas tentativas incorretas. Solicite um novo código.'
      });
    }

    // Verificar código
    if (otpData.code !== normalizedCode) {
      await otpDoc.ref.update({ attempts: otpData.attempts + 1 });
      const remainingAttempts = MAX_OTP_ATTEMPTS - otpData.attempts - 1;
      return res.status(400).json({
        success: false,
        message: `Código incorreto. ${remainingAttempts} tentativa(s) restante(s).`,
        remainingAttempts
      });
    }

    // Código válido - marcar como usado
    await otpDoc.ref.update({
      used: true,
      verifiedAt: new Date()
    });

    // Se for login, gerar token de autenticação
    if (purpose === 'login') {
      const userSnapshot = await db.collection('users')
        .where('email', '==', normalizedEmail)
        .get();

      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0];
        const user = { id: userDoc.id, ...userDoc.data() };

        // Atualizar último login
        await userDoc.ref.update({
          lastLogin: new Date(),
          updatedAt: new Date()
        });

        // Gerar token JWT
        const jwt = await import('jsonwebtoken');
        const token = jwt.default.sign(
          { id: user.id },
          process.env.JWT_SECRET || 'pare-app-secret-key',
          { expiresIn: '30d' }
        );

        return res.status(200).json({
          success: true,
          message: 'Login realizado com sucesso',
          data: {
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              plan: user.plan,
              planExpiresAt: user.planExpiresAt?.toDate() || null
            },
            token
          }
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Código verificado com sucesso',
      verified: true
    });

  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar código'
    });
  }
});

/**
 * POST /api/otp/resend
 * Reenvia um código OTP (alias para /send)
 */
router.post('/resend', async (req, res) => {
  // Redirecionar para /send
  req.url = '/send';
  router.handle(req, res);
});

export default router;
