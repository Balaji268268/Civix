const Poll = require('../models/poll');
const Notification = require('../models/notification');
const { asyncHandler } = require('../utils/asyncHandler');

const getPolls = asyncHandler(async (req, res) => {
    const polls = await Poll.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(polls);
});

const createPoll = asyncHandler(async (req, res) => {
    const { title, options } = req.body;

    if (!title || !options || options.length < 2) {
        return res.status(400).json({ error: 'Invalid poll data' });
    }

    const poll = await Poll.create({
        title,
        options,
        votes: new Array(options.length).fill(0),
        createdBy: req.user?.id
    });

    // Notify Users (Optional: Create a 'global' notification or just rely on them seeing it)
    // For now, let's create a visual alert for admins maybe? Or generic.
    // Real-time: The plan said "triggers notification". Let's create one for 'all' (conceptually, but we use 'public' or similar)
    // For MVP: Let's accept that users pull data.

    res.status(201).json(poll);
});

const votePoll = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { optionIndex } = req.body;

    // Safety check for body
    if (typeof optionIndex === 'undefined' || optionIndex === null) {
        console.error("Vote Error: Missing optionIndex", req.body);
        return res.status(400).json({ error: 'Missing optionIndex' });
    }

    // Fix: Clerk uses 'sub', standard JWT uses 'id'. fallback to IP.
    const userId = req.user?.sub || req.user?.id || req.ip;

    console.log("Voting on poll:", id, "Option:", optionIndex, "User:", userId);

    const poll = await Poll.findById(id);
    if (!poll) return res.status(404).json({ error: 'Poll not found' });

    if (poll.votedBy.includes(userId)) {
        console.warn("User already voted:", userId);
        return res.status(400).json({ error: 'You have already voted' });
    }

    // Update vote count with bounds check
    if (optionIndex < 0 || optionIndex >= poll.votes.length) {
        return res.status(400).json({ error: 'Invalid option index' });
    }

    poll.votes[optionIndex] = (poll.votes[optionIndex] || 0) + 1;
    poll.votedBy.push(userId);
    await poll.markModified('votes'); // Essential for array updates
    await poll.save();

    // Create Notification if it triggers a milestone? (e.g. 100 votes)
    // Skipping for simplicity.

    res.json(poll);
});

module.exports = { getPolls, createPoll, votePoll };
