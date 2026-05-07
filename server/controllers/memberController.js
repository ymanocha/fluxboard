const Board = require('../models/Board');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Activity = require('../models/Activity');

// POST /api/members/:boardId/invite — now sends a pending invite, does NOT add directly
const inviteMember = async (req, res, next) => {
  try {
    const { email } = req.body;
    const { boardId } = req.params;

    if (!email) return res.status(400).json({ message: 'Email is required' });

    const board = await Board.findById(boardId);
    if (!board) return res.status(404).json({ message: 'Board not found' });

    if (board.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the board owner can invite members' });
    }

    const emails = email.split(',').map(e => e.toLowerCase().trim()).filter(e => e);
    const requester = await User.findById(req.user.id);
    const io = req.app.get('io');

    let invitedCount = 0;

    for (const singleEmail of emails) {
      const invitedUser = await User.findOne({ email: singleEmail });
      if (!invitedUser) continue;

      // Skip owner and already-member
      if (board.owner.toString() === invitedUser._id.toString()) continue;
      if (board.members.some(mId => mId.equals(invitedUser._id))) continue;

      // Check no pending invite already exists
      const existing = await Notification.findOne({
        user: invitedUser._id,
        board: board._id,
        type: 'BOARD_INVITE',
        status: 'pending',
      });
      if (existing) continue;

      // Create pending invite notification
      const notification = await Notification.create({
        user: invitedUser._id,
        board: board._id,
        type: 'BOARD_INVITE',
        status: 'pending',
        text: `${requester.name} invited you to "${board.title}"`,
        meta: { boardId: board._id, boardTitle: board.title, invitedBy: requester.name },
      });

      if (io) {
        io.to(`user:${invitedUser._id}`).emit('notification', notification);
      }

      invitedCount++;
    }

    return res.status(200).json({ message: `${invitedCount} invite(s) sent successfully` });
  } catch (err) {
    next(err);
  }
};

// POST /api/members/:boardId/accept — invited user accepts
const acceptInvite = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const { notificationId } = req.body;

    const board = await Board.findById(boardId);
    if (!board) return res.status(404).json({ message: 'Board not found' });

    const notification = await Notification.findOne({
      _id: notificationId,
      user: req.user.id,
      board: boardId,
      type: 'BOARD_INVITE',
      status: 'pending',
    });
    if (!notification) return res.status(404).json({ message: 'Invite not found or already resolved' });

    // Add user to board
    if (!board.members.some(m => m.toString() === req.user.id)) {
      board.members.push(req.user.id);
      await board.save();
    }

    notification.status = 'accepted';
    notification.read = true;
    await notification.save();

    const io = req.app.get('io');
    const requester = await User.findById(req.user.id);

    const activity = await Activity.create({
      board: board._id,
      user: req.user.id,
      type: 'MEMBER_INVITED',
      text: `${requester.name} joined the board`,
      meta: { invitedUserName: requester.name },
    });

    if (io) {
      const populatedBoard = await Board.findById(boardId).populate('members', 'name email');
      io.to(boardId).emit('memberInvited', { member: populatedBoard.members.at(-1) });
      io.to(boardId).emit('activityAdded', activity);
    }

    return res.status(200).json({ message: 'Invite accepted', notification });
  } catch (err) {
    next(err);
  }
};

// POST /api/members/:boardId/decline
const declineInvite = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const { notificationId } = req.body;

    const notification = await Notification.findOne({
      _id: notificationId,
      user: req.user.id,
      board: boardId,
      type: 'BOARD_INVITE',
      status: 'pending',
    });
    if (!notification) return res.status(404).json({ message: 'Invite not found or already resolved' });

    notification.status = 'declined';
    notification.read = true;
    await notification.save();

    return res.status(200).json({ message: 'Invite declined' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/members/:boardId/members/:userId
const removeMember = async (req, res, next) => {
  try {
    const { boardId, userId } = req.params;

    const board = await Board.findById(boardId);
    if (!board) return res.status(404).json({ message: 'Board not found' });

    if (board.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the board owner can remove members' });
    }

    if (board.owner.toString() === userId) {
      return res.status(400).json({ message: 'Cannot remove the owner from the board' });
    }

    const userToRemove = await User.findById(userId);
    if (!userToRemove) return res.status(404).json({ message: 'User not found' });

    board.members = board.members.filter(m => m.toString() !== userId);
    await board.save();

    const requester = await User.findById(req.user.id);

    const activity = await Activity.create({
      board: board._id,
      user: requester._id,
      type: 'MEMBER_REMOVED',
      text: `${requester.name} removed ${userToRemove.name} from the board`,
      meta: { removedUserName: userToRemove.name },
    });

    const io = req.app.get('io');
    if (io) {
      io.to(boardId).emit('memberRemoved', { userId });
      io.to(boardId).emit('activityAdded', activity);
    }

    const updatedBoard = await Board.findById(boardId).populate('members', 'name email');
    return res.status(200).json(updatedBoard.members);
  } catch (err) {
    next(err);
  }
};

// GET /api/members/:boardId/members
const getMembers = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const board = await Board.findById(boardId).populate('members', 'name email');
    if (!board) return res.status(404).json({ message: 'Board not found' });

    return res.status(200).json(board.members);
  } catch (err) {
    next(err);
  }
};

module.exports = { inviteMember, acceptInvite, declineInvite, removeMember, getMembers };
