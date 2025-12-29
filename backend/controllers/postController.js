const Post = require('../models/post');
const User = require('../models/userModel');

// Create a new post
exports.createPost = async (req, res) => {
    try {
        const { content, image } = req.body;
        // Assuming req.user is populated by verifyToken middleware
        // We need to look up the MongoDB _id using the Clerk ID or however auth is handled
        // Based on previous code, req.user might be the Clerk ID or the User object depending on middleware
        // Let's assume verifyToken attaches the DB user object or at least the clertUserId

        // Safety check: Find the user in our DB first
        // Note: ensure middleware populates req.user.id or we lookup by clerkUserId
        const user = await User.findOne({ clerkUserId: req.user.id });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const newPost = new Post({
            content,
            image,
            author: user._id
        });

        const savedPost = await newPost.save();
        // Populate author details for immediate frontend display
        await savedPost.populate('author', 'name profilePictureUrl role');

        res.status(201).json(savedPost);
    } catch (error) {
        console.error("Error creating post:", error);
        res.status(500).json({ message: "Failed to create post" });
    }
};

// Get posts by a specific user
exports.getUserPosts = async (req, res) => {
    try {
        // If accessing own posts or admin accessing user posts
        // req.query.userId (MongoDB ID) can be used if we want specific user posts
        // For "My Posts", we use the logged-in user

        let userId = req.query.userId;

        if (!userId) {
            // Default to current logged in user if not specified
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
        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .populate('author', 'name profilePictureUrl role')
            .populate('comments.user', 'name profilePictureUrl');
        res.status(200).json(posts);
    } catch (error) {
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
        const user = await User.findOne({ clerkUserId: req.user.id });
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
exports.toggleLike = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findOne({ clerkUserId: req.user.id });
        if (!user) return res.status(404).json({ message: "User not found" });

        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ message: "Post not found" });

        const index = post.likes.indexOf(user._id);
        if (index === -1) {
            post.likes.push(user._id);
        } else {
            post.likes.splice(index, 1);
        }
        await post.save();
        res.status(200).json(post);
    } catch (error) {
        res.status(500).json({ message: "Like failed" });
    }
};
