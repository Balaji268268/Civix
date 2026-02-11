const Comment = require('../models/comment');
const Post = require('../models/post');
const User = require('../models/userModel');
const Notification = require('../models/notification');
const { awardPoints } = require('./gamificationController');

// Add Comment (Threaded)
exports.addComment = async (req, res) => {
    try {
        const { id } = req.params; // Post ID
        const { text, parentCommentId } = req.body;

        if (!text) return res.status(400).json({ message: "Comment content required" });

        // User Auth
        let user = req.user;
        if (!user._id) {
            user = await User.findOne({ clerkUserId: req.user.id || req.user.sub });
        }
        if (!user) return res.status(404).json({ message: "User not found" });

        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ message: "Post not found" });

        // Create Comment
        const newComment = new Comment({
            content: text,
            author: user._id,
            post: post._id,
            parentComment: parentCommentId || null
        });

        const savedComment = await newComment.save();

        // Populate Author for immediate UI update
        await savedComment.populate('author', 'name profilePictureUrl role');

        // Gamification
        await awardPoints(user._id, 'COMMENT_POST');

        // NOTIFICATIONS
        // 1. Notify Post Author (if not self)
        if (post.author.toString() !== user._id.toString()) {
            await Notification.create({
                recipient: post.author,
                title: "New Comment",
                message: `${user.name} commented on your post`,
                type: 'comment',
                relatedId: post._id,
                onModel: 'Post'
            });
        }

        // 2. Notify Parent Comment Author (if replying and not self)
        if (parentCommentId) {
            const parent = await Comment.findById(parentCommentId);
            if (parent && parent.author.toString() !== user._id.toString() && parent.author.toString() !== post.author.toString()) {
                await Notification.create({
                    recipient: parent.author,
                    title: "New Reply",
                    message: `${user.name} replied to your comment`,
                    type: 'comment',
                    relatedId: post._id, // Link to post
                    onModel: 'Post'
                });
            }
        }

        res.status(201).json(savedComment);
    } catch (error) {
        console.error("Add Comment Error:", error);
        res.status(500).json({ message: "Failed to add comment" });
    }
};

// Get Comments for a Post
exports.getComments = async (req, res) => {
    try {
        const { id } = req.params; // Post ID

        // Fetch all comments for this post
        const comments = await Comment.find({ post: id })
            .populate('author', 'name profilePictureUrl role')
            .lean();

        // Calculate Reply Counts manually since we have the full list
        const replyCounts = {};
        comments.forEach(c => {
            if (c.parentComment) {
                replyCounts[c.parentComment] = (replyCounts[c.parentComment] || 0) + 1;
            }
        });

        // Add engagement score
        comments.forEach(c => {
            const replies = replyCounts[c._id] || 0;
            const likes = c.likes ? c.likes.length : 0;
            c.replyCount = replies; // Inject for frontend
            c.engagementScore = likes + replies;
        });

        // Sorting Logic requested by User
        // If > 3 comments: Sort by Engagement (Desc), then Date (Desc)
        // If <= 3 comments: Sort by Date (Desc) - usually Newest First is better for small lists? 
        // Or Oldest First for chat style? User said "as usual", which was specific.
        // Let's go with:
        // > 3: Engagement sorting
        // <= 3: Chronological (Oldest First) 

        if (comments.length > 3) {
            comments.sort((a, b) => {
                if (b.engagementScore !== a.engagementScore) {
                    return b.engagementScore - a.engagementScore; // Higest engagement first
                }
                return new Date(b.createdAt) - new Date(a.createdAt); // Then newest
            });
        } else {
            comments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); // Oldest first (Chronological)
        }

        res.json(comments);
    } catch (error) {
        console.error("Get Comments Error:", error);
        res.status(500).json({ message: "Failed to fetch comments" });
    }
};

// Toggle Like on Comment
exports.toggleLike = async (req, res) => {
    try {
        const { id } = req.params; // Comment ID (Note: Route is /comments/:id/like)

        let user = req.user;
        if (!user._id) {
            user = await User.findOne({ clerkUserId: req.user.id || req.user.sub });
        }
        if (!user) return res.status(404).json({ message: "User not found" });

        const comment = await Comment.findById(id);
        if (!comment) return res.status(404).json({ message: "Comment not found" });

        const index = comment.likes.findIndex(uid => uid.toString() === user._id.toString());

        if (index === -1) {
            comment.likes.push(user._id);
            // Notify Author
            if (comment.author.toString() !== user._id.toString()) {
                await Notification.create({
                    recipient: comment.author,
                    title: "Comment Liked",
                    message: `${user.name} liked your comment`,
                    type: 'like',
                    relatedId: comment.post, // Link to post
                    onModel: 'Post'
                });
            }
        } else {
            comment.likes.splice(index, 1);
        }

        await comment.save();
        res.json(comment); // Return updated comment
    } catch (error) {
        console.error("Like Comment Error:", error);
        res.status(500).json({ message: "Failed to like comment" });
    }
};
