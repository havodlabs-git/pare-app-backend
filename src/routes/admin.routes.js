import express from 'express';
import { protect, protectAdmin } from '../middleware/auth.middleware.js';
import { getFirestore } from '../config/firestore.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { Storage } from '@google-cloud/storage';

// Configuração do Google Cloud Storage
const gcsStorage = new Storage({ projectId: 'pare-app-483321' });
const BUCKET_NAME = 'pare-app-modules-storage';
const bucket = gcsStorage.bucket(BUCKET_NAME);

// Multer: armazenar em memória para depois enviar ao GCS
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Apenas imagens são permitidas'));
  }
});

const router = express.Router();

// ==================== LOGIN ADMIN (rota pública) ====================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email e senha são obrigatórios' });
    }

    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@pareapp.com';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'PareAdmin@2024!';
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

    // Verificar credenciais via variáveis de ambiente
    if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASSWORD) {
      const token = jwt.sign(
        { id: 'admin-env', email: ADMIN_EMAIL, isAdmin: true },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      return res.json({
        success: true,
        message: 'Login realizado com sucesso',
        data: { token, user: { id: 'admin-env', email: ADMIN_EMAIL, name: 'Administrador', isAdmin: true } }
      });
    }

    // Verificar conta com isAdmin: true no Firestore
    const db = getFirestore();
    const userSnapshot = await db.collection('users').where('email', '==', email.toLowerCase()).get();
    if (!userSnapshot.empty) {
      const userDoc = userSnapshot.docs[0];
      const user = { id: userDoc.id, ...userDoc.data() };
      if (user.isAdmin) {
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (isPasswordValid) {
          const token = jwt.sign(
            { id: user.id, email: user.email, isAdmin: true },
            JWT_SECRET,
            { expiresIn: '24h' }
          );
          return res.json({
            success: true,
            message: 'Login realizado com sucesso',
            data: { token, user: { id: user.id, email: user.email, name: user.name, isAdmin: true } }
          });
        }
      }
    }

    return res.status(401).json({ success: false, message: 'Credenciais inválidas ou sem permissão de admin' });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, message: 'Erro ao fazer login' });
  }
});

// ==================== ROTA PÚBLICA (sem auth) ====================
// Endpoint público para o frontend consultar feature flags
router.get('/public/feature-flags', async (req, res) => {
  try {
    const db = getFirestore();
    const doc = await db.collection('settings').doc('feature_flags').get();
    const defaults = {
      avatarEspelhoEnabled: true,
    };
    const flags = doc.exists ? { ...defaults, ...doc.data() } : defaults;
    delete flags.updatedAt;
    res.json({ success: true, data: { flags } });
  } catch (error) {
    console.error('Get public feature flags error:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar feature flags' });
  }
});

// Todas as rotas abaixo requerem autenticação de admin
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

