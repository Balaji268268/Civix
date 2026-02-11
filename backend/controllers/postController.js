const Post = require('../models/post');
const User = require('../models/userModel');
const Issue = require('../models/issues');
const { awardPoints } = require('./gamificationController');

// ... (existing code for createPost, getUserPosts, getAllPosts, deletePost)

// Upvote Post
exports.upvotePost = async (req, res) => {
    try {
        const { id } = req.params;

        // Fix: req.user is already the DB User from validate.js
        let user = req.user;
        if (!user._id) {
            user = await User.findOne({ clerkUserId: req.user.id || req.user.sub });
        }

        if (!user) {
            console.log("[Upvote] User not found for ID:", req.user?.id);
            return res.status(404).json({ message: "User not found" });
        }

        const post = await Post.findById(id);
        if (!post) {
            console.log("[Upvote] Post not found:", id);
            return res.status(404).json({ message: "Post not found" });
        }

        const upvoteIndex = post.upvotes.findIndex(uid => uid.toString() === user._id.toString());
        const downvoteIndex = post.downvotes.findIndex(uid => uid.toString() === user._id.toString());

        // If already upvoted, remove upvote
        if (upvoteIndex !== -1) {
            post.upvotes.splice(upvoteIndex, 1);
        } else {
            // If downvoted, remove downvote first
            if (downvoteIndex !== -1) {
                post.downvotes.splice(downvoteIndex, 1);
            }
            // Add upvote
            post.upvotes.push(user._id);
            // Gamification: Award XP for Upvoting
            await awardPoints(user._id, 'LIKE_POST');
        }

        await post.save();

        // --- Dynamic Priority Logic (for Issue Posts) ---
        const netScore = post.upvotes.length - post.downvotes.length;
        if (post.linkedIssue && netScore >= 10) {
            try {
                const issue = await Issue.findById(post.linkedIssue);
                if (issue && issue.priority === 'Medium') {
                    issue.priority = 'High';
                    issue.timeline.push({
                        status: issue.status,
                        message: `Priority upgraded to High due to community upvotes (${netScore} net score).`,
                        byUser: 'System'
                    });
                    await issue.save();
                    console.log(`[Priority Upgrade] Issue ${issue.complaintId} upgraded to High`);
                }
            } catch (err) {
                console.warn("Failed to upgrade issue priority:", err.message);
            }
        }

        res.status(200).json(post);
    } catch (error) {
        console.error("[Upvote] Error:", error);
        res.status(500).json({ message: "Upvote failed" });
    }
};

// Downvote Post
exports.downvotePost = async (req, res) => {
    try {
        const { id } = req.params;

        let user = req.user;
        if (!user._id) {
            user = await User.findOne({ clerkUserId: req.user.id || req.user.sub });
        }

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const post = await Post.findById(id);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        const upvoteIndex = post.upvotes.findIndex(uid => uid.toString() === user._id.toString());
        const downvoteIndex = post.downvotes.findIndex(uid => uid.toString() === user._id.toString());

        // If already downvoted, remove downvote
        if (downvoteIndex !== -1) {
            post.downvotes.splice(downvoteIndex, 1);
        } else {
            // If upvoted, remove upvote first
            if (upvoteIndex !== -1) {
                post.upvotes.splice(upvoteIndex, 1);
            }
            // Add downvote
            post.downvotes.push(user._id);
        }

        await post.save();
        res.status(200).json(post);
    } catch (error) {
        console.error("[Downvote] Error:", error);
        res.status(500).json({ message: "Downvote failed" });
    }
};

// Add Comment
exports.addComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { text } = req.body;

        if (!text) return res.status(400).json({ message: "Comment text required" });

        // Fix: req.user is already the DB User
        let user = req.user;
        if (!user._id) {
            user = await User.findOne({ clerkUserId: req.user.id || req.user.sub });
        }

        if (!user) return res.status(404).json({ message: "User not found (Auth Error)" });

        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ message: "Post not found" });

        const newComment = {
            user: user._id,
            text,
            createdAt: new Date()
        };

        post.comments.push(newComment);
        await post.save();

        // Gamification: Award XP for Commenting
        await awardPoints(user._id, 'COMMENT_POST');

        // Return fully populated post
        await post.populate('comments.user', 'name profilePictureUrl');
        res.status(201).json(post);
    } catch (error) {
        console.error("Comment error:", error);
        res.status(500).json({ message: "Comment failed" });
    }
};
exports.createPost = async (req, res) => {
    try {
        const { content, image, type, title, eventDate, location, eventCategory } = req.body;

        // Fix: req.user is already populated
        let user = req.user;
        if (!user._id) {
            user = await User.findOne({ clerkUserId: req.user.id || req.user.sub });
        }

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const newPost = new Post({
            content,
            image,
            type: type || 'post',
            title,
            eventDate,
            location,
            eventCategory,
            author: user._id
        });

        const savedPost = await newPost.save();
        await savedPost.populate('author', 'name profilePictureUrl role');

        res.status(201).json(savedPost);

        // Notify Admin for Events
        if (type === 'event') {
            try {
                await require('../models/notification').create({
                    recipient: 'admin',
                    title: 'New Event Proposed',
                    message: `Event "${title}" scheduled for ${eventDate} by ${user.name}.`,
                    type: 'info',
                    relatedId: savedPost._id,
                    onModel: 'Post'
                });
            } catch (e) {
                console.warn("Notification error:", e.message);
            }
        }
    } catch (error) {
        console.error("Error creating post:", error);
        res.status(500).json({ message: "Failed to create post" });
    }
};

