const express = require('express');
const { createList, updateList, deleteList } = require('../controllers/listController');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.post('/', createList);
router.put('/:id', updateList);
router.delete('/:id', deleteList);

module.exports = router;
