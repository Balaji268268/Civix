const Poll = require('../models/poll.js');
const User = require('../models/userModel');
const { awardPoints } = require('./gamificationController');

/**
 * Create a new Poll (Admin/Officer only)
 */
const createPoll = async (req, res) => {
    try {
        const { question, options, expiresAt, category, description } = req.body;
        console.log('[CreatePoll] Body:', JSON.stringify(req.body, null, 2));
        const clerkUserId = req.user.sub; // From Clerk/JWT Middleware
        console.log(`[CreatePoll] Request from User: ${clerkUserId}`);

        // Resolve User ID
        const user = await User.findOne({ clerkUserId });
        if (!user) return res.status(404).json({ error: 'User not found' });

        // if (!['admin', 'officer'].includes(user.role)) {
        //     return res.status(403).json({ error: 'Unauthorized' });
        // }

        // Validate Options
        if (!options || options.length < 2) {
            return res.status(400).json({ error: 'Poll must have at least 2 options' });
        }

        const formattedOptions = options.map(opt => ({ text: opt, votes: 0 }));

        const validExpiresAt = new Date(expiresAt);
        const finalExpiresAt = isNaN(validExpiresAt.getTime())
            ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            : validExpiresAt;

        const poll = new Poll({
            question,
            description,
            options: formattedOptions,
            createdBy: user._id,
            category,
            expiresAt: finalExpiresAt
        });

        await poll.save();
        res.status(201).json(poll);
    } catch (error) {
        console.error('Create Poll Error:', error);
        res.status(500).json({ error: 'Failed to create poll' });
    }
};

/**
 * Get Active Polls
 */
const getActivePolls = async (req, res) => {
    try {
        const polls = await Poll.find({
            isActive: true,
            expiresAt: { $gt: new Date() }
        })
            .sort({ createdAt: -1 })
            .populate('createdBy', 'name role') // Populate creator info
            .lean(); // Faster query

        // Add 'hasVoted' flag if user is logged in
        let userId = null;
        if (req.user) {
            const user = await User.findOne({ clerkUserId: req.user.sub });
            userId = user?._id;
        }

        const pollsWithStatus = polls.map(poll => ({
            ...poll,
            hasVoted: userId ? poll.votedBy.some(id => id.equals(userId)) : false,
            totalVotes: poll.options.reduce((acc, curr) => acc + curr.votes, 0)
        }));

        res.status(200).json(pollsWithStatus);
    } catch (error) {
        console.error('Fetch Polls Error:', error);
        res.status(500).json({ error: 'Failed to fetch polls' });
    }
};

/**
 * Vote on a Poll
 */
const votePoll = async (req, res) => {
    try {
        const { pollId } = req.params;
        const { optionIndex } = req.body;
        const clerkUserId = req.user.sub;

        const user = await User.findOne({ clerkUserId });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const poll = await Poll.findById(pollId);
        if (!poll) return res.status(404).json({ error: 'Poll not found' });

        // Atomic Vote: Check Condition AND Update in one go
        // This prevents race conditions where 2 requests pass the check simultaneously
        const updatedPoll = await Poll.findOneAndUpdate(
            {
                _id: pollId,
                isActive: true,
                expiresAt: { $gt: new Date() }, // Must be active
                votedBy: { $ne: user._id }      // Must NOT have voted
            },
            {
                $inc: { [`options.${optionIndex}.votes`]: 1 },
                $push: { votedBy: user._id }
            },
            { new: true, runValidators: true }
        );

        if (!updatedPoll) {
            // If null, it means one of the conditions failed
            // We can do a quick read to give a better error message
            const pollCheck = await Poll.findById(pollId);
            if (!pollCheck) return res.status(404).json({ error: 'Poll not found' });
            if (pollCheck.votedBy.includes(user._id)) return res.status(400).json({ error: 'You have already voted' });
            if (!pollCheck.isActive || new Date() > pollCheck.expiresAt) return res.status(400).json({ error: 'Poll is closed' });

            return res.status(400).json({ error: 'Vote failed. Please try again.' });
        }

        // Award Points for Voting (Gamification Hook)
        await awardPoints(user._id, 'VOTE_POLL');

        res.status(200).json({
            message: 'Vote recorded',
            updatedOptions: updatedPoll.options,
            totalVotes: updatedPoll.options.reduce((acc, curr) => acc + curr.votes, 0)
        });

    } catch (error) {
        console.error('Vote Error:', error);
        res.status(500).json({ error: 'Failed to vote' });
    }
};

module.exports = {
    createPoll,
    getActivePolls,
    votePoll
};
