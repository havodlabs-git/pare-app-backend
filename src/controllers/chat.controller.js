import { getFirestore } from '../config/firestore.js';

// Verificar se usuário tem plano premium ou superior
const isPremiumUser = (plan) => {
  return ['premium', 'elite'].includes(plan?.toLowerCase());
};

// Iniciar ou obter conversa com psicólogo
export const startConversation = async (req, res) => {
  try {
    const db = getFirestore();
    const userId = req.user.id;
    const { professionalId } = req.body;

    if (!professionalId) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID do profissional é obrigatório' 
      });
    }

    // Verificar plano do usuário
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }

    const userData = userDoc.data();
    if (!isPremiumUser(userData.plan)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Chat com psicólogos disponível apenas para planos Premium e Elite',
        requiresPremium: true
      });
    }

    // Verificar se profissional existe e está ativo
    const profDoc = await db.collection('professionals').doc(professionalId).get();
    if (!profDoc.exists || !profDoc.data().isActive) {
      return res.status(404).json({ success: false, message: 'Profissional não encontrado ou inativo' });
    }

    const profData = profDoc.data();

    // Verificar se já existe conversa ativa
    const existingConversation = await db.collection('conversations')
      .where('userId', '==', userId)
      .where('professionalId', '==', professionalId)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (!existingConversation.empty) {
      const conv = existingConversation.docs[0];
      return res.json({
        success: true,
        data: {
          id: conv.id,
          ...conv.data(),
          professional: {
            id: professionalId,
            name: profData.name,
            photoUrl: profData.photoUrl,
            specialty: profData.specialty
          }
        }
      });
    }

    // Criar nova conversa
    const conversationData = {
      userId,
      userName: userData.name || 'Usuário',
      userPhotoUrl: userData.photoUrl || null,
      professionalId,
      professionalName: profData.name,
      professionalPhotoUrl: profData.photoUrl || null,
      professionalSpecialty: profData.specialty,
      status: 'active',
      lastMessage: null,
      lastMessageAt: null,
      unreadByUser: 0,
      unreadByProfessional: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await db.collection('conversations').add(conversationData);

    res.status(201).json({
      success: true,
      message: 'Conversa iniciada com sucesso',
      data: {
        id: docRef.id,
        ...conversationData,
        professional: {
          id: professionalId,
          name: profData.name,
          photoUrl: profData.photoUrl,
          specialty: profData.specialty
        }
      }
    });
  } catch (error) {
    console.error('Error starting conversation:', error);
    res.status(500).json({ success: false, message: 'Erro ao iniciar conversa' });
  }
};

// Obter conversas do usuário
export const getUserConversations = async (req, res) => {
  try {
    const db = getFirestore();
    const userId = req.user.id;

    const snapshot = await db.collection('conversations')
      .where('userId', '==', userId)
      .orderBy('updatedAt', 'desc')
      .get();

    const conversations = [];
    snapshot.forEach(doc => {
      conversations.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
        lastMessageAt: doc.data().lastMessageAt?.toDate?.() || doc.data().lastMessageAt
      });
    });

    res.json({ success: true, data: conversations });
  } catch (error) {
    console.error('Error getting user conversations:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar conversas' });
  }
};

// Obter conversas do profissional
export const getProfessionalConversations = async (req, res) => {
  try {
    const db = getFirestore();
    const professionalId = req.professional.id;

    const snapshot = await db.collection('conversations')
      .where('professionalId', '==', professionalId)
      .orderBy('updatedAt', 'desc')
      .get();

    const conversations = [];
    snapshot.forEach(doc => {
      conversations.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
        lastMessageAt: doc.data().lastMessageAt?.toDate?.() || doc.data().lastMessageAt
      });
    });

    res.json({ success: true, data: conversations });
  } catch (error) {
    console.error('Error getting professional conversations:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar conversas' });
  }
};

// Enviar mensagem
export const sendMessage = async (req, res) => {
  try {
    const db = getFirestore();
    const { conversationId, content, type = 'text' } = req.body;
    
    // Determinar se é usuário ou profissional
    const isUser = !!req.user;
    const senderId = isUser ? req.user.id : req.professional.id;
    const senderType = isUser ? 'user' : 'professional';

    if (!conversationId || !content) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID da conversa e conteúdo são obrigatórios' 
      });
    }

    // Verificar se conversa existe
    const convRef = db.collection('conversations').doc(conversationId);
    const convDoc = await convRef.get();

    if (!convDoc.exists) {
      return res.status(404).json({ success: false, message: 'Conversa não encontrada' });
    }

    const convData = convDoc.data();

    // Verificar se o remetente faz parte da conversa
    if (isUser && convData.userId !== senderId) {
      return res.status(403).json({ success: false, message: 'Você não faz parte desta conversa' });
    }
    if (!isUser && convData.professionalId !== senderId) {
      return res.status(403).json({ success: false, message: 'Você não faz parte desta conversa' });
    }

    // Criar mensagem
    const messageData = {
      conversationId,
      senderId,
      senderType,
      senderName: isUser ? convData.userName : convData.professionalName,
      content: content.trim(),
      type, // text, image, audio
      read: false,
      createdAt: new Date()
    };

    const messageRef = await db.collection('messages').add(messageData);

    // Atualizar conversa
    const updateData = {
      lastMessage: content.length > 100 ? content.substring(0, 100) + '...' : content,
      lastMessageAt: new Date(),
      updatedAt: new Date()
    };

    // Incrementar contador de não lidas
    if (isUser) {
      updateData.unreadByProfessional = (convData.unreadByProfessional || 0) + 1;
    } else {
      updateData.unreadByUser = (convData.unreadByUser || 0) + 1;
    }

    await convRef.update(updateData);

    res.status(201).json({
      success: true,
      message: 'Mensagem enviada',
      data: {
        id: messageRef.id,
        ...messageData
      }
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, message: 'Erro ao enviar mensagem' });
  }
};

