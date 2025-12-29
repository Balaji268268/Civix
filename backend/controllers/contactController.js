const Contact = require('../models/contact');
const Notification = require('../models/notification');
const { asyncHandler } = require('../utils/asyncHandler');

// @desc    Submit a new contact query
// @route   POST /api/contact
// @access  Public
const submitQuery = asyncHandler(async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        res.status(400);
        throw new Error('Please fill in all fields');
    }

    const contact = await Contact.create({
        name,
        email,
        message
    });

    // Notify Admin
    try {
        await Notification.create({
            recipient: 'admin',
            title: 'New Contact Query',
            message: `New message from ${name}: "${message.substring(0, 50)}..."`,
            type: 'info',
            relatedId: contact._id
        });
    } catch (error) {
        console.error("Failed to create notification for contact query:", error);
    }

    res.status(201).json({
        success: true,
        data: contact,
        message: 'Query submitted successfully'
    });
});

// @desc    Get all contact queries
// @route   GET /api/contact
// @access  Admin
const getQueries = asyncHandler(async (req, res) => {
    const queries = await Contact.find().sort({ createdAt: -1 });
    res.json(queries);
});

module.exports = { submitQuery, getQueries };
