const Board = require('../models/Board');
const List = require('../models/List');
const Card = require('../models/Card');

// GET /api/boards — all boards for authenticated user
const getBoards = async (req, res, next) => {
  try {
    const boards = await Board.find({
      $or: [{ owner: req.user.id }, { members: req.user.id }],
    }).sort({ createdAt: -1 });
    return res.status(200).json(boards);
  } catch (err) {
    next(err);
  }
};

// POST /api/boards — create a board
const createBoard = async (req, res, next) => {
  try {
    const { title, color, workspaceId } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });

    const board = await Board.create({ 
      title, 
      owner: req.user.id, 
      members: [req.user.id],
      ...(color && { color }),
      ...(workspaceId && { workspace: workspaceId }),
    });
    
    return res.status(201).json(board);
  } catch (err) {
    next(err);
  }
};

// GET /api/boards/:id — board with lists and cards
const getBoard = async (req, res, next) => {
  try {
    const board = await Board.findById(req.params.id).populate('owner', 'name email').populate('members', 'name email');
    if (!board) return res.status(404).json({ message: 'Board not found' });

    // Check access
    const isOwner = board.owner._id.toString() === req.user.id;
    const isMember = board.members.some((m) => m._id.toString() === req.user.id);
    if (!isOwner && !isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const lists = await List.find({ board: board._id }).sort({ position: 1 });
    const cards = await Card.find({ board: board._id }).sort({ position: 1 }).populate('assignee', 'name email');

    return res.status(200).json({ board, lists, cards });
  } catch (err) {
    next(err);
  }
};

// PUT /api/boards/:id — update board title
const updateBoard = async (req, res, next) => {
  try {
    const { title, color } = req.body;
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ message: 'Board not found' });
    if (board.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the owner can update the board' });
    }

    if (title) board.title = title;
    if (color) board.color = color;
    await board.save();
    return res.status(200).json(board);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/boards/:id — delete board + cascade lists + cards
const deleteBoard = async (req, res, next) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ message: 'Board not found' });
    if (board.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the owner can delete the board' });
    }

    await Card.deleteMany({ board: board._id });
    await List.deleteMany({ board: board._id });
    await Board.findByIdAndDelete(board._id);

    return res.status(200).json({ message: 'Board deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getBoards, createBoard, getBoard, updateBoard, deleteBoard };
