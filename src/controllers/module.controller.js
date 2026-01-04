import Module from '../models/Module.model.js';

// @desc    Get all user modules
// @route   GET /api/modules
// @access  Private
export const getModules = async (req, res) => {
  try {
    const modules = await Module.find({ user: req.user.id, isActive: true })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: modules.length,
      data: modules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar módulos',
      error: error.message
    });
  }
};

// @desc    Get specific module
// @route   GET /api/modules/:id
// @access  Private
export const getModule = async (req, res) => {
  try {
    const module = await Module.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Módulo não encontrado'
      });
    }

    res.status(200).json({
      success: true,
      data: module
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar módulo',
      error: error.message
    });
  }
};

// @desc    Create new module
// @route   POST /api/modules
// @access  Private
export const createModule = async (req, res) => {
  try {
    const { moduleId } = req.body;

    if (!moduleId) {
      return res.status(400).json({
        success: false,
        message: 'moduleId é obrigatório'
      });
    }

    // Check if module already exists for this user
    const existingModule = await Module.findOne({
      user: req.user.id,
      moduleId,
      isActive: true
    });

    if (existingModule) {
      return res.status(400).json({
        success: false,
        message: 'Você já possui este módulo ativo'
      });
    }

    // Check module limit based on plan
    const userModules = await Module.countDocuments({
      user: req.user.id,
      isActive: true
    });

    const maxModules = req.user.plan === 'free' ? 1 : req.user.plan === 'premium' ? 3 : 999;

    if (userModules >= maxModules) {
      return res.status(403).json({
        success: false,
        message: `Você atingiu o limite de ${maxModules} módulo(s) do seu plano ${req.user.plan}`
      });
    }

    const module = await Module.create({
      user: req.user.id,
      moduleId,
      startDate: new Date(),
      lastCheckIn: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Módulo criado com sucesso',
      data: module
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao criar módulo',
      error: error.message
    });
  }
};

// @desc    Update module (manual check-in)
// @route   PUT /api/modules/:id/checkin
// @access  Private
export const checkIn = async (req, res) => {
  try {
    const module = await Module.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Módulo não encontrado'
      });
    }

    const updatedModule = await module.updateDailyProgress();

    res.status(200).json({
      success: true,
      message: 'Check-in realizado com sucesso',
      data: updatedModule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao fazer check-in',
      error: error.message
    });
  }
};

// @desc    Record a relapse
// @route   POST /api/modules/:id/relapse
// @access  Private
export const recordRelapse = async (req, res) => {
  try {
    const { notes } = req.body;

    const module = await Module.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Módulo não encontrado'
      });
    }

    const updatedModule = await module.addRelapse(notes);

    res.status(200).json({
      success: true,
      message: 'Recaída registrada. Não desista, continue tentando!',
      data: updatedModule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao registrar recaída',
      error: error.message
    });
  }
};

// @desc    Delete/deactivate module
// @route   DELETE /api/modules/:id
// @access  Private
export const deleteModule = async (req, res) => {
  try {
    const module = await Module.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Módulo não encontrado'
      });
    }

    module.isActive = false;
    await module.save();

    res.status(200).json({
      success: true,
      message: 'Módulo desativado com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar módulo',
      error: error.message
    });
  }
};

// @desc    Get module statistics
// @route   GET /api/modules/:id/stats
// @access  Private
export const getModuleStats = async (req, res) => {
  try {
    const module = await Module.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Módulo não encontrado'
      });
    }

    const stats = {
      dayCount: module.dayCount,
      currentStreak: module.currentStreak,
      longestStreak: module.longestStreak,
      totalRelapses: module.totalRelapses,
      level: module.level,
      points: module.points,
      startDate: module.startDate,
      lastCheckIn: module.lastCheckIn,
      relapseHistory: module.relapseHistory,
      averageDaysBetweenRelapses: module.totalRelapses > 0 
        ? Math.floor(module.dayCount / module.totalRelapses) 
        : module.dayCount,
      successRate: module.totalRelapses > 0
        ? Math.round((module.dayCount / (module.dayCount + module.totalRelapses)) * 100)
        : 100
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar estatísticas',
      error: error.message
    });
  }
};
