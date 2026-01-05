import { getFirestore } from '../config/firestore.js';

// Get all posts with pagination and filtering
export const getPosts = async (req, res) => {
  try {
    const db = getFirestore();
    const { category, limit = 20, startAfter } = req.query;
    
    let query = db.collection('forum_posts')
      .orderBy('createdAt', 'desc')
      .limit(parseInt(limit));
    
    if (category && category !== 'all') {
      query = db.collection('forum_posts')
        .where('category', '==', category)
        .orderBy('createdAt', 'desc')
        .limit(parseInt(limit));
    }
    
    if (startAfter) {
      const startDoc = await db.collection('forum_posts').doc(startAfter).get();
      if (startDoc.exists) {
        query = query.startAfter(startDoc);
      }
    }
    
    const snapshot = await query.get();
    const posts = [];
    
    snapshot.forEach(doc => {
      posts.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt
      });
    });
    
    res.json({
      success: true,
      data: posts,
      hasMore: posts.length === parseInt(limit)
    });
  } catch (error) {
    console.error('Error getting posts:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar posts' });
  }
};

// Get single post with replies
export const getPost = async (req, res) => {
  try {
    const db = getFirestore();
    const { id } = req.params;
    
    const postDoc = await db.collection('forum_posts').doc(id).get();
    
    if (!postDoc.exists) {
      return res.status(404).json({ success: false, message: 'Post não encontrado' });
    }
    
    // Get replies
    const repliesSnapshot = await db.collection('forum_posts')
      .doc(id)
      .collection('replies')
      .orderBy('createdAt', 'asc')
      .get();
    
    const replies = [];
    repliesSnapshot.forEach(doc => {
      replies.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt
      });
    });
    
    res.json({
      success: true,
      data: {
        id: postDoc.id,
        ...postDoc.data(),
        createdAt: postDoc.data().createdAt?.toDate?.() || postDoc.data().createdAt,
        replies
      }
    });
  } catch (error) {
    console.error('Error getting post:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar post' });
  }
};

// Create new post
export const createPost = async (req, res) => {
  try {
    const db = getFirestore();
    const { title, content, category } = req.body;
    const userId = req.user.id;
    
    // Validate input
    if (!title || !content) {
      return res.status(400).json({ 
        success: false, 
        message: 'Título e conteúdo são obrigatórios' 
      });
    }
    
    // Get user info
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    const postData = {
      title: title.trim(),
      content: content.trim(),
      category: category || 'general',
      authorId: userId,
      authorName: userData?.name || 'Anônimo',
      authorLevel: userData?.level || 1,
      authorDays: userData?.dayCount || 0,
      likes: [],
      likesCount: 0,
      repliesCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await db.collection('forum_posts').add(postData);
    
    // Update forum stats
    await updateForumStats(db, 'posts', 1);
    
    res.status(201).json({
      success: true,
      message: 'Post criado com sucesso',
      data: {
        id: docRef.id,
        ...postData
      }
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ success: false, message: 'Erro ao criar post' });
  }
};

// Update post
export const updatePost = async (req, res) => {
  try {
    const db = getFirestore();
    const { id } = req.params;
    const { title, content, category } = req.body;
    const userId = req.user.id;
    
    const postRef = db.collection('forum_posts').doc(id);
    const postDoc = await postRef.get();
    
    if (!postDoc.exists) {
      return res.status(404).json({ success: false, message: 'Post não encontrado' });
    }
    
    // Check ownership
    if (postDoc.data().authorId !== userId) {
      return res.status(403).json({ success: false, message: 'Você não pode editar este post' });
    }
    
    const updateData = {
      updatedAt: new Date()
    };
    
    if (title) updateData.title = title.trim();
    if (content) updateData.content = content.trim();
    if (category) updateData.category = category;
    
    await postRef.update(updateData);
    
    res.json({
      success: true,
      message: 'Post atualizado com sucesso'
    });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar post' });
  }
};

// Delete post
export const deletePost = async (req, res) => {
  try {
    const db = getFirestore();
    const { id } = req.params;
    const userId = req.user.id;
    
    const postRef = db.collection('forum_posts').doc(id);
    const postDoc = await postRef.get();
    
    if (!postDoc.exists) {
      return res.status(404).json({ success: false, message: 'Post não encontrado' });
    }
    
    // Check ownership
    if (postDoc.data().authorId !== userId) {
      return res.status(403).json({ success: false, message: 'Você não pode deletar este post' });
    }
    
    // Delete all replies first
    const repliesSnapshot = await postRef.collection('replies').get();
    const batch = db.batch();
    repliesSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    batch.delete(postRef);
    await batch.commit();
    
    // Update forum stats
    await updateForumStats(db, 'posts', -1);
    
    res.json({
      success: true,
      message: 'Post deletado com sucesso'
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ success: false, message: 'Erro ao deletar post' });
  }
};

// Toggle like on post
export const toggleLike = async (req, res) => {
  try {
    const db = getFirestore();
    const { id } = req.params;
    const userId = req.user.id;
    
    const postRef = db.collection('forum_posts').doc(id);
    const postDoc = await postRef.get();
    
    if (!postDoc.exists) {
      return res.status(404).json({ success: false, message: 'Post não encontrado' });
    }
    
    const postData = postDoc.data();
    const likes = postData.likes || [];
    const hasLiked = likes.includes(userId);
    
    if (hasLiked) {
      // Remove like
      await postRef.update({
        likes: likes.filter(id => id !== userId),
        likesCount: (postData.likesCount || 1) - 1
      });
    } else {
      // Add like
      await postRef.update({
        likes: [...likes, userId],
        likesCount: (postData.likesCount || 0) + 1
      });
    }
    
    res.json({
      success: true,
      liked: !hasLiked,
      likesCount: hasLiked ? (postData.likesCount || 1) - 1 : (postData.likesCount || 0) + 1
    });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ success: false, message: 'Erro ao curtir post' });
  }
};