// Alterar role do usuário (admin, psychologist, user)
router.put('/users/:id/role', async (req, res) => {
  try {
    const db = getFirestore();
    const { role } = req.body;
    const userId = req.params.id;

    if (!['user', 'admin', 'psychologist'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role inválida. Use: user, admin ou psychologist' });
    }

    const updateData = {
      role: role,
      updatedAt: new Date()
    };

    if (role === 'admin') {
      // Admin tem acesso total: elite + painel admin + painel psicólogo
      updateData.isAdmin = true;
      updateData.isPsychologist = true;
      updateData.plan = 'elite';
      updateData.planExpiresAt = null; // Vitalício
    } else if (role === 'psychologist') {
      updateData.isAdmin = false;
      updateData.isPsychologist = true;
    } else {
      // user normal
      updateData.isAdmin = false;
      updateData.isPsychologist = false;
    }

    await db.collection('users').doc(userId).update(updateData);

    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    res.json({
      success: true,
      message: `Role atualizada para ${role} com sucesso`,
      data: { id: userId, ...userData }
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar role do usuário' });
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

// ==================== VÍCIOS (ADDICTIONS) ====================

router.get('/addictions', async (req, res) => {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('addictions').orderBy('createdAt', 'asc').get();
    const addictions = [];
    snapshot.forEach(doc => {
      addictions.push({ id: doc.id, ...doc.data() });
    });
    res.json({ success: true, data: { addictions } });
  } catch (error) {
    console.error('Get addictions error:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar vícios' });
  }
});

router.post('/addictions', async (req, res) => {
  try {
    const db = getFirestore();
    const { name, label, icon, color, description, category, moduleId, imageUrl } = req.body;
    const addictionName = name || label;
    if (!addictionName) return res.status(400).json({ success: false, message: 'Nome é obrigatório' });
    const docRef = await db.collection('addictions').add({
      name: addictionName, label: addictionName,
      icon: icon || '🔴', color: color || '#ef4444',
      description: description || '', category: category || 'geral',
      moduleId: moduleId || null, imageUrl: imageUrl || null,
      active: true, isActive: true, createdAt: new Date(), updatedAt: new Date()
    });
    res.json({ success: true, message: 'Vício criado com sucesso', data: { id: docRef.id } });
  } catch (error) {
    console.error('Create addiction error:', error);
    res.status(500).json({ success: false, message: 'Erro ao criar vício' });
  }
});

router.put('/addictions/:id', async (req, res) => {
  try {
    const db = getFirestore();
    const { name, label, icon, color, description, category, isActive, moduleId, imageUrl } = req.body;
    const addictionName = name || label;
    const updateData = { updatedAt: new Date() };
    if (addictionName !== undefined) { updateData.name = addictionName; updateData.label = addictionName; }
    if (icon !== undefined) updateData.icon = icon;
    if (color !== undefined) updateData.color = color;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (isActive !== undefined) { updateData.isActive = isActive; updateData.active = isActive; }
    if (moduleId !== undefined) updateData.moduleId = moduleId;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    await db.collection('addictions').doc(req.params.id).update(updateData);
    res.json({ success: true, message: 'Vício atualizado com sucesso' });
  } catch (error) {
    console.error('Update addiction error:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar vício' });
  }
});

router.delete('/addictions/:id', async (req, res) => {
  try {
    const db = getFirestore();
    await db.collection('addictions').doc(req.params.id).delete();
    res.json({ success: true, message: 'Vício removido com sucesso' });
  } catch (error) {
    console.error('Delete addiction error:', error);
    res.status(500).json({ success: false, message: 'Erro ao remover vício' });
  }
});

// ==================== HÁBITOS SUGERIDOS (HABITS) ====================

router.get('/habits', async (req, res) => {
  try {
    const db = getFirestore();
    const { addiction } = req.query;
    let query = db.collection('suggested_habits').orderBy('createdAt', 'asc');
    const snapshot = await query.get();
    let habits = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (addiction && data.addictionId !== addiction) return;
      habits.push({ id: doc.id, ...data });
    });
    res.json({ success: true, data: { habits } });
  } catch (error) {
    console.error('Get habits error:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar hábitos' });
  }
});

router.post('/habits', async (req, res) => {
  try {
    const db = getFirestore();
    const { name, description, category, icon, color, frequency, duration, period, addictionId, tags } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Nome é obrigatório' });
    const docRef = await db.collection('suggested_habits').add({
      name, description: description || '', category: category || 'geral',
      icon: icon || '⭐', color: color || '#8b5cf6',
      frequency: frequency || 3, duration: duration || 30,
      period: period || 'morning', addictionId: addictionId || null,
      tags: tags || [], isActive: true, createdAt: new Date(), updatedAt: new Date()
    });
    res.json({ success: true, message: 'Hábito criado com sucesso', data: { id: docRef.id } });
  } catch (error) {
    console.error('Create habit error:', error);
    res.status(500).json({ success: false, message: 'Erro ao criar hábito' });
  }
});

router.put('/habits/:id', async (req, res) => {
  try {
    const db = getFirestore();
    const { name, description, category, icon, color, frequency, duration, period, addictionId, tags, isActive } = req.body;
    await db.collection('suggested_habits').doc(req.params.id).update({
      name, description, category, icon, color, frequency, duration, period,
      addictionId, tags, isActive, updatedAt: new Date()
    });
    res.json({ success: true, message: 'Hábito atualizado com sucesso' });
  } catch (error) {
    console.error('Update habit error:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar hábito' });
  }
});

router.delete('/habits/:id', async (req, res) => {
  try {
    const db = getFirestore();
    await db.collection('suggested_habits').doc(req.params.id).delete();
    res.json({ success: true, message: 'Hábito removido com sucesso' });
  } catch (error) {
    console.error('Delete habit error:', error);
    res.status(500).json({ success: false, message: 'Erro ao remover hábito' });
  }
});

// ==================== MÓDULOS ====================

// Módulos disponíveis (catálogo global gerido pelo admin)
const DEFAULT_MODULES = [
  { id: 'porn', name: 'Pornografia', description: 'Supere o vício e recupere sua energia', icon: '👁️', color: '#ef4444', category: 'comportamental', isActive: true, imageUrl: 'https://storage.googleapis.com/pare-app-modules-storage/modules/pornography.png' },
  { id: 'social', name: 'Redes Sociais', description: 'Recupere seu tempo e foco', icon: '📱', color: '#3b82f6', category: 'digital', isActive: true, imageUrl: 'https://storage.googleapis.com/pare-app-modules-storage/modules/social_media.png' },
  { id: 'smoking', name: 'Cigarro', description: 'Livre-se do tabagismo', icon: '🚬', color: '#6b7280', category: 'substância', isActive: true, imageUrl: 'https://storage.googleapis.com/pare-app-modules-storage/modules/smoking.png' },
  { id: 'alcohol', name: 'Álcool', description: 'Controle o consumo', icon: '🍺', color: '#f59e0b', category: 'substância', isActive: true, imageUrl: 'https://storage.googleapis.com/pare-app-modules-storage/modules/alcohol.png' },
  { id: 'gambling', name: 'Jogos de Azar', description: 'Recupere o controle financeiro', icon: '🎰', color: '#8b5cf6', category: 'comportamental', isActive: true, imageUrl: null },
  { id: 'shopping', name: 'Compras Compulsivas', description: 'Controle seus gastos', icon: '🛒', color: '#10b981', category: 'comportamental', isActive: true, imageUrl: 'https://storage.googleapis.com/pare-app-modules-storage/modules/shopping.png' },
];

