import mongoose from 'mongoose';

const replySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 1000
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const forumPostSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Título é obrigatório'],
    trim: true,
    minlength: [5, 'Título deve ter no mínimo 5 caracteres'],
    maxlength: [200, 'Título deve ter no máximo 200 caracteres']
  },
  content: {
    type: String,
    required: [true, 'Conteúdo é obrigatório'],
    trim: true,
    minlength: [10, 'Conteúdo deve ter no mínimo 10 caracteres'],
    maxlength: [5000, 'Conteúdo deve ter no máximo 5000 caracteres']
  },
  category: {
    type: String,
    enum: ['Vitória', 'Dica', 'Motivação', 'Pergunta', 'Desabafo'],
    default: 'Motivação'
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  replies: [replySchema],
  isActive: {
    type: Boolean,
    default: true
  },
  isPinned: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for better query performance
forumPostSchema.index({ user: 1, createdAt: -1 });
forumPostSchema.index({ category: 1, createdAt: -1 });
forumPostSchema.index({ isActive: 1, isPinned: -1, createdAt: -1 });

// Virtual for reply count
forumPostSchema.virtual('replyCount').get(function() {
  return this.replies.length;
});

// Virtual for like count
forumPostSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Ensure virtuals are included in JSON
forumPostSchema.set('toJSON', { virtuals: true });
forumPostSchema.set('toObject', { virtuals: true });

const ForumPost = mongoose.model('ForumPost', forumPostSchema);

export default ForumPost;
