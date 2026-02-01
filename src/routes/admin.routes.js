import express from 'express';
import { protect, protectAdmin } from '../middleware/auth.middleware.js';
import { getFirestore } from '../config/firestore.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Todas as rotas requerem autenticação de admin
router.use(protect);
router.use(protectAdmin);

// ==================== DASHBOARD ====================
router.get('/dashboard', async (req, res) => {
  try {
    const db = getFirestore();
    
    // Total de usuários
    const usersSnapshot = await db.collection('users').get();
    const totalUsers = usersSnapshot.size;
    
    // Usuários por plano
    const usersByPlan = { free: 0, premium: 0, elite: 0 };
    usersSnapshot.forEach(doc => {
      const plan = doc.data().plan || 'free';
      usersByPlan[plan] = (usersByPlan[plan] || 0) + 1;
    });
    
    // Total de posts
    const postsSnapshot = await db.collection('forum_posts').get();
    const totalPosts = postsSnapshot.size;
    
    // Total de profissionais
    const professionalsSnapshot = await db.collection('professionals').get();
    const totalProfessionals = professionalsSnapshot.size;
    
    // Agendamentos
    const appointmentsSnapshot = await db.collection('appointments').get();
    const totalAppointments = appointmentsSnapshot.size;

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          byPlan: usersByPlan
        },
        forum: {
          totalPosts
        },
        professionals: {
          total: totalProfessionals
        },
        appointments: {
          total: totalAppointments
        }
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: 'Erro ao carregar dashboard' });
  }
});

