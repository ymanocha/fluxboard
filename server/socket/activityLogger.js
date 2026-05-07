const Activity = require('../models/Activity');
const List = require('../models/List');
const Card = require('../models/Card');
const Board = require('../models/Board');
const User = require('../models/User');

const buildActivityText = async (op, userName) => {
  const { type, payload } = op;

  switch (type) {
    case 'CARD_CREATE': {
      const list = await List.findById(payload.listId);
      return `${userName} created ${payload.title} in ${list ? list.title : 'list'}`;
    }
    case 'CARD_MOVE': {
      const card = await Card.findById(payload.cardId);
      const fromList = await List.findById(payload.fromListId);
      const toList = await List.findById(payload.toListId);
      return `${userName} moved ${card ? card.title : 'card'} from ${fromList ? fromList.title : 'list'} to ${toList ? toList.title : 'list'}`;
    }
    case 'CARD_UPDATE': {
      const card = await Card.findById(payload.cardId);
      if (payload.title !== undefined) {
        return `${userName} renamed a card to ${payload.title}`;
      } else if (payload.assignee !== undefined) {
        if (!payload.assignee) return `${userName} unassigned ${card ? card.title : 'a card'}`;
        const assigneeUser = await User.findById(payload.assignee);
        return `${userName} assigned ${card ? card.title : 'a card'} to ${assigneeUser ? assigneeUser.name : 'user'}`;
      } else if (payload.dueDate !== undefined) {
        return `${userName} set due date on ${card ? card.title : 'a card'}`;
      }
      return `${userName} updated ${card ? card.title : 'a card'}`;
    }
    case 'CARD_DELETE': {
      // payload only has cardId, might need cardTitle beforehand.
      // If we fetch it after delete, it won't exist. So we pass card object or fetch it earlier.
      // We will pass `contextData` from the route if needed. 
      // Luckily, we can use payload.cardId to find it IF it's called BEFORE delete!
      // Here we assume card is passed if it's already deleted. By default we just try.
      if (payload.cardTitle) {
        return `${userName} deleted ${payload.cardTitle}`;
      }
      return `${userName} deleted a card`;
    }
    case 'LIST_CREATE': {
      return `${userName} created list ${payload.title}`;
    }
    case 'LIST_UPDATE': {
      return `${userName} renamed a list to ${payload.title}`;
    }
    case 'LIST_DELETE': {
      if (payload.listTitle) {
        return `${userName} deleted list ${payload.listTitle}`;
      }
      return `${userName} deleted a list`;
    }
    default:
      return `${userName} performed an action`;
  }
};

const createAndEmitActivity = async (io, boardId, userId, userName, op) => {
  try {
    const text = await buildActivityText(op, userName);
    const activity = await Activity.create({
      board: boardId,
      user: userId,
      type: op.type,
      text,
      meta: op.payload
    });

    const populatedActivity = await Activity.findById(activity._id).populate('user', 'name email');
    io.to(boardId).emit('activityAdded', populatedActivity);
  } catch (err) {
    console.error('Failed to create/emit activity:', err);
  }
};

module.exports = { createAndEmitActivity, buildActivityText };
