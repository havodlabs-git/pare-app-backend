const db = require('../config/database');
const bcrypt = require('bcryptjs');

// Dashboard - Métricas gerais
exports.getDashboard = async (req, res) => {
  try {
    // Total de usuários
    const [usersResult] = await db.query('SELECT COUNT(*) as total FROM users');
    const totalUsers = usersResult[0].total;

    // Usuários ativos (últimos 7 dias)
    const [activeResult] = await db.query(
      'SELECT COUNT(*) as total FROM users WHERE lastLoginAt > DATE_SUB(NOW(), INTERVAL 7 DAY)'
    );
    const activeUsers = activeResult[0].total;

    // Novos usuários hoje
    const [newTodayResult] = await db.query(
      'SELECT COUNT(*) as total FROM users WHERE DATE(createdAt) = CURDATE()'
    );
    const newUsersToday = newTodayResult[0].total;

    // Usuários por plano
    const [planResult] = await db.query(
      'SELECT plan, COUNT(*) as count FROM users GROUP BY plan'
    );
    const usersByPlan = planResult.reduce((acc, row) => {
      acc[row.plan] = row.count;
      return acc;
    }, { free: 0, premium: 0, elite: 0 });

    // Total de posts
    const [postsResult] = await db.query('SELECT COUNT(*) as total FROM forum_posts');
    const totalPosts = postsResult[0].total;

    // Posts pendentes de aprovação
    const [pendingPostsResult] = await db.query(
      'SELECT COUNT(*) as total FROM forum_posts WHERE status = "pending"'
    );
    const pendingPosts = pendingPostsResult[0].total;

    // Total de profissionais
    const [professionalsResult] = await db.query('SELECT COUNT(*) as total FROM professionals');
    const totalProfessionals = professionalsResult[0].total;

    // Agendamentos hoje
    const [appointmentsTodayResult] = await db.query(
      'SELECT COUNT(*) as total FROM appointments WHERE DATE(scheduledAt) = CURDATE()'
    );
    const appointmentsToday = appointmentsTodayResult[0].total;

    // Receita do mês (assinaturas)
    const [revenueResult] = await db.query(
      `SELECT SUM(amount) as total FROM subscriptions 
       WHERE status = 'active' AND MONTH(createdAt) = MONTH(NOW()) AND YEAR(createdAt) = YEAR(NOW())`
    );
    const monthlyRevenue = revenueResult[0].total || 0;

    // Usuários registrados por dia (últimos 30 dias)
    const [registrationTrend] = await db.query(
      `SELECT DATE(createdAt) as date, COUNT(*) as count 
       FROM users 
       WHERE createdAt > DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY DATE(createdAt)
       ORDER BY date ASC`
    );

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          newToday: newUsersToday,
          byPlan: usersByPlan
        },
        forum: {
          totalPosts,
          pendingPosts
        },
        professionals: {
          total: totalProfessionals
        },
        appointments: {
          today: appointmentsToday
        },
        revenue: {
          monthly: monthlyRevenue
        },
        trends: {
          registrations: registrationTrend
        }
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: 'Erro ao carregar dashboard' });
  }
};

// ==================== USUÁRIOS ====================

exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', plan = '', status = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (name LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (plan) {
      whereClause += ' AND plan = ?';
      params.push(plan);
    }
    if (status === 'banned') {
      whereClause += ' AND isBanned = 1';
    } else if (status === 'active') {
      whereClause += ' AND isBanned = 0';
    }

    const [users] = await db.query(
      `SELECT id, name, email, plan, streak, points, level, isBanned, createdAt, lastLoginAt, trialEndsAt
       FROM users WHERE ${whereClause} ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [countResult] = await db.query(
      `SELECT COUNT(*) as total FROM users WHERE ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          pages: Math.ceil(countResult[0].total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar usuários' });
  }
};

