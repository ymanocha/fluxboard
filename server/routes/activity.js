const express = require('express');
const { getActivity } = require('../controllers/activityController');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/:boardId', getActivity);

module.exports = router;
