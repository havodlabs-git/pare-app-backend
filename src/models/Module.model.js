import mongoose from 'mongoose';

const relapseSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  daysSinceLast: {
    type: Number,
    required: true,
    default: 0
  },
  notes: {
    type: String,
    maxlength: 500
  }
}, { _id: true });

const moduleSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  moduleId: {
    type: String,
    required: true,
    enum: ['pornography', 'social_media', 'smoking', 'alcohol', 'shopping']
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  dayCount: {
    type: Number,
    default: 0,
    min: 0
  },
  level: {
    type: Number,
    default: 1,
    min: 1
  },
  points: {
    type: Number,
    default: 0,
    min: 0
  },
  longestStreak: {
    type: Number,
    default: 0,
    min: 0
  },
  currentStreak: {
    type: Number,
    default: 0,
    min: 0
  },
  totalRelapses: {
    type: Number,
    default: 0,
    min: 0
  },
  lastCheckIn: {
    type: Date,
    default: Date.now
  },
  relapseHistory: [relapseSchema],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster queries
moduleSchema.index({ user: 1, moduleId: 1 });
moduleSchema.index({ user: 1, isActive: 1 });

// Method to add a relapse
moduleSchema.methods.addRelapse = function(notes = '') {
  const daysSinceLast = this.currentStreak;
  
  this.relapseHistory.push({
    date: new Date(),
    daysSinceLast,
    notes
  });
  
  this.totalRelapses += 1;
  this.currentStreak = 0;
  this.dayCount = 0;
  this.lastCheckIn = new Date();
  
  return this.save();
};

// Method to update daily progress
moduleSchema.methods.updateDailyProgress = function() {
  const now = new Date();
  const lastCheck = new Date(this.lastCheckIn);
  
  // Check if it's a new day
  if (lastCheck.toDateString() !== now.toDateString()) {
    const daysPassed = Math.floor((now - lastCheck) / (1000 * 60 * 60 * 24));
    
    if (daysPassed > 0) {
      this.dayCount += daysPassed;
      this.currentStreak += daysPassed;
      this.points += daysPassed * 10;
      this.level = Math.floor(this.points / 100) + 1;
      this.longestStreak = Math.max(this.longestStreak, this.currentStreak);
      this.lastCheckIn = now;
      
      return this.save();
    }
  }
  
  return Promise.resolve(this);
};

const Module = mongoose.model('Module', moduleSchema);

export default Module;