// ==================== USUÁRIOS ====================
router.get('/users', async (req, res) => {
  try {
    const db = getFirestore();
    const { search = '', plan = '' } = req.query;
    
    let query = db.collection('users');
    
    const snapshot = await query.orderBy('createdAt', 'desc').limit(100).get();
    
    let users = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      // Filtrar por busca
      if (search && !data.name?.toLowerCase().includes(search.toLowerCase()) && 
          !data.email?.toLowerCase().includes(search.toLowerCase())) {
        return;
      }
      // Filtrar por plano
      if (plan && data.plan !== plan) {
        return;
      }
      users.push({ id: doc.id, ...data });
    });

    res.json({
      success: true,
      data: { users }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar usuários' });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(req.params.id).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }

    res.json({
      success: true,
      data: { id: userDoc.id, ...userDoc.data() }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar usuário' });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const db = getFirestore();
    const { name, email, plan, points, level, streak, isAdmin } = req.body;
    
    await db.collection('users').doc(req.params.id).update({
      name, email, plan, points, level, streak, isAdmin,
      updatedAt: new Date()
    });

    res.json({ success: true, message: 'Usuário atualizado com sucesso' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar usuário' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const db = getFirestore();
    await db.collection('users').doc(req.params.id).delete();
    res.json({ success: true, message: 'Usuário removido com sucesso' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Erro ao remover usuário' });
  }
});

router.post('/users/:id/ban', async (req, res) => {
  try {
    const db = getFirestore();
    const { reason } = req.body;
    await db.collection('users').doc(req.params.id).update({
      isBanned: true,
      banReason: reason || 'Violação dos termos de uso',
      bannedAt: new Date()
    });
    res.json({ success: true, message: 'Usuário banido com sucesso' });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ success: false, message: 'Erro ao banir usuário' });
  }
});

router.post('/users/:id/unban', async (req, res) => {
  try {
    const db = getFirestore();
    await db.collection('users').doc(req.params.id).update({
      isBanned: false,
      banReason: null,
      bannedAt: null
    });
    res.json({ success: true, message: 'Usuário desbanido com sucesso' });
  } catch (error) {
    console.error('Unban user error:', error);
    res.status(500).json({ success: false, message: 'Erro ao desbanir usuário' });
  }
});

// Alterar plano do usuário
router.put('/users/:id/plan', async (req, res) => {
  try {
    const db = getFirestore();
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
    
    await db.collection('users').doc(userId).update({
      plan: plan,
      planExpiresAt: planExpiresAt,
      updatedAt: new Date()
    });
    
    // Buscar usuário atualizado
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    res.json({ 
      success: true, 
      message: `Plano atualizado para ${plan.toUpperCase()} com sucesso`,
      data: { id: userId, ...userData }
    });
  } catch (error) {
    console.error('Update user plan error:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar plano do usuário' });
  }
});

// ==================== POSTS DO FÓRUM ====================
router.get('/posts', async (req, res) => {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('forum_posts').orderBy('createdAt', 'desc').limit(100).get();
    
    let posts = [];
    snapshot.forEach(doc => {
      posts.push({ id: doc.id, ...doc.data() });
    });

    res.json({
      success: true,
      data: { posts }
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar posts' });
  }
});

router.get('/posts/:id', async (req, res) => {
  try {
    const db = getFirestore();
    const postDoc = await db.collection('forum_posts').doc(req.params.id).get();
    
    if (!postDoc.exists) {
      return res.status(404).json({ success: false, message: 'Post não encontrado' });
    }

    // Buscar comentários
    const commentsSnapshot = await db.collection('forum_posts').doc(req.params.id)
      .collection('comments').orderBy('createdAt', 'asc').get();
    
    let comments = [];
    commentsSnapshot.forEach(doc => {
      comments.push({ id: doc.id, ...doc.data() });
    });

    res.json({
      success: true,
      data: { id: postDoc.id, ...postDoc.data(), comments }
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar post' });
  }
});

router.put('/posts/:id', async (req, res) => {
  try {
    const db = getFirestore();
    const { title, content, category, status } = req.body;
    
    await db.collection('forum_posts').doc(req.params.id).update({
      title, content, category, status,
      updatedAt: new Date()
    });

    res.json({ success: true, message: 'Post atualizado com sucesso' });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar post' });
  }
});

router.delete('/posts/:id', async (req, res) => {
  try {
    const db = getFirestore();
    const postRef = db.collection('forum_posts').doc(req.params.id);
    
    // Delete all replies first
    const repliesSnapshot = await postRef.collection('replies').get();
    const batch = db.batch();
    repliesSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    batch.delete(postRef);
    await batch.commit();
    
    // Update forum stats
    const statsRef = db.collection('forum_stats').doc('global');
    const statsDoc = await statsRef.get();
    if (statsDoc.exists) {
      const currentPosts = statsDoc.data().totalPosts || 0;
      await statsRef.update({
        totalPosts: Math.max(0, currentPosts - 1),
        updatedAt: new Date()
      });
    }
    
    res.json({ success: true, message: 'Post removido com sucesso' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ success: false, message: 'Erro ao remover post' });
  }
});

// ==================== PROFISSIONAIS ====================
router.get('/professionals', async (req, res) => {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('professionals').orderBy('createdAt', 'desc').get();
    
    let professionals = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      delete data.password; // Não retornar senha
      professionals.push({ id: doc.id, ...data });
    });

    res.json({
      success: true,
      data: { professionals }
    });
  } catch (error) {
    console.error('Get professionals error:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar profissionais' });
  }
});

router.get('/professionals/:id', async (req, res) => {
  try {
    const db = getFirestore();
    const profDoc = await db.collection('professionals').doc(req.params.id).get();
    
    if (!profDoc.exists) {
      return res.status(404).json({ success: false, message: 'Profissional não encontrado' });
    }

    const data = profDoc.data();
    delete data.password;

    res.json({
      success: true,
      data: { id: profDoc.id, ...data }
    });
  } catch (error) {
    console.error('Get professional error:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar profissional' });
  }
});

router.post('/professionals', async (req, res) => {
  try {
    const db = getFirestore();
    const { name, email, password, specialty, crp, bio, photoUrl, hourlyRate, zoomEmail } = req.body;

    // Verificar se email já existe
    const existingSnapshot = await db.collection('professionals').where('email', '==', email).get();
    if (!existingSnapshot.empty) {
      return res.status(400).json({ success: false, message: 'Email já cadastrado' });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    const docRef = await db.collection('professionals').add({
      name,
      email,
      password: hashedPassword,
      specialty,
      crp,
      bio,
      photoUrl,
      hourlyRate: hourlyRate || 0,
      zoomEmail,
      isActive: true,
      createdAt: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Profissional cadastrado com sucesso',
      data: { id: docRef.id }
    });
  } catch (error) {
    console.error('Create professional error:', error);
    res.status(500).json({ success: false, message: 'Erro ao cadastrar profissional' });
  }
});

router.put('/professionals/:id', async (req, res) => {
  try {
    const db = getFirestore();
    const { name, email, specialty, crp, bio, photoUrl, hourlyRate, zoomEmail, isActive } = req.body;
    
    await db.collection('professionals').doc(req.params.id).update({
      name, email, specialty, crp, bio, photoUrl, hourlyRate, zoomEmail, isActive,
      updatedAt: new Date()
    });

    res.json({ success: true, message: 'Profissional atualizado com sucesso' });
  } catch (error) {
    console.error('Update professional error:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar profissional' });
  }
});

router.delete('/professionals/:id', async (req, res) => {
  try {
    const db = getFirestore();
    await db.collection('professionals').doc(req.params.id).delete();
    res.json({ success: true, message: 'Profissional removido com sucesso' });
  } catch (error) {
    console.error('Delete professional error:', error);
    res.status(500).json({ success: false, message: 'Erro ao remover profissional' });
  }
});

router.post('/professionals/:id/activate', async (req, res) => {
  try {
    const db = getFirestore();
    await db.collection('professionals').doc(req.params.id).update({ isActive: true });
    res.json({ success: true, message: 'Profissional ativado com sucesso' });
  } catch (error) {
    console.error('Activate professional error:', error);
    res.status(500).json({ success: false, message: 'Erro ao ativar profissional' });
  }
});

router.post('/professionals/:id/deactivate', async (req, res) => {
  try {
    const db = getFirestore();
    await db.collection('professionals').doc(req.params.id).update({ isActive: false });
    res.json({ success: true, message: 'Profissional desativado com sucesso' });
  } catch (error) {
    console.error('Deactivate professional error:', error);
    res.status(500).json({ success: false, message: 'Erro ao desativar profissional' });
  }
});

// ==================== AGENDAMENTOS ====================
router.get('/appointments', async (req, res) => {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('appointments').orderBy('scheduledAt', 'desc').limit(100).get();
    
    let appointments = [];
    snapshot.forEach(doc => {
      appointments.push({ id: doc.id, ...doc.data() });
    });

    res.json({
      success: true,
      data: { appointments }
    });
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar agendamentos' });
  }
});

