const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, default: null },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user' }, // could be 'admin' or 'user'
  location: { type: String, default: null },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number }
  },
  profilePictureUrl: { type: String, default: null },
  clerkUserId: { type: String, unique: true, sparse: true }, // For Clerk integration
  trustScore: { type: Number, default: 100 },
  department: { type: String, default: null }, // e.g. 'Sanitation', 'Roads'
  activeTasks: { type: Number, default: 0 }, // For load balancing
  gamification: {
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    points: { type: Number, default: 0 },
    badges: [{
      id: { type: String },
      name: { type: String },
      icon: { type: String },
      awardedAt: { type: Date, default: Date.now }
    }],
    completedScenarios: [{ type: String }] // IDs of completed scenarios
  },
  profileSetupCompleted: { type: Boolean, default: false },
  isAvailable: { type: Boolean, default: true }
}, { timestamps: true });

// Method to check if profile is complete
userSchema.methods.isProfileComplete = function () {
  return Boolean(this.name && this.email && this.location);
};

// Static method to find user by Clerk ID
userSchema.statics.findByClerkId = function (clerkUserId) {
  return this.findOne({ clerkUserId });
};

module.exports = mongoose.model('User', userSchema);



