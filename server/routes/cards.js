const express = require('express');
const { createCard, updateCard, deleteCard } = require('../controllers/cardController');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.post('/', createCard);
router.put('/:id', updateCard);
router.delete('/:id', deleteCard);

module.exports = router;
