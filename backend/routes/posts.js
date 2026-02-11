const express = require('express');
const router = express.Router();
const { createPost, getUserPosts, getAllPosts, deletePost, upvotePost, downvotePost } = require('../controllers/postController');
const { verifyToken, verifyTokenOptional } = require('../middlewares/validate');

// Public Feed (Optional Auth for Like status)
router.get('/', verifyTokenOptional, getAllPosts);

// Protected Routes
router.post('/', verifyToken, createPost);
router.get('/user', verifyToken, getUserPosts);
router.delete('/:id', verifyToken, deletePost);
router.post('/:id/upvote', verifyToken, upvotePost);
router.post('/:id/downvote', verifyToken, downvotePost);
const commentController = require('../controllers/commentController');

router.post('/:id/comments', verifyToken, commentController.addComment);
router.get('/:id/comments', verifyTokenOptional, commentController.getComments);
router.put('/comments/:id/like', verifyToken, commentController.toggleLike);

module.exports = router;
