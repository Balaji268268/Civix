const LostItem = require('../models/LostItem');

// @desc    Report a lost item
// @route   POST /api/lost-items
// @access  Public (or Protected if needed)
exports.reportLostItem = async (req, res) => {
    try {
        const { title, description, category, location, contactName, contactPhone, status, dateLost } = req.body;

        const newItem = new LostItem({
            title,
            description,
            category,
            location,
            contactName,
            contactPhone,
            status: status || 'Lost',
            dateLost: dateLost || Date.now()
        });

        await newItem.save();

        res.status(201).json({
            success: true,
            data: newItem,
            message: "Lost item reported successfully"
        });
    } catch (error) {
        console.error("Error reporting lost item:", error);
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message
        });
    }
};

// @desc    Get all lost items (with filters)
// @route   GET /api/lost-items
// @access  Public
exports.getLostItems = async (req, res) => {
    try {
        const { status, category } = req.query;
        let query = {};

        if (status) query.status = status;
        if (category && category !== 'All') query.category = category;

        const items = await LostItem.find(query).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: items.length,
            data: items
        });
    } catch (error) {
        console.error("Error fetching lost items:", error);
        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};