// Get posts by a specific user
exports.getUserPosts = async (req, res) => {
    try {
        let userId = req.query.userId;

        if (!userId) {
            const user = await User.findOne({ clerkUserId: req.user.id });
            if (!user) return res.status(404).json({ message: "User not found" });
            userId = user._id;
        }

        const posts = await Post.find({ author: userId })
            .sort({ createdAt: -1 })
            .populate('author', 'name profilePictureUrl role')
            .populate('comments.user', 'name profilePictureUrl');

        res.status(200).json(posts);
    } catch (error) {
        console.error("Error fetching user posts:", error);
        res.status(500).json({ message: "Failed to fetch posts" });
    }
};

// Get all posts (Feed)
exports.getAllPosts = async (req, res) => {
    try {
        const { filter } = req.query;
        let query = {};

        if (filter === 'discussions') {
            query.type = 'discussion';
        } else if (filter === 'events') {
            query.type = 'event';
        }

        let mongoUserId = null;
        if (req.user) {
            const user = await User.findOne({ clerkUserId: req.user.id });
            if (user) mongoUserId = user._id;
        }

        const posts = await Post.find(query)
            .sort({ createdAt: -1 })
            .populate('author', 'name profilePictureUrl role')
            .populate('comments.user', 'name profilePictureUrl')
            .lean(); // Use lean to modify the object

        // Inject isLiked flag
        const postsWithIsLiked = posts.map(post => {
            const isLiked = mongoUserId ? post.likes.some(id => id.toString() === mongoUserId.toString()) : false;
            return { ...post, isLiked };
        });

        res.status(200).json(postsWithIsLiked);
    } catch (error) {
        console.error("Feed Error", error);
        res.status(500).json({ message: "Failed to fetch feed" });
    }
};

// Delete a post
exports.deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        const post = await Post.findById(id);

        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        // Check ownership or admin role
        let user = req.user;
        if (!user._id) {
            user = await User.findOne({ clerkUserId: req.user.id || req.user.sub });
        }
        if (!user) return res.status(403).json({ message: "Unauthorized" });

        // Allow if author or admin
        if (post.author.toString() !== user._id.toString() && user.role !== 'admin') {
            return res.status(403).json({ message: "Not authorized to delete this post" });
        }

        await Post.findByIdAndDelete(id);
        res.status(200).json({ message: "Post deleted successfully" });
    } catch (error) {
        console.error("Error deleting post:", error);
        res.status(500).json({ message: "Failed to delete post" });
    }
};

// Toggle Like
// Toggle Like
exports.toggleLike = async (req, res) => {
    try {
        const { id } = req.params;

        // Fix: req.user is already the DB User from validate.js
        let user = req.user;
        if (!user._id) {
            user = await User.findOne({ clerkUserId: req.user.id || req.user.sub });
        }

        if (!user) {
            console.log("[ToggleLike] User not found for ID:", req.user?.id);
            return res.status(404).json({ message: "User not found" });
        }

        const post = await Post.findById(id);
        if (!post) {
            console.log("[ToggleLike] Post not found:", id);
            return res.status(404).json({ message: "Post not found" });
        }

        if (!post) {
            console.log("[ToggleLike] Post not found:", id);
            return res.status(404).json({ message: "Post not found" });
        }

        // Fix: Use string comparison for ObjectIds
        const index = post.likes.findIndex(likeId => likeId.toString() === user._id.toString());

        if (index === -1) {
            post.likes.push(user._id);
        } else {
            post.likes.splice(index, 1);
        }
        await post.save();

        // Return updated simple object or populate?
        // Let's return the updated list size or boolean to help frontend if needed, 
        // but frontend expects the post object.
        res.status(200).json(post);
    } catch (error) {
        console.error("[ToggleLike] Error:", error);
        res.status(500).json({ message: "Like failed" });
    }
};

// Add Comment
exports.addComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { text } = req.body;

        if (!text) return res.status(400).json({ message: "Comment text required" });

        // Fix: req.user is already the DB User
        let user = req.user;
        if (!user._id) {
            user = await User.findOne({ clerkUserId: req.user.id || req.user.sub });
        }

        if (!user) return res.status(404).json({ message: "User not found (Auth Error)" });

        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ message: "Post not found" });

        const newComment = {
            user: user._id,
            text,
            createdAt: new Date()
        };

        post.comments.push(newComment);
        await post.save();

        // Return fully populated post or just the comment? 
        // Returning post is safer for state sync
        await post.populate('comments.user', 'name profilePictureUrl');
        res.status(201).json(post);
    } catch (error) {
        console.error("Comment error:", error);
        res.status(500).json({ message: "Comment failed" });
    }
};