router.put('/appointments/:id', async (req, res) => {
  try {
    const db = getFirestore();
    const { status, notes, zoomLink } = req.body;
    
    await db.collection('appointments').doc(req.params.id).update({
      status, notes, zoomLink,
      updatedAt: new Date()
    });

    res.json({ success: true, message: 'Agendamento atualizado com sucesso' });
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar agendamento' });
  }
});

router.delete('/appointments/:id', async (req, res) => {
  try {
    const db = getFirestore();
    await db.collection('appointments').doc(req.params.id).update({
      status: 'cancelled',
      cancelledAt: new Date()
    });
    res.json({ success: true, message: 'Agendamento cancelado com sucesso' });
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({ success: false, message: 'Erro ao cancelar agendamento' });
  }
});

// ==================== CONFIGURAÇÕES ZOOM ====================
router.get('/zoom/config', async (req, res) => {
  try {
    const db = getFirestore();
    const configDoc = await db.collection('settings').doc('zoom').get();
    
    if (!configDoc.exists) {
      return res.json({
        success: true,
        data: { configured: false }
      });
    }

    const config = configDoc.data();
    res.json({
      success: true,
      data: {
        configured: true,
        accountId: config.accountId ? '***' + config.accountId.slice(-4) : null,
        clientId: config.clientId ? '***' + config.clientId.slice(-4) : null,
        hasClientSecret: !!config.clientSecret
      }
    });
  } catch (error) {
    console.error('Get Zoom config error:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar configuração do Zoom' });
  }
});

router.post('/zoom/config', async (req, res) => {
  try {
    const db = getFirestore();
    const { accountId, clientId, clientSecret } = req.body;
    
    await db.collection('settings').doc('zoom').set({
      accountId,
      clientId,
      clientSecret,
      updatedAt: new Date()
    });
    res.json({ success: true, message: 'Configuração do Zoom salva com sucesso' });
  } catch (error) {
    console.error('Save Zoom config error:', error);
    res.status(500).json({ success: false, message: 'Erro ao salvar configuração do Zoom' });
  }
});

router.post('/zoom/test', async (req, res) => {
  try {
    const db = getFirestore();
    const configDoc = await db.collection('settings').doc('zoom').get();
    
    if (!configDoc.exists) {
      return res.status(400).json({
        success: false,
        message: 'Zoom não configurado'
      });
    }

    const { accountId, clientId, clientSecret } = configDoc.data();
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
});

// ==================== SINCRONIZAR ESTATÍSTICAS ====================
// ==================== LIMPEZA DE DADOS ====================
router.delete('/appointments/clear-all', async (req, res) => {
  try {
    const db = getFirestore();
    const appointmentsSnapshot = await db.collection('appointments').get();
    
    const batch = db.batch();
    appointmentsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    res.json({
      success: true,
      message: `${appointmentsSnapshot.size} agendamentos removidos com sucesso`
    });
  } catch (error) {
    console.error('Clear appointments error:', error);
    res.status(500).json({ success: false, message: 'Erro ao limpar agendamentos' });
  }
});

router.post('/sync-forum-stats', async (req, res) => {
  try {
    const db = getFirestore();
    
    // Contar posts reais
    const postsSnapshot = await db.collection('forum_posts').get();
    const totalPosts = postsSnapshot.size;
    
    // Contar replies reais
    let totalReplies = 0;
    for (const postDoc of postsSnapshot.docs) {
      const repliesSnapshot = await postDoc.ref.collection('replies').get();
      totalReplies += repliesSnapshot.size;
    }
    
    // Atualizar stats
    const statsRef = db.collection('forum_stats').doc('global');
    await statsRef.set({
      totalPosts,
      totalReplies,
      updatedAt: new Date()
    }, { merge: true });
    
    res.json({
      success: true,
      message: 'Estatísticas sincronizadas com sucesso',
      data: { totalPosts, totalReplies }
    });
  } catch (error) {
    console.error('Sync forum stats error:', error);
    res.status(500).json({ success: false, message: 'Erro ao sincronizar estatísticas' });
  }
});

export default router;
