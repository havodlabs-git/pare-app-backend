import jwt from 'jsonwebtoken';
import { getFirestore } from '../config/firestore.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Não autorizado. Token não fornecido.'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

      // Get user from Firestore
      const db = getFirestore();
      const userDoc = await db.collection('users').doc(decoded.id).get();

      if (!userDoc.exists) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      const user = { id: userDoc.id, ...userDoc.data() };

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Conta desativada'
        });
      }

      // Attach user to request
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan
      };

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido ou expirado'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro na autenticação',
      error: error.message
    });
  }
};

export const restrictTo = (...plans) => {
  return (req, res, next) => {
    if (!plans.includes(req.user.plan)) {
      return res.status(403).json({
        success: false,
        message: 'Você não tem permissão para acessar este recurso.'
      });
    }
    next();
  };
};

// Middleware for professional authentication
// Middleware for admin authentication
export const protectAdmin = async (req, res, next) => {
  try {
    // Check if user is admin
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Não autorizado'
      });
    }

    const db = getFirestore();
    const userDoc = await db.collection('users').doc(req.user.id).get();
    
    if (!userDoc.exists) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    const user = userDoc.data();
    
    if (!user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Apenas administradores podem acessar este recurso.'
      });
    }

    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro na autenticação de admin',
      error: error.message
    });
  }
};

export const protectProfessional = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Não autorizado. Token não fornecido.'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

      // Check if token is for professional
      if (decoded.type !== 'professional') {
        return res.status(401).json({
          success: false,
          message: 'Token inválido para profissional'
        });
      }

      const db = getFirestore();
      const professionalDoc = await db.collection('professionals').doc(decoded.id).get();

      if (!professionalDoc.exists) {
        return res.status(401).json({
          success: false,
          message: 'Profissional não encontrado'
        });
      }

      const professional = { id: professionalDoc.id, ...professionalDoc.data() };

      if (!professional.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Conta desativada'
        });
      }

      req.professional = {
        id: professional.id,
        email: professional.email,
        name: professional.name
      };

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido ou expirado'
      });
    }
  } catch (error) {
    console.error('Professional auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro na autenticação',
      error: error.message
    });
  }
};