// Add reply to post
export const addReply = async (req, res) => {
  try {
    const db = getFirestore();
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Conteúdo é obrigatório' });
    }
    
    const postRef = db.collection('forum_posts').doc(id);
    const postDoc = await postRef.get();
    
    if (!postDoc.exists) {
      return res.status(404).json({ success: false, message: 'Post não encontrado' });
    }
    
    // Get user info
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    const replyData = {
      content: content.trim(),
      authorId: userId,
      authorName: userData?.name || 'Anônimo',
      authorLevel: userData?.level || 1,
      authorDays: userData?.dayCount || 0,
      createdAt: new Date()
    };
    
    const replyRef = await postRef.collection('replies').add(replyData);
    
    // Update replies count
    await postRef.update({
      repliesCount: (postDoc.data().repliesCount || 0) + 1
    });
    
    // Update forum stats
    await updateForumStats(db, 'replies', 1);
    
    res.status(201).json({
      success: true,
      message: 'Resposta adicionada com sucesso',
      data: {
        id: replyRef.id,
        ...replyData
      }
    });
  } catch (error) {
    console.error('Error adding reply:', error);
    res.status(500).json({ success: false, message: 'Erro ao adicionar resposta' });
  }
};

// Delete reply
export const deleteReply = async (req, res) => {
  try {
    const db = getFirestore();
    const { id, replyId } = req.params;
    const userId = req.user.id;
    
    const postRef = db.collection('forum_posts').doc(id);
    const replyRef = postRef.collection('replies').doc(replyId);
    
    const replyDoc = await replyRef.get();
    
    if (!replyDoc.exists) {
      return res.status(404).json({ success: false, message: 'Resposta não encontrada' });
    }
    
    // Check ownership
    if (replyDoc.data().authorId !== userId) {
      return res.status(403).json({ success: false, message: 'Você não pode deletar esta resposta' });
    }
    
    await replyRef.delete();
    
    // Update replies count
    const postDoc = await postRef.get();
    if (postDoc.exists) {
      await postRef.update({
        repliesCount: Math.max(0, (postDoc.data().repliesCount || 1) - 1)
      });
    }
    
    // Update forum stats
    await updateForumStats(db, 'replies', -1);
    
    res.json({
      success: true,
      message: 'Resposta deletada com sucesso'
    });
  } catch (error) {
    console.error('Error deleting reply:', error);
    res.status(500).json({ success: false, message: 'Erro ao deletar resposta' });
  }
};

// Get forum statistics
export const getForumStats = async (req, res) => {
  try {
    const db = getFirestore();
    
    const statsDoc = await db.collection('forum_stats').doc('global').get();
    
    if (!statsDoc.exists) {
      // Initialize stats if not exists
      const initialStats = {
        totalPosts: 0,
        totalReplies: 0,
        totalMembers: 0,
        updatedAt: new Date()
      };
      await db.collection('forum_stats').doc('global').set(initialStats);
      return res.json({ success: true, data: initialStats });
    }
    
    // Get active members count (users who posted in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const usersSnapshot = await db.collection('users').get();
    
    res.json({
      success: true,
      data: {
        ...statsDoc.data(),
        totalMembers: usersSnapshot.size
      }
    });
  } catch (error) {
    console.error('Error getting forum stats:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar estatísticas' });
  }
};

// Helper function to update forum stats
async function updateForumStats(db, field, increment) {
  const statsRef = db.collection('forum_stats').doc('global');
  const statsDoc = await statsRef.get();
  
  if (!statsDoc.exists) {
    await statsRef.set({
      totalPosts: field === 'posts' ? Math.max(0, increment) : 0,
      totalReplies: field === 'replies' ? Math.max(0, increment) : 0,
      updatedAt: new Date()
    });
  } else {
    const currentValue = statsDoc.data()[`total${field.charAt(0).toUpperCase() + field.slice(1)}`] || 0;
    await statsRef.update({
      [`total${field.charAt(0).toUpperCase() + field.slice(1)}`]: Math.max(0, currentValue + increment),
      updatedAt: new Date()
    });
  }
}
