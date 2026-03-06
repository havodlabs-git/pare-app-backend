import express from 'express';
import { getFirestore } from '../config/firestore.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// GET /api/habits/community — lista hábitos partilhados pela comunidade (público)
router.get('/community', async (req, res) => {
  try {
    const db = getFirestore();
    const snap = await db.collection('community_habits')
      .where('isActive', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const habits = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data: { habits } });
  } catch (error) {
    console.error('Get community habits error:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar hábitos da comunidade' });
  }
});

// POST /api/habits/community — partilhar hábito customizado com a comunidade (requer auth)
router.post('/community', protect, async (req, res) => {
  try {
    const db = getFirestore();
    const { habitId, habitName, category, durationMinutes, daysOfWeek } = req.body;

    if (!habitName || !habitId) {
      return res.status(400).json({ success: false, message: 'habitId e habitName são obrigatórios' });
    }

    // Verificar se já existe um hábito com o mesmo habitId deste utilizador
    const existing = await db.collection('community_habits')
      .where('habitId', '==', habitId)
      .where('userId', '==', req.user.uid)
      .get();

    if (!existing.empty) {
      return res.json({ success: true, message: 'Hábito já partilhado anteriormente' });
    }

    const habit = {
      habitId,
      habitName,
      category: category || 'geral',
      durationMinutes: durationMinutes || 15,
      daysOfWeek: daysOfWeek || [],
      userId: req.user.uid,
      userName: req.user.name || 'Utilizador',
      isActive: true,
      likes: 0,
      createdAt: new Date(),
    };

    const docRef = await db.collection('community_habits').add(habit);
    res.status(201).json({ success: true, data: { id: docRef.id, ...habit } });
  } catch (error) {
    console.error('Share community habit error:', error);
    res.status(500).json({ success: false, message: 'Erro ao partilhar hábito' });
  }
});

// POST /api/habits/community/:id/like — dar like num hábito da comunidade (requer auth)
router.post('/community/:id/like', protect, async (req, res) => {
  try {
    const db = getFirestore();
    const habitRef = db.collection('community_habits').doc(req.params.id);
    const habitDoc = await habitRef.get();

    if (!habitDoc.exists) {
      return res.status(404).json({ success: false, message: 'Hábito não encontrado' });
    }

    // Verificar se o utilizador já deu like
    const likeRef = db.collection('community_habit_likes').doc(`${req.user.uid}_${req.params.id}`);
    const likeDoc = await likeRef.get();

    if (likeDoc.exists) {
      // Remover like
      await likeRef.delete();
      await habitRef.update({ likes: Math.max(0, (habitDoc.data().likes || 0) - 1) });
      return res.json({ success: true, liked: false });
    }

    // Adicionar like
    await likeRef.set({ userId: req.user.uid, habitId: req.params.id, createdAt: new Date() });
    await habitRef.update({ likes: (habitDoc.data().likes || 0) + 1 });
    res.json({ success: true, liked: true });
  } catch (error) {
    console.error('Like community habit error:', error);
    res.status(500).json({ success: false, message: 'Erro ao processar like' });
  }
});

export default router;
