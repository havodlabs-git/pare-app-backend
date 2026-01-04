import mongoose from 'mongoose';

const achievementSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  requirement: {
    type: Number,
    required: true
  },
  points: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['dayCount', 'streak'],
    required: true
  },
  icon: {
    type: String,
    default: 'trophy'
  }
}, {
  timestamps: true
});

const Achievement = mongoose.model('Achievement', achievementSchema);

export default Achievement;