router.get('/modules', async (req, res) => {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('modules_catalog').orderBy('createdAt', 'asc').get();
    const modules = [];
    snapshot.forEach(doc => {
      modules.push({ id: doc.id, ...doc.data() });
    });

    // Se não houver módulos no Firestore, persistir os defaults e retorná-los
    if (modules.length === 0) {
      const now = new Date();
      const batch = db.batch();
      DEFAULT_MODULES.forEach(mod => {
        const ref = db.collection('modules_catalog').doc(mod.id);
        batch.set(ref, { ...mod, createdAt: now, updatedAt: now });
      });
      await batch.commit();
      return res.json({ success: true, data: { modules: DEFAULT_MODULES } });
    }

    res.json({ success: true, data: { modules } });
  } catch (error) {
    console.error('Get modules error:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar módulos' });
  }
});

// ==================== UPLOAD DE IMAGEM DE MÓDULO ====================
router.post('/modules/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Nenhuma imagem enviada' });
    const { moduleId } = req.body;
    if (!moduleId) return res.status(400).json({ success: false, message: 'moduleId é obrigatório' });

    const ext = req.file.mimetype.split('/')[1] || 'png';
    const fileName = `modules/${moduleId}_${Date.now()}.${ext}`;
    const file = bucket.file(fileName);

    await file.save(req.file.buffer, {
      metadata: { contentType: req.file.mimetype },
      resumable: false,
    });

    const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${fileName}`;
    res.json({ success: true, message: 'Imagem carregada com sucesso', data: { imageUrl: publicUrl } });
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({ success: false, message: 'Erro ao fazer upload da imagem' });
  }
});

router.post('/modules', async (req, res) => {
  try {
    const db = getFirestore();
    const { name, description, icon, color, category, requiredPlan, isActive, imageUrl } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Nome é obrigatório' });
    const docRef = await db.collection('modules_catalog').add({
      name,
      description: description || '',
      icon: icon || '⭐',
      color: color || '#8b5cf6',
      category: category || 'comportamental',
      requiredPlan: requiredPlan || 'free',
      isActive: isActive !== undefined ? isActive : true,
      imageUrl: imageUrl || null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    res.json({ success: true, message: 'Módulo criado com sucesso', data: { id: docRef.id } });
  } catch (error) {
    console.error('Create module error:', error);
    res.status(500).json({ success: false, message: 'Erro ao criar módulo' });
  }
});

router.put('/modules/:id', async (req, res) => {
  try {
    const db = getFirestore();
    const { name, description, icon, color, category, requiredPlan, isActive, imageUrl } = req.body;
    await db.collection('modules_catalog').doc(req.params.id).set({
      name, description, icon, color, category, requiredPlan,
      isActive: isActive !== undefined ? isActive : true,
      imageUrl: imageUrl !== undefined ? imageUrl : null,
      updatedAt: new Date()
    }, { merge: true });
    res.json({ success: true, message: 'Módulo atualizado com sucesso' });
  } catch (error) {
    console.error('Update module error:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar módulo' });
  }
});

router.delete('/modules/:id', async (req, res) => {
  try {
    const db = getFirestore();
    await db.collection('modules_catalog').doc(req.params.id).delete();
    res.json({ success: true, message: 'Módulo removido com sucesso' });
  } catch (error) {
    console.error('Delete module error:', error);
    res.status(500).json({ success: false, message: 'Erro ao remover módulo' });
  }
});

// ==================== MENSAGENS MOTIVACIONAIS ====================

// GET público — usado pelo frontend para buscar mensagens ativas
router.get('/public/motivational-quotes', async (req, res) => {
  try {
    const db = getFirestore();
    const snap = await db.collection('motivational_quotes').where('isActive', '==', true).get();
    if (snap.empty) {
      return res.json({ success: true, data: { quotes: [] } });
    }
    const quotes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data: { quotes } });
  } catch (error) {
    console.error('Get public quotes error:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar mensagens' });
  }
});

// GET admin — lista todas as mensagens
router.get('/motivational-quotes', async (req, res) => {
  try {
    const db = getFirestore();
    const snap = await db.collection('motivational_quotes').orderBy('createdAt', 'desc').get();
    const quotes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data: { quotes } });
  } catch (error) {
    console.error('Get quotes error:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar mensagens' });
  }
});

// POST — criar nova mensagem
router.post('/motivational-quotes', async (req, res) => {
  try {
    const db = getFirestore();
    const { text, author, category } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Texto obrigatório' });
    }
    const docRef = await db.collection('motivational_quotes').add({
      text: text.trim(),
      author: author || null,
      category: category || 'geral',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    res.json({ success: true, message: 'Mensagem criada com sucesso', data: { id: docRef.id } });
  } catch (error) {
    console.error('Create quote error:', error);
    res.status(500).json({ success: false, message: 'Erro ao criar mensagem' });
  }
});

// PUT — editar mensagem
router.put('/motivational-quotes/:id', async (req, res) => {
  try {
    const db = getFirestore();
    const { text, author, category, isActive } = req.body;
    await db.collection('motivational_quotes').doc(req.params.id).set({
      text, author: author || null, category: category || 'geral',
      isActive: isActive !== undefined ? isActive : true,
      updatedAt: new Date()
    }, { merge: true });
    res.json({ success: true, message: 'Mensagem atualizada com sucesso' });
  } catch (error) {
    console.error('Update quote error:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar mensagem' });
  }
});

// DELETE — remover mensagem
router.delete('/motivational-quotes/:id', async (req, res) => {
  try {
    const db = getFirestore();
    await db.collection('motivational_quotes').doc(req.params.id).delete();
    res.json({ success: true, message: 'Mensagem removida com sucesso' });
  } catch (error) {
    console.error('Delete quote error:', error);
    res.status(500).json({ success: false, message: 'Erro ao remover mensagem' });
  }
});

// POST — seed inicial (popular com as frases padrão se a coleção estiver vazia)
router.post('/motivational-quotes/seed', async (req, res) => {
  try {
    const db = getFirestore();
    const snap = await db.collection('motivational_quotes').limit(1).get();
    if (!snap.empty) {
      return res.json({ success: true, message: 'Coleção já tem dados, seed ignorado' });
    }
    const defaultQuotes = [
      'A disciplina é a ponte entre objetivos e realizações.',
      'Cada dia sem ceder é uma vitória que ninguém pode tirar de você.',
      'Você é mais forte do que seus impulsos.',
      'O desconforto temporário leva à força permanente.',
      'Sua mente é poderosa. Quando você a preenche com pensamentos positivos, sua vida começará a mudar.',
      'Não é sobre perfeição, é sobre progresso.',
      'O sucesso é a soma de pequenos esforços repetidos dia após dia.',
      'Você não precisa ser grande para começar, mas precisa começar para ser grande.',
      'A mudança acontece quando a dor de permanecer o mesmo é maior que a dor da mudança.',
      'Cada recomeço é uma nova oportunidade de fazer melhor.',
      'Sua jornada importa mais do que o destino.',
      'Força não vem do que você pode fazer. Vem de superar as coisas que você pensou que não poderia.',
    ];
    const batch = db.batch();
    defaultQuotes.forEach(text => {
      const ref = db.collection('motivational_quotes').doc();
      batch.set(ref, { text, author: null, category: 'geral', isActive: true, createdAt: new Date(), updatedAt: new Date() });
    });
    await batch.commit();
    res.json({ success: true, message: `${defaultQuotes.length} mensagens criadas com sucesso` });
  } catch (error) {
    console.error('Seed quotes error:', error);
    res.status(500).json({ success: false, message: 'Erro ao popular mensagens' });
  }
});

// ==================== FEATURE FLAGS ====================

router.get('/feature-flags', async (req, res) => {
  try {
    const db = getFirestore();
    const doc = await db.collection('settings').doc('feature_flags').get();
    const defaults = {
      avatarEspelhoEnabled: true,
    };
    const flags = doc.exists ? { ...defaults, ...doc.data() } : defaults;
    delete flags.updatedAt;
    res.json({ success: true, data: { flags } });
  } catch (error) {
    console.error('Get feature flags error:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar feature flags' });
  }
});

router.put('/feature-flags', async (req, res) => {
  try {
    const db = getFirestore();
    const { flags } = req.body;
    if (!flags || typeof flags !== 'object') {
      return res.status(400).json({ success: false, message: 'Flags inválidas' });
    }
    await db.collection('settings').doc('feature_flags').set({
      ...flags,
      updatedAt: new Date()
    }, { merge: true });
    res.json({ success: true, message: 'Feature flags atualizadas com sucesso' });
  } catch (error) {
    console.error('Update feature flags error:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar feature flags' });
  }
});

export default router;
