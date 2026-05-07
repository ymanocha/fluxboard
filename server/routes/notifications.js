const express = require('express');
const { getNotifications, markRead, markAllRead } = require('../controllers/notificationController');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.put('/read-all', markAllRead);
router.get('/', getNotifications);
router.put('/:id/read', markRead);

module.exports = router;
