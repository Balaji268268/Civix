const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true,
        trim: true
    },
    image: {
        type: String,
        default: null
    },
    type: {
        type: String,
        enum: ['post', 'discussion', 'event', 'poll'],
        default: 'post'
    },
    // Event/Poll specific fields
    title: { type: String }, // For events/polls
    eventDate: { type: Date },
    location: { type: String },
    eventCategory: { type: String }, // e.g. Volunteering, Health
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    comments: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        text: {
            type: String,
            required: true
        },
        date: {
            type: Date,
            default: Date.now
        }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);
