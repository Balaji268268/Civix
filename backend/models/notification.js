const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: String, // 'admin' or userId
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['info', 'warning', 'success', 'error'],
        default: 'info'
    },
    relatedId: {
        type: String, // ID of related issue/poll
    },
    read: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 604800 // Auto-delete after 7 days to keep DB clean
    }
});

module.exports = mongoose.model('Notification', notificationSchema);
