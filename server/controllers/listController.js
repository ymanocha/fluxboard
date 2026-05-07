const List = require('../models/List');
const Card = require('../models/Card');
const Board = require('../models/Board');

// POST /api/lists
const createList = async (req, res, next) => {
  try {
    const { title, boardId } = req.body;
    if (!title || !boardId) return res.status(400).json({ message: 'title and boardId are required' });

    const board = await Board.findById(boardId);
    if (!board) return res.status(404).json({ message: 'Board not found' });

    // position = number of existing lists
    const count = await List.countDocuments({ board: boardId });
    const list = await List.create({ title, board: boardId, position: count });
    return res.status(201).json(list);
  } catch (err) {
    next(err);
  }
};

// PUT /api/lists/:id
const updateList = async (req, res, next) => {
  try {
    const { title, position } = req.body;
    const list = await List.findById(req.params.id);
    if (!list) return res.status(404).json({ message: 'List not found' });

    if (title !== undefined) list.title = title;
    if (position !== undefined) list.position = position;
    await list.save();
    return res.status(200).json(list);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/lists/:id — cascades to cards
const deleteList = async (req, res, next) => {
  try {
    const list = await List.findById(req.params.id);
    if (!list) return res.status(404).json({ message: 'List not found' });

    await Card.deleteMany({ list: list._id });
    await List.findByIdAndDelete(list._id);

    // Recalculate positions of remaining lists in the board
    const remaining = await List.find({ board: list.board }).sort({ position: 1 });
    for (let i = 0; i < remaining.length; i++) {
      remaining[i].position = i;
      await remaining[i].save();
    }

    return res.status(200).json({ message: 'List deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { createList, updateList, deleteList };
