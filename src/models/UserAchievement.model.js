import mongoose from 'mongoose';

const userAchievementSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  achievement: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Achievement',
    required: true
  },
  achievementId: {
    type: String,
    required: true
  },
  unlockedAt: {
    type: Date,
    default: Date.now
  },
  moduleId: {
    type: String,
    enum: ['pornography', 'social_media', 'smoking', 'alcohol', 'shopping']
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate achievements
userAchievementSchema.index({ user: 1, achievementId: 1, moduleId: 1 }, { unique: true });

const UserAchievement = mongoose.model('UserAchievement', userAchievementSchema);

export default UserAchievement;
