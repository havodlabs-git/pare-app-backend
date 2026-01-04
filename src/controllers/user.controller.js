import { getFirestore } from '../config/firestore.js';

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
export const getProfile = async (req, res) => {
  try {
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(req.user.id).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    const user = { id: userDoc.id, ...userDoc.data() };
    delete user.password;

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar perfil',
      error: error.message
    });
  }
};

// @desc    Update user plan
// @route   PUT /api/users/plan
// @access  Private
export const updatePlan = async (req, res) => {
  try {
    const { plan } = req.body;
    const db = getFirestore();

    if (!['free', 'premium', 'elite'].includes(plan)) {
      return res.status(400).json({
        success: false,
        message: 'Plano inválido'
      });
    }

    const userRef = db.collection('users').doc(req.user.id);
    const updateData = {
      plan,
      planExpiresAt: plan !== 'free' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
      updatedAt: new Date()
    };

    await userRef.update(updateData);

    res.status(200).json({
      success: true,
      message: `Plano atualizado para ${plan}`,
      data: updateData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar plano',
      error: error.message
    });
  }
};

// Placeholder exports for other functions
export const updateProfile = async (req, res) => {
  res.status(501).json({ success: false, message: 'Funcionalidade em desenvolvimento' });
};

export const changePassword = async (req, res) => {
  res.status(501).json({ success: false, message: 'Funcionalidade em desenvolvimento' });
};

export const deleteAccount = async (req, res) => {
  res.status(501).json({ success: false, message: 'Funcionalidade em desenvolvimento' });
};

export const getDashboard = async (req, res) => {
  res.status(501).json({ success: false, message: 'Funcionalidade em desenvolvimento' });
};
