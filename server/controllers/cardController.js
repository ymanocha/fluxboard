const Card = require('../models/Card');
const List = require('../models/List');

// POST /api/cards
const createCard = async (req, res, next) => {
  try {
    const { title, listId, boardId, description } = req.body;
    if (!title || !listId || !boardId) {
      return res.status(400).json({ message: 'title, listId and boardId are required' });
    }

    const list = await List.findById(listId);
    if (!list) return res.status(404).json({ message: 'List not found' });

    const count = await Card.countDocuments({ list: listId });
    const card = await Card.create({
      title,
      description: description || '',
      list: listId,
      board: boardId,
      position: count,
    });
    return res.status(201).json(card);
  } catch (err) {
    next(err);
  }
};

// PUT /api/cards/:id
const updateCard = async (req, res, next) => {
  try {
    const { title, description, listId, position, assignee } = req.body;
    const card = await Card.findById(req.params.id);
    if (!card) return res.status(404).json({ message: 'Card not found' });

    if (title !== undefined) card.title = title;
    if (description !== undefined) card.description = description;
    if (listId !== undefined) card.list = listId;
    if (position !== undefined) card.position = position;
    if (assignee !== undefined) card.assignee = assignee;

    await card.save();
    return res.status(200).json(card);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/cards/:id
const deleteCard = async (req, res, next) => {
  try {
    const card = await Card.findById(req.params.id);
    if (!card) return res.status(404).json({ message: 'Card not found' });

    const listId = card.list;
    await Card.findByIdAndDelete(card._id);

    // Recalculate positions for remaining cards in the same list
    const remaining = await Card.find({ list: listId }).sort({ position: 1 });
    for (let i = 0; i < remaining.length; i++) {
      remaining[i].position = i;
      await remaining[i].save();
    }

    return res.status(200).json({ message: 'Card deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { createCard, updateCard, deleteCard };
