const Notification = require('../models/notification');
const Issue = require('../models/issues');
const { asyncHandler } = require('../utils/asyncHandler');

const getNotifications = asyncHandler(async (req, res) => {
    const userId = req.user?.id; // Assuming auth middleware sets this
    const today = new Date();

    // 1. LAZY CHECK: Stale Issues (Admin Only)
    // If user is admin (you might need to check role here, or just let frontend filtering handle it if simpler for now)
    // For 'admin' recipient checks:
    const staleThreshold = new Date(today.setDate(today.getDate() - 7));

    // Find stale issues that are pending
    const staleIssues = await Issue.find({
        status: 'Pending',
        createdAt: { $lt: staleThreshold }
    });

    for (const issue of staleIssues) {
        // Check if notification already exists to avoid spam
        const exists = await Notification.findOne({
            recipient: 'admin',
            type: 'warning',
            relatedId: issue._id.toString()
        });

        if (!exists) {
            await Notification.create({
                recipient: 'admin',
                title: 'Stale Issue Alert',
                message: `Issue "${issue.title}" has been pending for over 7 days.`,
                type: 'warning',
                relatedId: issue._id
            });
        }
    }

    // 2. Fetch Notifications
    // Get notifications for this specific user OR generic 'admin' notifications if user is admin.
    // Assuming frontend passes context or we just fetch based on ID. 
    // Let's simplified: fetch 'admin' OR 'userId'.

    let query = { recipient: userId };

    // Check role in multiple places (Clerk metadata structure)
    const role = req.user?.role || req.user?.public_metadata?.role || req.user?.unsafe_metadata?.role;
    const email = req.user?.email || "";

    // Role-based filtering
    if (role === 'admin' || email.includes("admin")) {
        // Admins see their requests + global admin alerts
        query = { $or: [{ recipient: userId }, { recipient: 'admin' }] };
    } else if (role === 'moderator') {
        // Moderators see their requests + moderator alerts
        query = { $or: [{ recipient: userId }, { recipient: 'moderator' }] };
    } else if (role === 'officer') {
        // Officers see their requests + officer alerts + alerts for their specific department (future proofing)
        query = { $or: [{ recipient: userId }, { recipient: 'officer' }] };
    }

    const notifications = await Notification.find(query).sort({ createdAt: -1 });
    res.json(notifications);
});

const markAsRead = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await Notification.findByIdAndUpdate(id, { read: true });
    res.json({ success: true });
});

const clearAll = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    let query = { recipient: userId };
    if (req.user?.role === 'admin') {
        query = { $or: [{ recipient: userId }, { recipient: 'admin' }] };
    }
    await Notification.updateMany(query, { read: true });
    res.json({ success: true });
});

module.exports = { getNotifications, markAsRead, clearAll };
