import User from '../models/User.model.js';
import Module from '../models/Module.model.js';
import UserAchievement from '../models/UserAchievement.model.js';

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Get user's modules
    const modules = await Module.find({
      user: req.user.id,
      isActive: true
    });

    // Get user's achievements
    const achievements = await UserAchievement.find({
      user: req.user.id
    }).populate('achievement');

    // Calculate total points from modules and achievements
    const modulePoints = modules.reduce((sum, m) => sum + m.points, 0);
    const achievementPoints = achievements.reduce((sum, a) => sum + a.achievement.points, 0);
    const totalPoints = modulePoints + achievementPoints;

    // Calculate highest level
    const highestLevel = modules.length > 0 
      ? Math.max(...modules.map(m => m.level))
      : 1;

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          plan: user.plan,
          planExpiresAt: user.planExpiresAt,
          isPlanActive: user.isPlanActive(),
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        },
        stats: {
          totalModules: modules.length,
          totalAchievements: achievements.length,
          totalPoints,
          highestLevel,
          totalDays: modules.reduce((sum, m) => sum + m.dayCount, 0)
        }
      }
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
    const { name, email } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Check if email is being changed and if it's already in use
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Este email já está em uso'
        });
      }
      user.email = email;
    }

    if (name) user.name = name;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        plan: user.plan
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar perfil',
      error: error.message
    });
  }
};

// @desc    Change password
// @route   PUT /api/users/password
// @access  Private
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Senha atual e nova senha são obrigatórias'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Nova senha deve ter no mínimo 6 caracteres'
      });
    }

    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Check current password
    const isPasswordCorrect = await user.comparePassword(currentPassword);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Senha atual incorreta'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Senha alterada com sucesso'
    });
  } catch (error) {
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

    if (!['free', 'premium', 'elite'].includes(plan)) {
      return res.status(400).json({
        success: false,
        message: 'Plano inválido. Escolha: free, premium ou elite'
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    user.plan = plan;
    
    // Set expiration date for paid plans (30 days from now)
    if (plan !== 'free') {
      user.planExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    } else {
      user.planExpiresAt = null;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: `Plano atualizado para ${plan}`,
      data: {
        plan: user.plan,
        planExpiresAt: user.planExpiresAt
      }
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
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Senha é obrigatória para deletar a conta'
      });
    }

    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Verify password
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Senha incorreta'
      });
    }

    // Deactivate user instead of deleting
    user.isActive = false;
    await user.save();

    // Deactivate all user's modules
    await Module.updateMany(
      { user: req.user.id },
      { isActive: false }
    );

    res.status(200).json({
      success: true,
      message: 'Conta desativada com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar conta',
      error: error.message
    });
  }
};

// @desc    Get user dashboard data
// @route   GET /api/users/dashboard
// @access  Private
export const getDashboard = async (req, res) => {
  try {
    // Get all user's active modules
    const modules = await Module.find({
      user: req.user.id,
      isActive: true
    }).sort({ dayCount: -1 });

    // Get user's achievements
    const achievements = await UserAchievement.find({
      user: req.user.id
    }).populate('achievement');

    // Calculate overall stats
    const totalDays = modules.reduce((sum, m) => sum + m.dayCount, 0);
    const totalPoints = modules.reduce((sum, m) => sum + m.points, 0);
    const longestStreak = modules.length > 0 
      ? Math.max(...modules.map(m => m.longestStreak))
      : 0;
    const totalRelapses = modules.reduce((sum, m) => sum + m.totalRelapses, 0);

    // Get current module (most recent or with highest day count)
    const currentModule = modules[0] || null;

    res.status(200).json({
      success: true,
      data: {
        modules,
        currentModule,
        achievements: achievements.length,
        stats: {
          totalDays,
          totalPoints,
          longestStreak,
          totalRelapses,
          activeModules: modules.length
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar dashboard',
      error: error.message
    });
  }
};
