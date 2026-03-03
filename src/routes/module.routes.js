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
router.get('/catalog', async (req, res) => {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('modules_catalog').get();
    const modules = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.isActive !== false) {
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
      }
    });
    res.json({ success: true, data: { modules } });
  } catch (error) {
    console.error('Get catalog error:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar catálogo de módulos' });
  }
});

// ==================== CATÁLOGO PÚBLICO DE VÍCIOS (sem autenticação) ====================
router.get('/addictions', async (req, res) => {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('addictions').get();
    const addictions = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.active !== false) {
        addictions.push({
          id: doc.id,
          name: data.name,
          description: data.description || '',
          icon: data.icon || '⭐',
          imageUrl: data.imageUrl || null,
          category: data.category || 'comportamental',
          moduleId: data.moduleId || null,
        });
      }
    });
    res.json({ success: true, data: { addictions } });
  } catch (error) {
    console.error('Get addictions catalog error:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar vícios' });
  }
});

// ==================== CATÁLOGO PÚBLICO DE HÁBITOS SUGERIDOS (sem autenticação) ====================
router.get('/habits', async (req, res) => {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('suggested_habits').get();
    const habits = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.active !== false) {
        habits.push({
          id: doc.id,
          name: data.name,
          description: data.description || '',
          frequencyPerWeek: data.frequencyPerWeek || 3,
          durationMinutes: data.durationMinutes || 30,
          suggestedPeriod: data.suggestedPeriod || 'Manhã',
          category: data.category || 'Bem-estar',
          sourceRule: data.sourceRule || 'universal',
        });
      }
    });
    res.json({ success: true, data: { habits } });
  } catch (error) {
    console.error('Get habits catalog error:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar hábitos' });
  }
});

// ==================== ROTAS PROTEGIDAS ====================
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
