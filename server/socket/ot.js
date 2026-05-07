/**
 * Operational Transformation Module
 *
 * Resolves concurrent conflicts for card operations on the same board.
 * boardHistory: Map<boardId, Array<{ op, serverTimestamp }>>
 */

const MAX_HISTORY = 50;

// In-memory history per board
const boardHistory = new Map();

/**
 * Retrieve (or initialise) history array for a board.
 */
const getHistory = (boardId) => {
  if (!boardHistory.has(boardId)) {
    boardHistory.set(boardId, []);
  }
  return boardHistory.get(boardId);
};

/**
 * Find concurrent operations in history that conflict with the incoming op.
 * A conflict exists if:
 *  - the history op's serverTimestamp > incomingOp.clientTimestamp  (i.e. it happened after the client sent)
 *  - AND it affected the same card OR the same list positions we care about
 */
const getConcurrentOps = (incomingOp, history) =>
  history.filter((entry) => entry.serverTimestamp > incomingOp.clientTimestamp);

/**
 * Transform an incoming operation against all known concurrent history ops.
 *
 * @param {object} incomingOp
 * @param {Array}  history  — array of { op, serverTimestamp } already applied
 * @returns {{ transformed: object|null, rejected: boolean, reason?: string }}
 */
const transformOperation = (incomingOp, history = []) => {
  const concurrent = getConcurrentOps(incomingOp, history);
  if (concurrent.length === 0) {
    return { transformed: incomingOp, rejected: false };
  }

  let op = { ...incomingOp, payload: { ...incomingOp.payload } };

  for (const entry of concurrent) {
    const prevOp = entry.op;

    // ── CARD_DELETE vs CARD_UPDATE or CARD_MOVE (same card) ─────────────────
    if (
      prevOp.type === 'CARD_DELETE' &&
      (op.type === 'CARD_UPDATE' || op.type === 'CARD_MOVE') &&
      prevOp.payload.cardId === op.payload.cardId
    ) {
      return {
        transformed: null,
        rejected: true,
        reason: 'This card was deleted by another user.',
      };
    }

    // ── CARD_MOVE vs CARD_MOVE (same card) ──────────────────────────────────
    if (
      prevOp.type === 'CARD_MOVE' &&
      op.type === 'CARD_MOVE' &&
      prevOp.payload.cardId === op.payload.cardId
    ) {
      // The first op already moved the card; update our from-position
      op.payload.fromListId = prevOp.payload.toListId;
      op.payload.fromIndex = prevOp.payload.toIndex;
      continue;
    }

    // ── CARD_MOVE vs CARD_MOVE (different cards, same destination list) ──────
    if (
      prevOp.type === 'CARD_MOVE' &&
      op.type === 'CARD_MOVE' &&
      prevOp.payload.cardId !== op.payload.cardId &&
      prevOp.payload.toListId === op.payload.toListId &&
      prevOp.payload.toIndex <= op.payload.toIndex
    ) {
      // Op A inserted a card at or before where op B wants to insert — shift +1
      op.payload.toIndex += 1;
      continue;
    }
  }

  return { transformed: op, rejected: false };
};

/**
 * Apply the transformed operation to MongoDB.
 * Returns the updated document(s).
 */
const applyOperation = async (op) => {
  const Card = require('../models/Card');

  switch (op.type) {
    case 'CARD_CREATE': {
      const { title, description, listId, boardId } = op.payload;
      const count = await Card.countDocuments({ list: listId });
      const card = await Card.create({
        title,
        description: description || '',
        list: listId,
        board: boardId,
        position: count,
      });
      return card;
    }

    case 'CARD_MOVE': {
      const { cardId, fromListId, toListId, fromIndex, toIndex } = op.payload;
      const card = await Card.findById(cardId);
      if (!card) return null;

      // Remove from source list — shift cards below up
      await Card.updateMany(
        { list: fromListId, position: { $gt: fromIndex } },
        { $inc: { position: -1 } }
      );

      // Make room in destination list
      await Card.updateMany(
        { list: toListId, position: { $gte: toIndex } },
        { $inc: { position: 1 } }
      );

      card.list = toListId;
      card.position = toIndex;
      await card.save();
      return card;
    }

    case 'CARD_UPDATE': {
      const { cardId, title, description, assignee, dueDate, isCompleted } = op.payload;
      const update = {};
      if (title !== undefined) update.title = title;
      if (description !== undefined) update.description = description;
      if (assignee !== undefined) update.assignee = assignee;
      if (dueDate !== undefined) update.dueDate = dueDate;
      if (isCompleted !== undefined) update.isCompleted = isCompleted;
      const card = await Card.findByIdAndUpdate(cardId, update, { new: true });
      return card;
    }

    case 'CARD_DELETE': {
      const { cardId } = op.payload;
      const card = await Card.findById(cardId);
      if (!card) return null;
      const listId = card.list;
      const position = card.position;
      await Card.findByIdAndDelete(cardId);
      // Recalculate positions
      await Card.updateMany(
        { list: listId, position: { $gt: position } },
        { $inc: { position: -1 } }
      );
      return { cardId };
    }

    default:
      return null;
  }
};

/**
 * Add an operation to the board history, capped at MAX_HISTORY entries.
 */
const addToHistory = (boardId, op, serverTimestamp) => {
  const history = getHistory(boardId);
  history.push({ op, serverTimestamp });
  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }
};

/**
 * Clear history for a board (called when the last user leaves).
 */
const clearHistory = (boardId) => {
  boardHistory.delete(boardId);
};

module.exports = {
  transformOperation,
  applyOperation,
  addToHistory,
  clearHistory,
  getHistory,
  boardHistory,
};
