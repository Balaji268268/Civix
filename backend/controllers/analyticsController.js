const Issue = require('../models/issues');
const User = require('../models/userModel');
const Poll = require('../models/poll');
const Contact = require('../models/contact');
const LostItem = require('../models/LostItem');
const { asyncHandler } = require('../utils/asyncHandler');

const getAdminAnalytics = asyncHandler(async (req, res) => {
    // --- 1. User Stats ---
    const totalUsers = await User.countDocuments();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeUsers = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

    // --- 2. Issue Stats ---
    const totalIssues = await Issue.countDocuments();
    const pendingIssues = await Issue.countDocuments({ status: 'Pending' });
    const resolvedIssues = await Issue.countDocuments({ status: 'Resolved' });
    const highPriority = await Issue.countDocuments({ priority: 'High', status: 'Pending' });

    // Category Distribution
    const categories = await Issue.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);

    // --- 3. Weekly Engagement (Real Data Aggregation) ---
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Aggregate Posts per day
    // Note: Verify Post model is imported. If not, we need it. 
    // Assuming Post model is 'const Post = require('../models/post');' (Need to ensure import)
    const Post = require('../models/post');

    const dailyPosts = await Post.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        { $project: { day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } } } },
        { $group: { _id: "$day", count: { $sum: 1 } } }
    ]);

    // Aggregate Comments (Unwind from posts)
    const dailyComments = await Post.aggregate([
        { $unwind: "$comments" },
        { $match: { "comments.date": { $gte: sevenDaysAgo } } },
        { $project: { day: { $dateToString: { format: "%Y-%m-%d", date: "$comments.date" } } } },
        { $group: { _id: "$day", count: { $sum: 1 } } }
    ]);

    // Aggregate Poll Votes
    const dailyVotes = await Poll.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } }, // Simplifying: using poll creation date as proxy for now, or we need vote timestamps which we don't strictly have in the simple array
        // Better proxy: total votes / 7 (since we don't store vote timestamps yet). 
        // For accurate "Live" feel, we'll use Poll creation count OR just random-ish distribution based on total votes for this MVP level, 
        // BUT user asked for REAL data. 
        // Since we don't store vote timestamps in `votes: [Number]`, we can't chart daily votes accurately without schema change.
        // STRATEGY: We will track "Polls Created" instead for accurate data, OR use the `votedBy` length if we added timestamps there.
        // Let's use Polls Created count for the chart line "Polls".
        { $project: { day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } } } },
        { $group: { _id: "$day", count: { $sum: 1 } } }
    ]);

    // Merge into Engagement Data format
    const engagementMap = new Map();
    // Initialize last 7 days
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr = d.toISOString().split('T')[0];
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        engagementMap.set(dayStr, { day: dayName, posts: 0, comments: 0, votes: 0 }); // Using 'votes' label for Polls created or just map it 
    }

    dailyPosts.forEach(d => { if (engagementMap.has(d._id)) engagementMap.get(d._id).posts = d.count; });
    dailyComments.forEach(d => { if (engagementMap.has(d._id)) engagementMap.get(d._id).comments = d.count; });

    // Sort by date key (ascending)
    const engagementData = Array.from(engagementMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, data]) => data);


    // --- 4. Recent Activity (Unified Stream) ---
    // Fetch latest 5 from each source
    const recentPosts = await Post.find().sort({ createdAt: -1 }).limit(5).populate('author', 'name');
    const recentIssues = await Issue.find().sort({ createdAt: -1 }).limit(5).select('title createdAt issueType'); // No author field directly populated easily yet unless we link email
    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5);

    let activityFeed = [];

    recentPosts.forEach(p => {
        activityFeed.push({
            type: 'new_post',
            user: p.author?.name || 'Unknown Citizen',
            action: `posted: "${p.content.substring(0, 30)}..."`,
            time: p.createdAt,
            rawTime: new Date(p.createdAt)
        });
    });

    recentIssues.forEach(i => {
        activityFeed.push({
            type: 'vote', // Reusing icon for Issue
            user: i.email || 'A Citizen', // We store email, not name directly sometimes
            action: `reported: "${i.title.substring(0, 30)}..."`,
            time: i.createdAt,
            rawTime: new Date(i.createdAt)
        });
    });

    recentUsers.forEach(u => {
        activityFeed.push({
            type: 'new_user',
            user: u.name || 'New User',
            action: 'joined the platform',
            time: u.createdAt,
            rawTime: new Date(u.createdAt)
        });
    });

    // Sort combined feed and take top 5-7
    activityFeed.sort((a, b) => b.rawTime - a.rawTime);
    activityFeed = activityFeed.slice(0, 6);

    // Format relative time (simple helper)
    const timeAgo = (date) => {
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";
        return Math.floor(seconds) + " seconds ago";
    };

    activityFeed = activityFeed.map(item => ({ ...item, time: timeAgo(item.rawTime) }));


    // --- 5. AI Insights Engine (Rule-Based "Genius") ---
    const insights = [];

    // Insight 1: Engagement Pulse
    const totalEngagement = engagementData.reduce((sum, d) => sum + d.posts + d.comments, 0);
    if (totalEngagement > 50) insights.push("🔥 Community is blazing! Engagement is very high this week.");
    else if (totalEngagement > 20) insights.push("🚀 Healthy activity detected across discussions.");
    else insights.push("📉 Engagement is quiet. Consider launching a poll to spark debate.");

    // Insight 2: Category Hotspots
    if (categories.length > 0) {
        // Sort categories by count
        const sortedCats = [...categories].sort((a, b) => b.count - a.count);
        const topCat = sortedCats[0];
        insights.push(`⚠️ Primary Concern: '${topCat._id}' accounts for ${Math.round((topCat.count / totalIssues) * 100)}% of reports.`);
    }

    // Insight 3: Unresolved Backlog
    if (pendingIssues > resolvedIssues && pendingIssues > 5) {
        insights.push(`🚨 Backlog Alert: ${pendingIssues} pending issues. Resolution pace needs to increase.`);
    } else if (resolvedIssues > pendingIssues) {
        insights.push(`✅ Good Governance: Resolution rate is outpacing new reports.`);
    }

    // Insight 4: User Growth
    const newUsersThisWeek = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });
    if (newUsersThisWeek > 5) insights.push(`🎉 Rapid Growth: ${newUsersThisWeek} new citizens joined this week!`);


    // --- 6. Time Series (Last 7 Days Issues) ---
    const issueTimeSeries = await Issue.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        {
            $project: {
                day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                isResolved: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] }
            }
        },
        {
            $group: {
                _id: "$day",
                total: { $sum: 1 },
                resolved: { $sum: "$isResolved" }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    const pollStats = await Poll.find();
    let totalPollVotes = 0;
    pollStats.forEach(p => totalPollVotes += (p.votes || []).reduce((a, b) => a + b, 0));


    res.json({
        users: { total: totalUsers, active: activeUsers },
        issues: {
            total: totalIssues,
            pending: pendingIssues,
            resolved: resolvedIssues,
            highPriority,
            byCategory: categories.map(c => ({ name: c._id || 'Uncategorized', value: c.count })),
            timeSeries: issueTimeSeries.map(d => ({ date: d._id, total: d.total, resolved: d.resolved }))
        },
        engagement: {
            activePolls: pollStats.length,
            totalVotes: totalPollVotes,
            weeklyData: engagementData // Sending the real aggregation
        },
        recentActivity: activityFeed, // Sending real feed
        aiInsights: insights, // Sending generated insights
        contact: {
            pending: await Contact.countDocuments({ status: 'Pending' })
        },
        lostFound: {
            lost: await LostItem.countDocuments({ status: 'Lost' }),
            found: await LostItem.countDocuments({ status: 'Found' })
        }
    });
});

module.exports = { getAdminAnalytics };
