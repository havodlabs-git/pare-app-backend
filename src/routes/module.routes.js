import express from 'express';
import {
  getModules,
  getModule,
  createModule,
  checkIn,
  recordRelapse,
  deleteModule,
  getModuleStats
} from '../controllers/module.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { getFirestore } from '../config/firestore.js';

const router = express.Router();

// ==================== CATÁLOGO PÚBLICO DE MÓDULOS (sem autenticação) ====================
// Retorna todos os módulos activos do Firestore para o app (onboarding, seleção de módulo, etc.)
router.get('/catalog', async (req, res) => {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('modules_catalog')
      .where('isActive', '==', true)
      .orderBy('createdAt', 'asc')
      .get();

    const modules = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      modules.push({
        id: doc.id,
        name: data.name,
        description: data.description || '',
        icon: data.icon || '⭐',
        color: data.color || '#8b5cf6',
        category: data.category || 'geral',
        imageUrl: data.imageUrl || null,
        requiredPlan: data.requiredPlan || 'free',
      });
    });

    res.json({ success: true, data: { modules } });
  } catch (error) {
    console.error('Get catalog error:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar catálogo de módulos' });
  }
});

// Protect all other module routes
router.use(protect);

router.route('/')
  .get(getModules)
  .post(createModule);

router.route('/:id')
  .get(getModule)
  .delete(deleteModule);

router.put('/:id/checkin', checkIn);
router.post('/:id/relapse', recordRelapse);
router.get('/:id/stats', getModuleStats);

export default router;
