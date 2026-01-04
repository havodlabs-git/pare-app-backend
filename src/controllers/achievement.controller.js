import Achievement from '../models/Achievement.model.js';
import UserAchievement from '../models/UserAchievement.model.js';
import Module from '../models/Module.model.js';

// @desc    Get all achievements
// @route   GET /api/achievements
// @access  Private
export const getAllAchievements = async (req, res) => {
  try {
    const achievements = await Achievement.find().sort({ requirement: 1 });

    res.status(200).json({
      success: true,
      count: achievements.length,
      data: achievements
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar conquistas',
      error: error.message
    });
  }
};

// @desc    Get user's unlocked achievements
// @route   GET /api/achievements/user
// @access  Private
export const getUserAchievements = async (req, res) => {
  try {
    const { moduleId } = req.query;

    const query = { user: req.user.id };
    if (moduleId) {
      query.moduleId = moduleId;
    }

    const userAchievements = await UserAchievement.find(query)
      .populate('achievement')
      .sort({ unlockedAt: -1 });

    const totalPoints = userAchievements.reduce((sum, ua) => sum + ua.achievement.points, 0);

    res.status(200).json({
      success: true,
      count: userAchievements.length,
      totalPoints,
      data: userAchievements
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar conquistas do usuário',
      error: error.message
    });
  }
};

// @desc    Get achievements with unlock status for user
// @route   GET /api/achievements/status
// @access  Private
export const getAchievementsStatus = async (req, res) => {
  try {
    const { moduleId } = req.query;

    // Get all achievements
    const allAchievements = await Achievement.find().sort({ requirement: 1 });

    // Get user's unlocked achievements
    const query = { user: req.user.id };
    if (moduleId) {
      query.moduleId = moduleId;
    }
    const unlockedAchievements = await UserAchievement.find(query);
    const unlockedIds = unlockedAchievements.map(ua => ua.achievementId);

    // Get module data if specified
    let moduleData = null;
    if (moduleId) {
      moduleData = await Module.findOne({
        user: req.user.id,
        moduleId,
        isActive: true
      });
    }

    // Combine data
    const achievementsWithStatus = allAchievements.map(achievement => {
      const unlocked = unlockedIds.includes(achievement.id);
      const userAchievement = unlockedAchievements.find(ua => ua.achievementId === achievement.id);

      return {
        ...achievement.toObject(),
        unlocked,
        unlockedAt: userAchievement?.unlockedAt || null,
        progress: moduleData ? calculateProgress(achievement, moduleData) : null
      };
    });

    const unlockedCount = achievementsWithStatus.filter(a => a.unlocked).length;
    const totalPoints = achievementsWithStatus
      .filter(a => a.unlocked)
      .reduce((sum, a) => sum + a.points, 0);

    res.status(200).json({
      success: true,
      total: achievementsWithStatus.length,
      unlocked: unlockedCount,
      totalPoints,
      data: achievementsWithStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar status das conquistas',
      error: error.message
    });
  }
};

// Helper function to calculate progress
function calculateProgress(achievement, moduleData) {
  const value = achievement.type === 'dayCount' ? moduleData.dayCount : moduleData.longestStreak;
  const progress = Math.min((value / achievement.requirement) * 100, 100);
  return {
    current: value,
    required: achievement.requirement,
    percentage: Math.round(progress)
  };
}

// @desc    Check and unlock achievements for a module
// @route   POST /api/achievements/check/:moduleId
// @access  Private
export const checkAndUnlockAchievements = async (req, res) => {
  try {
    const { moduleId } = req.params;

    // Get module data
    const module = await Module.findOne({
      user: req.user.id,
      moduleId,
      isActive: true
    });

    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Módulo não encontrado'
      });
    }

    // Get all achievements
    const allAchievements = await Achievement.find();

    // Get already unlocked achievements
    const unlockedAchievements = await UserAchievement.find({
      user: req.user.id,
      moduleId
    });
    const unlockedIds = unlockedAchievements.map(ua => ua.achievementId);

    // Check which achievements should be unlocked
    const newlyUnlocked = [];

    for (const achievement of allAchievements) {
      // Skip if already unlocked
      if (unlockedIds.includes(achievement.id)) continue;

      // Check if requirement is met
      const value = achievement.type === 'dayCount' ? module.dayCount : module.longestStreak;
      
      if (value >= achievement.requirement) {
        // Unlock achievement
        const userAchievement = await UserAchievement.create({
          user: req.user.id,
          achievement: achievement._id,
          achievementId: achievement.id,
          moduleId
        });

        newlyUnlocked.push({
          ...achievement.toObject(),
          unlockedAt: userAchievement.unlockedAt
        });
      }
    }

    res.status(200).json({
      success: true,
      message: newlyUnlocked.length > 0 
        ? `${newlyUnlocked.length} nova(s) conquista(s) desbloqueada(s)!`
        : 'Nenhuma nova conquista desbloqueada',
      count: newlyUnlocked.length,
      data: newlyUnlocked
    });
  } catch (error) {
    // Handle duplicate key error (achievement already unlocked)
    if (error.code === 11000) {
      return res.status(200).json({
        success: true,
        message: 'Conquistas já verificadas',
        count: 0,
        data: []
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro ao verificar conquistas',
      error: error.message
    });
  }
};

// @desc    Initialize default achievements (admin/setup)
// @route   POST /api/achievements/initialize
// @access  Private
export const initializeAchievements = async (req, res) => {
  try {
    const defaultAchievements = [
      {
        id: 'first_day',
        title: 'Primeiro Passo',
        description: 'Complete seu primeiro dia',
        requirement: 1,
        points: 10,
        type: 'dayCount',
        icon: 'star'
      },
      {
        id: 'week_warrior',
        title: 'Guerreiro de Uma Semana',
        description: 'Mantenha-se limpo por 7 dias',
        requirement: 7,
        points: 50,
        type: 'dayCount',
        icon: 'shield'
      },
      {
        id: 'two_weeks',
        title: 'Fortaleza de Duas Semanas',
        description: '14 dias de determinação',
        requirement: 14,
        points: 100,
        type: 'dayCount',
        icon: 'target'
      },
      {
        id: 'month_master',
        title: 'Mestre do Mês',
        description: 'Um mês completo de sucesso',
        requirement: 30,
        points: 200,
        type: 'dayCount',
        icon: 'award'
      },
      {
        id: 'streak_10',
        title: 'Sequência de Ouro',
        description: 'Sequência de 10 dias',
        requirement: 10,
        points: 75,
        type: 'streak',
        icon: 'zap'
      },
      {
        id: 'ninety_days',
        title: 'Transformação 90 Dias',
        description: '90 dias de mudança real',
        requirement: 90,
        points: 500,
        type: 'dayCount',
        icon: 'rocket'
      },
      {
        id: 'half_year',
        title: 'Guardião do Semestre',
        description: '6 meses de autodisciplina',
        requirement: 180,
        points: 1000,
        type: 'dayCount',
        icon: 'crown'
      },
      {
        id: 'year_legend',
        title: 'Lenda do Ano',
        description: '1 ano completo - você é inspiração!',
        requirement: 365,
        points: 5000,
        type: 'dayCount',
        icon: 'trophy'
      }
    ];

    // Clear existing achievements
    await Achievement.deleteMany({});

    // Insert default achievements
    const achievements = await Achievement.insertMany(defaultAchievements);

    res.status(201).json({
      success: true,
      message: 'Conquistas inicializadas com sucesso',
      count: achievements.length,
      data: achievements
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao inicializar conquistas',
      error: error.message
    });
  }
};