// Obter mensagens de uma conversa
export const getMessages = async (req, res) => {
  try {
    const db = getFirestore();
    const { conversationId } = req.params;
    const { limit = 50, before } = req.query;

    // Determinar se é usuário ou profissional
    const isUser = !!req.user;
    const senderId = isUser ? req.user.id : req.professional.id;

    // Verificar se conversa existe e se o usuário faz parte
    const convDoc = await db.collection('conversations').doc(conversationId).get();
    if (!convDoc.exists) {
      return res.status(404).json({ success: false, message: 'Conversa não encontrada' });
    }

    const convData = convDoc.data();
    if (isUser && convData.userId !== senderId) {
      return res.status(403).json({ success: false, message: 'Você não faz parte desta conversa' });
    }
    if (!isUser && convData.professionalId !== senderId) {
      return res.status(403).json({ success: false, message: 'Você não faz parte desta conversa' });
    }

    // Buscar mensagens - sem orderBy para evitar índice composto
    const snapshot = await db.collection('messages')
      .where('conversationId', '==', conversationId)
      .get();
    
    // Ordenar no código JavaScript
    let allMessages = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      allMessages.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt
      });
    });
    
    // Ordenar por data decrescente e limitar
    allMessages.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB - dateA;
    });
    
    // Aplicar limite
    const messages = allMessages.slice(0, parseInt(limit));

    // Marcar mensagens como lidas
    const convRef = db.collection('conversations').doc(conversationId);
    if (isUser) {
      await convRef.update({ unreadByUser: 0 });
    } else {
      await convRef.update({ unreadByProfessional: 0 });
    }

    // Marcar mensagens individuais como lidas
    const batch = db.batch();
    for (const msg of messages) {
      if (!msg.read && msg.senderType !== (isUser ? 'user' : 'professional')) {
        batch.update(db.collection('messages').doc(msg.id), { read: true });
      }
    }
    await batch.commit();

    res.json({ 
      success: true, 
      data: messages.reverse() // Retornar em ordem cronológica (mais antigas primeiro)
    });
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar mensagens' });
  }
};

// Encerrar conversa
export const endConversation = async (req, res) => {
  try {
    const db = getFirestore();
    const { conversationId } = req.params;

    // Determinar se é usuário ou profissional
    const isUser = !!req.user;
    const senderId = isUser ? req.user.id : req.professional.id;

    const convRef = db.collection('conversations').doc(conversationId);
    const convDoc = await convRef.get();

    if (!convDoc.exists) {
      return res.status(404).json({ success: false, message: 'Conversa não encontrada' });
    }

    const convData = convDoc.data();
    if (isUser && convData.userId !== senderId) {
      return res.status(403).json({ success: false, message: 'Você não faz parte desta conversa' });
    }
    if (!isUser && convData.professionalId !== senderId) {
      return res.status(403).json({ success: false, message: 'Você não faz parte desta conversa' });
    }

    await convRef.update({
      status: 'closed',
      closedAt: new Date(),
      closedBy: isUser ? 'user' : 'professional',
      updatedAt: new Date()
    });

    res.json({ success: true, message: 'Conversa encerrada' });
  } catch (error) {
    console.error('Error ending conversation:', error);
    res.status(500).json({ success: false, message: 'Erro ao encerrar conversa' });
  }
};

// Obter profissionais disponíveis para chat
export const getAvailableProfessionals = async (req, res) => {
  try {
    const db = getFirestore();

    const snapshot = await db.collection('professionals')
      .where('isActive', '==', true)
      .get();

    const professionals = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      professionals.push({
        id: doc.id,
        name: data.name,
        specialty: data.specialty,
        photoUrl: data.photoUrl,
        bio: data.bio
      });
    });

    res.json({ success: true, data: professionals });
  } catch (error) {
    console.error('Error getting available professionals:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar profissionais' });
  }
};
