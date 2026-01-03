const Community = require('../models/community');
const User = require('../models/userModel');

// Get All Communities
exports.getAllCommunities = async (req, res) => {
    try {
        const communities = await Community.find()
            .sort({ members: -1 }) // Sort by popularity
            .populate('creator', 'name');

        // Return with member count
        const result = communities.map(c => ({
            ...c.toObject(),
            memberCount: c.members.length
        }));

        res.status(200).json(result);
    } catch (error) {
        console.error("Fetch Communities Error:", error);
        res.status(500).json({ message: "Failed to fetch communities" });
    }
};

// Create Community
exports.createCommunity = async (req, res) => {
    try {
        const { name, description, image, category } = req.body;
        const user = await User.findOne({ clerkUserId: req.user.id });
        if (!user) return res.status(404).json({ message: "User not found" });

        const existing = await Community.findOne({ name });
        if (existing) return res.status(400).json({ message: "Community name already taken" });

        const newCommunity = new Community({
            name,
            description,
            image,
            category,
            creator: user._id,
            members: [user._id] // Creator is first member
        });

        await newCommunity.save();

        // Notify Admin
        try {
            await require('../models/notification').create({
                recipient: 'admin',
                title: 'New Community Created',
                message: `Community "${name}" has been created by ${user.name || user.email}.`,
                type: 'info',
                relatedId: newCommunity._id,
                onModel: 'Community'
            });
        } catch (e) {
            console.warn("Notification error:", e.message);
        }

        res.status(201).json(newCommunity);
    } catch (error) {
        console.error("Create Community Error:", error);
        res.status(500).json({ message: "Failed to create community" });
    }
};

// Join Community
exports.joinCommunity = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findOne({ clerkUserId: req.user.id });
        if (!user) return res.status(404).json({ message: "User not found" });

        const community = await Community.findById(id);
        if (!community) return res.status(404).json({ message: "Community not found" });

        const isMember = community.members.includes(user._id);
        if (isMember) {
            // Leave
            community.members = community.members.filter(m => m.toString() !== user._id.toString());
        } else {
            // Join
            community.members.push(user._id);
        }

        await community.save();
        res.status(200).json({
            message: isMember ? "Left community" : "Joined community",
            memberCount: community.members.length,
            isMember: !isMember
        });
    } catch (error) {
        res.status(500).json({ message: "Action failed" });
    }
};
