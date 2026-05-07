const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { searchUsers, getMe } = require('../controllers/userController');

router.get('/search', auth, searchUsers);
router.get('/me', auth, getMe);

module.exports = router;
