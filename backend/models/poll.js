const mongoose = require('mongoose');

const pollSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    options: {
        type: [String],
        required: true
    },
    votes: {
        type: [Number], // Array of vote counts corresponding to options
        default: function () { return new Array(this.options.length).fill(0); }
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    votedBy: [{ // Track who voted to prevent double voting (basic)
        type: String // UserId or IP if anonymous (using UserId for now)
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Poll', pollSchema);
