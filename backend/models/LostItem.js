const mongoose = require('mongoose');

const lostItemSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['Electronics', 'Documents', 'Keys', 'Wallet', 'Clothing', 'Accessories', 'Other'],
        default: 'Other'
    },
    location: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Lost', 'Found', 'Returned'],
        default: 'Lost'
    },
    contactName: {
        type: String,
        required: true
    },
    contactPhone: {
        type: String,
        required: true
    },
    dateLost: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('LostItem', lostItemSchema);
