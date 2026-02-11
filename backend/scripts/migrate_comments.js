const mongoose = require('mongoose');
const path = require('path');
const Post = require('../models/post');
const Comment = require('../models/comment');
const User = require('../models/userModel');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const migrateComments = async () => {
    try {
        console.log("Connecting to DB...");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected.");

        // Find posts with embedded comments
        const posts = await Post.find({ 'comments.0': { $exists: true } });
        console.log(`Found ${posts.length} posts with embedded comments.`);

        for (const post of posts) {
            console.log(`Processing Post ${post._id}...`);
            let migratedCount = 0;

            for (const embeddedComment of post.comments) {
                // Check if already migrated? (Hard to track, but we can assume if Comment exists with same content/date/author)
                // For safety, let's just create new ones. Deduplication logic is complex.
                // Or better: check if a comment exists with this post ID and this content.

                const existing = await Comment.findOne({
                    post: post._id,
                    content: embeddedComment.text,
                    author: embeddedComment.user,
                    createdAt: embeddedComment.date
                });

                if (!existing) {
                    const newComment = new Comment({
                        content: embeddedComment.text,
                        author: embeddedComment.user, // Assuming this is an ObjectId
                        post: post._id,
                        likes: [], // Lost legacy likes if they weren't tracked? Post schema had likes for post, not comments? 
                        // Actually Post schema comments didn't have likes array usually.
                        createdAt: embeddedComment.date || Date.now()
                    });

                    try {
                        await newComment.save();
                        migratedCount++;
                    } catch (e) {
                        console.error(`Failed to migrate comment on post ${post._id}:`, e.message);
                    }
                }
            }

            // clear embedded comments? OR keep them for safety?
            // If we keep them, the UI `post.comments.length` will still count them, but `CommentSection` will fetch the new ones.
            // If we don't clear them, `post.comments.length` remains valid.
            // But we should probably unset them eventually.
            // For now, let's just Create the Comment docs so they appear in the new view.
            console.log(`Migrated ${migratedCount} comments for post ${post._id}`);
        }

        console.log("Migration Complete.");
        process.exit(0);
    } catch (error) {
        console.error("Migration Failed:", error);
        process.exit(1);
    }
};

migrateComments();
