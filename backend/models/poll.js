const mongoose = require('mongoose');

const pollSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    options: [{
        text: { type: String, required: true },
        votes: { type: Number, default: 0 }
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    votedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    category: {
        type: String,
        enum: ['Infrastructure', 'Events', 'Policy', 'General'],
        default: 'General'
    },
    expiresAt: {
        type: Date,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Virtual to calculate total votes
pollSchema.virtual('totalVotes').get(function () {
    return this.options.reduce((acc, curr) => acc + curr.votes, 0);
});

// Index for fetching active polls
pollSchema.index({ isActive: 1, expiresAt: 1 });

module.exports = mongoose.model('Poll', pollSchema);
