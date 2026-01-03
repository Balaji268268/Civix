const express = require('express');
const router = express.Router();
const { createPost, getUserPosts, getAllPosts, deletePost, toggleLike } = require('../controllers/postController');
const { verifyToken, verifyTokenOptional } = require('../middlewares/validate');

// Public Feed (Optional Auth for Like status)
router.get('/', verifyTokenOptional, getAllPosts);

// Protected Routes
router.post('/', verifyToken, createPost);
router.get('/user', verifyToken, getUserPosts);
router.delete('/:id', verifyToken, deletePost);
router.put('/:id/like', verifyToken, toggleLike);
router.post('/:id/comment', verifyToken, require('../controllers/postController').addComment);

module.exports = router;
