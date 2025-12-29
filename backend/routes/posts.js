const express = require('express');
const router = express.Router();
const { createPost, getUserPosts, getAllPosts, deletePost, toggleLike } = require('../controllers/postController');
const { verifyToken } = require('../middlewares/validate'); // Assuming safe to use

// Protect all routes
router.use(verifyToken);

router.post('/', createPost);
router.get('/', getAllPosts); // Feed
router.get('/user', getUserPosts); // My Posts or specific User posts via query
router.delete('/:id', deletePost);
router.put('/:id/like', toggleLike);

module.exports = router;
