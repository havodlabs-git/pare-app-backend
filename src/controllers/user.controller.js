import { getFirestore } from '../config/firestore.js';
import bcrypt from 'bcryptjs';

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

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const { name, photoUrl, settings } = req.body;
    const db = getFirestore();

    const userRef = db.collection('users').doc(req.user.id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    const updateData = {
      updatedAt: new Date()
    };

    // Only update fields that were provided
    if (name !== undefined && name.trim()) {
      updateData.name = name.trim();
    }

    if (photoUrl !== undefined) {
      updateData.photoUrl = photoUrl;
    }

    if (settings !== undefined) {
      updateData.settings = settings;
    }

    await userRef.update(updateData);

    // Get updated user data
    const updatedUserDoc = await userRef.get();
    const updatedUser = { id: updatedUserDoc.id, ...updatedUserDoc.data() };
    delete updatedUser.password;

    res.status(200).json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      data: updatedUser
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar perfil',
      error: error.message
    });
  }
};

// @desc    Change user password
// @route   PUT /api/users/password
// @access  Private
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const db = getFirestore();

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'A nova senha deve ter pelo menos 6 caracteres'
      });
    }

    const userRef = db.collection('users').doc(req.user.id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    const userData = userDoc.data();

    // If currentPassword is provided, verify it
    // If not provided (admin reset or first-time setup), skip verification
    if (currentPassword && userData.password) {
      const isMatch = await bcrypt.compare(currentPassword, userData.password);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Senha atual incorreta'
        });
      }
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await userRef.update({
      password: hashedPassword,
      updatedAt: new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Senha alterada com sucesso'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao alterar senha',
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

// @desc    Delete user account
// @route   DELETE /api/users/account
// @access  Private
export const deleteAccount = async (req, res) => {
  try {
    const db = getFirestore();
    const userId = req.user.id;

    // Delete user's modules
    const modulesSnapshot = await db.collection('modules').where('userId', '==', userId).get();
    const batch = db.batch();
    modulesSnapshot.docs.forEach(doc => batch.delete(doc.ref));

    // Delete user's achievements
    const achievementsSnapshot = await db.collection('userAchievements').where('userId', '==', userId).get();
    achievementsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

    // Delete user's forum posts
    const postsSnapshot = await db.collection('forumPosts').where('authorId', '==', userId).get();
    postsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

    // Delete user document
    batch.delete(db.collection('users').doc(userId));

    await batch.commit();

    res.status(200).json({
      success: true,
      message: 'Conta excluída com sucesso'
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao excluir conta',
      error: error.message
    });
  }
};

// @desc    Get user dashboard data
// @route   GET /api/users/dashboard
// @access  Private
export const getDashboard = async (req, res) => {
  try {
    const db = getFirestore();
    const userId = req.user.id;

    // Get user data
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    const userData = { id: userDoc.id, ...userDoc.data() };
    delete userData.password;

    // Get user's modules
    const modulesSnapshot = await db.collection('modules').where('userId', '==', userId).get();
    const modules = modulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Get user's achievements
    const achievementsSnapshot = await db.collection('userAchievements').where('userId', '==', userId).get();
    const achievements = achievementsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Calculate stats
    const totalDays = modules.reduce((sum, m) => sum + (m.dayCount || 0), 0);
    const totalPoints = modules.reduce((sum, m) => sum + (m.points || 0), 0);
    const longestStreak = Math.max(...modules.map(m => m.longestStreak || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        user: userData,
        modules,
        achievements,
        stats: {
          totalDays,
          totalPoints,
          longestStreak,
          totalModules: modules.length,
          totalAchievements: achievements.length
        }
      }
    });
  } catch (error) {
    console.error('Error getting dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar dados do dashboard',
      error: error.message
    });
  }
};