exports.getUser = async (req, res) => {
  try {
    const [users] = await db.query(
      `SELECT id, name, email, plan, streak, points, level, isBanned, createdAt, lastLoginAt, trialEndsAt, recordStreak
       FROM users WHERE id = ?`,
      [req.params.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }

    // Buscar módulos do usuário
    const [modules] = await db.query(
      'SELECT * FROM user_modules WHERE userId = ?',
      [req.params.id]
    );

    // Buscar conquistas
    const [achievements] = await db.query(
      'SELECT * FROM user_achievements WHERE userId = ?',
      [req.params.id]
    );

    res.json({
      success: true,
      data: {
        ...users[0],
        modules,
        achievements
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar usuário' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { name, email, plan, points, level, streak } = req.body;
    
    await db.query(
      'UPDATE users SET name = ?, email = ?, plan = ?, points = ?, level = ?, streak = ? WHERE id = ?',
      [name, email, plan, points, level, streak, req.params.id]
    );

    res.json({ success: true, message: 'Usuário atualizado com sucesso' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar usuário' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Usuário removido com sucesso' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Erro ao remover usuário' });
  }
};

exports.banUser = async (req, res) => {
  try {
    const { reason } = req.body;
    await db.query(
      'UPDATE users SET isBanned = 1, banReason = ?, bannedAt = NOW() WHERE id = ?',
      [reason || 'Violação dos termos de uso', req.params.id]
    );
    res.json({ success: true, message: 'Usuário banido com sucesso' });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ success: false, message: 'Erro ao banir usuário' });
  }
};

exports.unbanUser = async (req, res) => {
  try {
    await db.query(
      'UPDATE users SET isBanned = 0, banReason = NULL, bannedAt = NULL WHERE id = ?',
      [req.params.id]
    );
    res.json({ success: true, message: 'Usuário desbanido com sucesso' });
  } catch (error) {
    console.error('Unban user error:', error);
    res.status(500).json({ success: false, message: 'Erro ao desbanir usuário' });
  }
};

// Alterar plano do usuário
exports.updateUserPlan = async (req, res) => {
  try {
    const { plan, duration } = req.body; // duration em meses (1, 12, etc)
    const userId = req.params.id;
    
    if (!['free', 'premium', 'elite'].includes(plan)) {
      return res.status(400).json({ success: false, message: 'Plano inválido' });
    }
    
    // Calcular data de expiração
    let planExpiresAt = null;
    if (plan !== 'free' && duration) {
      planExpiresAt = new Date();
      planExpiresAt.setMonth(planExpiresAt.getMonth() + parseInt(duration));
    }
    
    await db.query(
      'UPDATE users SET plan = ?, planExpiresAt = ?, updatedAt = NOW() WHERE id = ?',
      [plan, planExpiresAt, userId]
    );
    
    // Buscar usuário atualizado
    const [users] = await db.query('SELECT id, name, email, plan, planExpiresAt FROM users WHERE id = ?', [userId]);
    
    res.json({ 
      success: true, 
      message: `Plano atualizado para ${plan.toUpperCase()} com sucesso`,
      data: users[0]
    });
  } catch (error) {
    console.error('Update user plan error:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar plano do usuário' });
  }
};

// ==================== POSTS DO FÓRUM ====================

exports.getPosts = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = '', category = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const params = [];

    if (status) {
      whereClause += ' AND p.status = ?';
      params.push(status);
    }
    if (category) {
      whereClause += ' AND p.category = ?';
      params.push(category);
    }

    const [posts] = await db.query(
      `SELECT p.*, u.name as authorName, u.email as authorEmail,
       (SELECT COUNT(*) FROM forum_comments WHERE postId = p.id) as commentsCount
       FROM forum_posts p
       LEFT JOIN users u ON p.authorId = u.id
       WHERE ${whereClause}
       ORDER BY p.createdAt DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [countResult] = await db.query(
      `SELECT COUNT(*) as total FROM forum_posts p WHERE ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          pages: Math.ceil(countResult[0].total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar posts' });
  }
};

exports.getPost = async (req, res) => {
  try {
    const [posts] = await db.query(
      `SELECT p.*, u.name as authorName, u.email as authorEmail
       FROM forum_posts p
       LEFT JOIN users u ON p.authorId = u.id
       WHERE p.id = ?`,
      [req.params.id]
    );

    if (posts.length === 0) {
      return res.status(404).json({ success: false, message: 'Post não encontrado' });
    }

    // Buscar comentários
    const [comments] = await db.query(
      `SELECT c.*, u.name as authorName
       FROM forum_comments c
       LEFT JOIN users u ON c.authorId = u.id
       WHERE c.postId = ?
       ORDER BY c.createdAt ASC`,
      [req.params.id]
    );

    res.json({
      success: true,
      data: {
        ...posts[0],
        comments
      }
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar post' });
  }
};

exports.updatePost = async (req, res) => {
  try {
    const { title, content, category, status } = req.body;
    
    await db.query(
      'UPDATE forum_posts SET title = ?, content = ?, category = ?, status = ? WHERE id = ?',
      [title, content, category, status, req.params.id]
    );

    res.json({ success: true, message: 'Post atualizado com sucesso' });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar post' });
  }
};

exports.deletePost = async (req, res) => {
  try {
    // Deletar comentários primeiro
    await db.query('DELETE FROM forum_comments WHERE postId = ?', [req.params.id]);
    // Deletar post
    await db.query('DELETE FROM forum_posts WHERE id = ?', [req.params.id]);
    
    res.json({ success: true, message: 'Post removido com sucesso' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ success: false, message: 'Erro ao remover post' });
  }
};

exports.approvePost = async (req, res) => {
  try {
    await db.query(
      'UPDATE forum_posts SET status = "approved" WHERE id = ?',
      [req.params.id]
    );
    res.json({ success: true, message: 'Post aprovado com sucesso' });
  } catch (error) {
    console.error('Approve post error:', error);
    res.status(500).json({ success: false, message: 'Erro ao aprovar post' });
  }
};

exports.rejectPost = async (req, res) => {
  try {
    const { reason } = req.body;
    await db.query(
      'UPDATE forum_posts SET status = "rejected", rejectReason = ? WHERE id = ?',
      [reason || 'Conteúdo inadequado', req.params.id]
    );
    res.json({ success: true, message: 'Post rejeitado' });
  } catch (error) {
    console.error('Reject post error:', error);
    res.status(500).json({ success: false, message: 'Erro ao rejeitar post' });
  }
};

// ==================== PROFISSIONAIS ====================

exports.getProfessionals = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const params = [];

    if (status === 'active') {
      whereClause += ' AND isActive = 1';
    } else if (status === 'inactive') {
      whereClause += ' AND isActive = 0';
    }

    const [professionals] = await db.query(
      `SELECT id, name, email, specialty, crp, bio, photoUrl, hourlyRate, isActive, createdAt,
       (SELECT COUNT(*) FROM appointments WHERE professionalId = professionals.id) as totalAppointments
       FROM professionals WHERE ${whereClause} ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [countResult] = await db.query(
      `SELECT COUNT(*) as total FROM professionals WHERE ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: {
        professionals,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          pages: Math.ceil(countResult[0].total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get professionals error:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar profissionais' });
  }
};

exports.getProfessional = async (req, res) => {
  try {
    const [professionals] = await db.query(
      'SELECT * FROM professionals WHERE id = ?',
      [req.params.id]
    );

    if (professionals.length === 0) {
      return res.status(404).json({ success: false, message: 'Profissional não encontrado' });
    }

    // Buscar horários disponíveis
    const [availability] = await db.query(
      'SELECT * FROM professional_availability WHERE professionalId = ?',
      [req.params.id]
    );

    // Buscar próximos agendamentos
    const [appointments] = await db.query(
      `SELECT a.*, u.name as userName, u.email as userEmail
       FROM appointments a
       LEFT JOIN users u ON a.userId = u.id
       WHERE a.professionalId = ? AND a.scheduledAt >= NOW()
       ORDER BY a.scheduledAt ASC LIMIT 10`,
      [req.params.id]
    );

    res.json({
      success: true,
      data: {
        ...professionals[0],
        availability,
        upcomingAppointments: appointments
      }
    });
  } catch (error) {
    console.error('Get professional error:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar profissional' });
  }
};

exports.createProfessional = async (req, res) => {
  try {
    const { name, email, password, specialty, crp, bio, photoUrl, hourlyRate, zoomEmail } = req.body;

    // Verificar se email já existe
    const [existing] = await db.query('SELECT id FROM professionals WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Email já cadastrado' });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `INSERT INTO professionals (name, email, password, specialty, crp, bio, photoUrl, hourlyRate, zoomEmail, isActive, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
      [name, email, hashedPassword, specialty, crp, bio, photoUrl, hourlyRate || 0, zoomEmail]
    );

    res.status(201).json({
      success: true,
      message: 'Profissional cadastrado com sucesso',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Create professional error:', error);
    res.status(500).json({ success: false, message: 'Erro ao cadastrar profissional' });
  }
};

exports.updateProfessional = async (req, res) => {
  try {
    const { name, email, specialty, crp, bio, photoUrl, hourlyRate, zoomEmail } = req.body;
    
    await db.query(
      `UPDATE professionals SET name = ?, email = ?, specialty = ?, crp = ?, bio = ?, photoUrl = ?, hourlyRate = ?, zoomEmail = ?
       WHERE id = ?`,
      [name, email, specialty, crp, bio, photoUrl, hourlyRate, zoomEmail, req.params.id]
    );

    res.json({ success: true, message: 'Profissional atualizado com sucesso' });
  } catch (error) {
    console.error('Update professional error:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar profissional' });
  }
};

exports.deleteProfessional = async (req, res) => {
  try {
    // Verificar se há agendamentos futuros
    const [appointments] = await db.query(
      'SELECT COUNT(*) as count FROM appointments WHERE professionalId = ? AND scheduledAt >= NOW() AND status = "confirmed"',
      [req.params.id]
    );

    if (appointments[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível remover profissional com agendamentos futuros'
      });
    }

    await db.query('DELETE FROM professionals WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Profissional removido com sucesso' });
  } catch (error) {
    console.error('Delete professional error:', error);
    res.status(500).json({ success: false, message: 'Erro ao remover profissional' });
  }
};

exports.activateProfessional = async (req, res) => {
  try {
    await db.query('UPDATE professionals SET isActive = 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Profissional ativado com sucesso' });
  } catch (error) {
    console.error('Activate professional error:', error);
    res.status(500).json({ success: false, message: 'Erro ao ativar profissional' });
  }
};

exports.deactivateProfessional = async (req, res) => {
  try {
    await db.query('UPDATE professionals SET isActive = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Profissional desativado com sucesso' });
  } catch (error) {
    console.error('Deactivate professional error:', error);
    res.status(500).json({ success: false, message: 'Erro ao desativar profissional' });
  }
};

// ==================== AGENDAMENTOS ====================

exports.getAppointments = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = '', date = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const params = [];

    if (status) {
      whereClause += ' AND a.status = ?';
      params.push(status);
    }
    if (date) {
      whereClause += ' AND DATE(a.scheduledAt) = ?';
      params.push(date);
    }

    const [appointments] = await db.query(
      `SELECT a.*, u.name as userName, u.email as userEmail, p.name as professionalName
       FROM appointments a
       LEFT JOIN users u ON a.userId = u.id
       LEFT JOIN professionals p ON a.professionalId = p.id
       WHERE ${whereClause}
       ORDER BY a.scheduledAt DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [countResult] = await db.query(
      `SELECT COUNT(*) as total FROM appointments a WHERE ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: {
        appointments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          pages: Math.ceil(countResult[0].total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar agendamentos' });
  }
};

exports.updateAppointment = async (req, res) => {
  try {
    const { status, notes, zoomLink } = req.body;
    
    await db.query(
      'UPDATE appointments SET status = ?, notes = ?, zoomLink = ? WHERE id = ?',
      [status, notes, zoomLink, req.params.id]
    );

    res.json({ success: true, message: 'Agendamento atualizado com sucesso' });
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar agendamento' });
  }
};

exports.cancelAppointment = async (req, res) => {
  try {
    await db.query(
      'UPDATE appointments SET status = "cancelled", cancelledAt = NOW() WHERE id = ?',
      [req.params.id]
    );
    res.json({ success: true, message: 'Agendamento cancelado com sucesso' });
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({ success: false, message: 'Erro ao cancelar agendamento' });
  }
};

// ==================== ASSINATURAS ====================

exports.getSubscriptions = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = '', plan = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const params = [];

    if (status) {
      whereClause += ' AND s.status = ?';
      params.push(status);
    }
    if (plan) {
      whereClause += ' AND s.plan = ?';
      params.push(plan);
    }

    const [subscriptions] = await db.query(
      `SELECT s.*, u.name as userName, u.email as userEmail
       FROM subscriptions s
       LEFT JOIN users u ON s.userId = u.id
       WHERE ${whereClause}
       ORDER BY s.createdAt DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [countResult] = await db.query(
      `SELECT COUNT(*) as total FROM subscriptions s WHERE ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: {
        subscriptions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          pages: Math.ceil(countResult[0].total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar assinaturas' });
  }
};


// ==================== ZOOM CONFIG ====================

exports.getZoomConfig = async (req, res) => {
  try {
    const [config] = await db.query('SELECT * FROM config WHERE `key` = "zoom"');
    
    if (config.length === 0) {
      return res.json({
        success: true,
        data: {
          configured: false,
          accountId: '',
          clientId: '',
          clientSecret: ''
        }
      });
    }

    const zoomConfig = JSON.parse(config[0].value);
    
    res.json({
      success: true,
      data: {
        configured: !!(zoomConfig.accountId && zoomConfig.clientId && zoomConfig.clientSecret),
        accountId: zoomConfig.accountId || '',
        clientId: zoomConfig.clientId || '',
        // Don't return the full secret for security
        clientSecret: zoomConfig.clientSecret ? '********' : ''
      }
    });
  } catch (error) {
    console.error('Get Zoom config error:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar configuração do Zoom' });
  }
};

exports.saveZoomConfig = async (req, res) => {
  try {
    const { accountId, clientId, clientSecret } = req.body;

    if (!accountId || !clientId || !clientSecret) {
      return res.status(400).json({
        success: false,
        message: 'Todos os campos são obrigatórios'
      });
    }

    const configValue = JSON.stringify({
      accountId,
      clientId,
      clientSecret,
      updatedAt: new Date().toISOString()
    });

    // Check if config exists
    const [existing] = await db.query('SELECT * FROM config WHERE `key` = "zoom"');
    
    if (existing.length > 0) {
      await db.query(
        'UPDATE config SET value = ?, updatedAt = NOW() WHERE `key` = "zoom"',
        [configValue]
      );
    } else {
      await db.query(
        'INSERT INTO config (`key`, value, createdAt, updatedAt) VALUES ("zoom", ?, NOW(), NOW())',
        [configValue]
      );
    }

    res.json({
      success: true,
      message: 'Configuração do Zoom salva com sucesso'
    });
  } catch (error) {
    console.error('Save Zoom config error:', error);
    res.status(500).json({ success: false, message: 'Erro ao salvar configuração do Zoom' });
  }
};

exports.testZoomConnection = async (req, res) => {
  try {
    const [config] = await db.query('SELECT * FROM config WHERE `key` = "zoom"');
    
    if (config.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Zoom não configurado'
      });
    }

    const zoomConfig = JSON.parse(config[0].value);
    const { accountId, clientId, clientSecret } = zoomConfig;

    // Try to get access token
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `grant_type=account_credentials&account_id=${accountId}`
    });

    if (!response.ok) {
      const error = await response.json();
      return res.status(400).json({
        success: false,
        message: `Erro de conexão: ${error.reason || error.message || 'Credenciais inválidas'}`
      });
    }

    res.json({
      success: true,
      message: 'Conexão com Zoom estabelecida com sucesso!'
    });
  } catch (error) {
    console.error('Test Zoom connection error:', error);
    res.status(500).json({ success: false, message: 'Erro ao testar conexão com Zoom' });
  }
};
