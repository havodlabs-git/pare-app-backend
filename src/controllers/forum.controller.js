import ForumPost from '../models/ForumPost.model.js';
import Module from '../models/Module.model.js';
import User from '../models/User.model.js';

// @desc    Get all forum posts
// @route   GET /api/forum/posts
// @access  Private
export const getPosts = async (req, res) => {
  try {
    const { category, limit = 20, page = 1 } = req.query;

    const query = { isActive: true };
    if (category) {
      query.category = category;
    }

    const skip = (page - 1) * limit;

    const posts = await ForumPost.find(query)
      .populate('user', 'name email')
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    // Enrich posts with user module data
    const enrichedPosts = await Promise.all(posts.map(async (post) => {
      // Get user's active modules to show their progress
      const userModules = await Module.find({
        user: post.user._id,
        isActive: true
      }).sort({ dayCount: -1 }).limit(1);

      const topModule = userModules[0];

      return {
        ...post.toObject(),
        authorLevel: topModule?.level || 1,
        dayCount: topModule?.dayCount || 0,
        likeCount: post.likes.length,
        replyCount: post.replies.length
      };
    }));

    const total = await ForumPost.countDocuments(query);

    res.status(200).json({
      success: true,
      count: enrichedPosts.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: enrichedPosts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar posts',
      error: error.message
    });
  }
};

// @desc    Get single forum post
// @route   GET /api/forum/posts/:id
// @access  Private
export const getPost = async (req, res) => {
  try {
    const post = await ForumPost.findOne({
      _id: req.params.id,
      isActive: true
    })
      .populate('user', 'name email')
      .populate('replies.user', 'name email');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post não encontrado'
      });
    }

    // Get author's module data
    const userModules = await Module.find({
      user: post.user._id,
      isActive: true
    }).sort({ dayCount: -1 }).limit(1);

    const topModule = userModules[0];

    const enrichedPost = {
      ...post.toObject(),
      authorLevel: topModule?.level || 1,
      dayCount: topModule?.dayCount || 0,
      likeCount: post.likes.length,
      replyCount: post.replies.length
    };

    res.status(200).json({
      success: true,
      data: enrichedPost
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar post',
      error: error.message
    });
  }
};

// @desc    Create new forum post
// @route   POST /api/forum/posts
// @access  Private
export const createPost = async (req, res) => {
  try {
    const { title, content, category } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Título e conteúdo são obrigatórios'
      });
    }

    const post = await ForumPost.create({
      user: req.user.id,
      title,
      content,
      category: category || 'Motivação'
    });

    const populatedPost = await ForumPost.findById(post._id)
      .populate('user', 'name email');

    res.status(201).json({
      success: true,
      message: 'Post criado com sucesso',
      data: populatedPost
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao criar post',
      error: error.message
    });
  }
};

// @desc    Update forum post
// @route   PUT /api/forum/posts/:id
// @access  Private
export const updatePost = async (req, res) => {
  try {
    const { title, content, category } = req.body;

    const post = await ForumPost.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post não encontrado ou você não tem permissão para editá-lo'
      });
    }

    if (title) post.title = title;
    if (content) post.content = content;
    if (category) post.category = category;

    await post.save();

    res.status(200).json({
      success: true,
      message: 'Post atualizado com sucesso',
      data: post
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar post',
      error: error.message
    });
  }
};

// @desc    Delete forum post
// @route   DELETE /api/forum/posts/:id
// @access  Private
export const deletePost = async (req, res) => {
  try {
    const post = await ForumPost.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post não encontrado ou você não tem permissão para deletá-lo'
      });
    }

    post.isActive = false;
    await post.save();

    res.status(200).json({
      success: true,
      message: 'Post deletado com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar post',
      error: error.message
    });
  }
};

// @desc    Like/unlike a post
// @route   POST /api/forum/posts/:id/like
// @access  Private
export const toggleLike = async (req, res) => {
  try {
    const post = await ForumPost.findOne({
      _id: req.params.id,
      isActive: true
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post não encontrado'
      });
    }

    const likeIndex = post.likes.indexOf(req.user.id);

    if (likeIndex > -1) {
      // Unlike
      post.likes.splice(likeIndex, 1);
      await post.save();

      res.status(200).json({
        success: true,
        message: 'Like removido',
        liked: false,
        likeCount: post.likes.length
      });
    } else {
      // Like
      post.likes.push(req.user.id);
      await post.save();

      res.status(200).json({
        success: true,
        message: 'Post curtido',
        liked: true,
        likeCount: post.likes.length
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao curtir post',
      error: error.message
    });
  }
};

// @desc    Add reply to post
// @route   POST /api/forum/posts/:id/reply
// @access  Private
export const addReply = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Conteúdo da resposta é obrigatório'
      });
    }

    const post = await ForumPost.findOne({
      _id: req.params.id,
      isActive: true
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post não encontrado'
      });
    }

    post.replies.push({
      user: req.user.id,
      content,
      createdAt: new Date()
    });

    await post.save();

    const populatedPost = await ForumPost.findById(post._id)
      .populate('replies.user', 'name email');

    res.status(201).json({
      success: true,
      message: 'Resposta adicionada com sucesso',
      data: populatedPost.replies[populatedPost.replies.length - 1]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao adicionar resposta',
      error: error.message
    });
  }
};

// @desc    Delete reply from post
// @route   DELETE /api/forum/posts/:id/reply/:replyId
// @access  Private
export const deleteReply = async (req, res) => {
  try {
    const post = await ForumPost.findOne({
      _id: req.params.id,
      isActive: true
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post não encontrado'
      });
    }

    const reply = post.replies.id(req.params.replyId);

    if (!reply) {
      return res.status(404).json({
        success: false,
        message: 'Resposta não encontrada'
      });
    }

    // Check if user owns the reply
    if (reply.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Você não tem permissão para deletar esta resposta'
      });
    }

    reply.remove();
    await post.save();

    res.status(200).json({
      success: true,
      message: 'Resposta deletada com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar resposta',
      error: error.message
    });
  }
};

// @desc    Get forum statistics
// @route   GET /api/forum/stats
// @access  Private
export const getForumStats = async (req, res) => {
  try {
    const totalPosts = await ForumPost.countDocuments({ isActive: true });
    const totalUsers = await User.countDocuments({ isActive: true });
    
    // Posts today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const postsToday = await ForumPost.countDocuments({
      isActive: true,
      createdAt: { $gte: today }
    });

    // Calculate success rate (users with active modules)
    const usersWithModules = await Module.distinct('user', { isActive: true });
    const successRate = totalUsers > 0 
      ? Math.round((usersWithModules.length / totalUsers) * 100)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        totalPosts,
        totalUsers,
        postsToday,
        successRate
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar estatísticas do fórum',
      error: error.message
    });
  }
};
