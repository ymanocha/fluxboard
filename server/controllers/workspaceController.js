const Workspace = require('../models/Workspace');
const Board = require('../models/Board');
const User = require('../models/User');
const Notification = require('../models/Notification');

// GET /api/workspaces
const getWorkspaces = async (req, res, next) => {
  try {
    const workspaces = await Workspace.find({
      $or: [{ owner: req.user.id }, { members: req.user.id }],
    }).sort({ createdAt: -1 });
    return res.status(200).json(workspaces);
  } catch (err) { next(err); }
};

// POST /api/workspaces
const createWorkspace = async (req, res, next) => {
  try {
    const { name, description, color } = req.body;
    if (!name) return res.status(400).json({ message: 'Workspace name is required' });
    const workspace = await Workspace.create({
      name, description, color: color || '#7C5CFC',
      owner: req.user.id, members: [req.user.id],
    });
    return res.status(201).json(workspace);
  } catch (err) { next(err); }
};

// GET /api/workspaces/:id
const getWorkspace = async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('members', 'name email');
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
    const isOwner = workspace.owner._id.toString() === req.user.id;
    const isMember = workspace.members.some(m => m._id.toString() === req.user.id);
    if (!isOwner && !isMember) return res.status(403).json({ message: 'Access denied' });

    const boards = await Board.find({
      $or: [{ owner: req.user.id }, { members: req.user.id }],
      workspace: workspace._id,
    }).sort({ createdAt: -1 });

    return res.status(200).json({ workspace, boards });
  } catch (err) { next(err); }
};

// PUT /api/workspaces/:id
const updateWorkspace = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
    if (workspace.owner.toString() !== req.user.id)
      return res.status(403).json({ message: 'Only owner can update workspace' });
    workspace.name = name || workspace.name;
    workspace.description = description ?? workspace.description;
    await workspace.save();
    return res.status(200).json(workspace);
  } catch (err) { next(err); }
};

// DELETE /api/workspaces/:id
const deleteWorkspace = async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
    if (workspace.owner.toString() !== req.user.id)
      return res.status(403).json({ message: 'Only owner can delete workspace' });
    await Workspace.findByIdAndDelete(workspace._id);
    return res.status(200).json({ message: 'Workspace deleted' });
  } catch (err) { next(err); }
};

// POST /api/workspaces/:id/invite
const inviteToWorkspace = async (req, res, next) => {
  try {
    const { email } = req.body;
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
    if (workspace.owner.toString() !== req.user.id)
      return res.status(403).json({ message: 'Only owner can invite to workspace' });

    const invitedUser = await User.findOne({ email: email?.toLowerCase().trim() });
    if (!invitedUser) return res.status(404).json({ message: 'User with that email not found' });
    if (workspace.members.some(m => m.toString() === invitedUser._id.toString()))
      return res.status(400).json({ message: 'User is already a member' });

    const existing = await Notification.findOne({
      user: invitedUser._id, workspace: workspace._id,
      type: 'WORKSPACE_INVITE', status: 'pending',
    });
    if (existing) return res.status(400).json({ message: 'Invite already sent' });

    const requester = await User.findById(req.user.id);
    const notification = await Notification.create({
      user: invitedUser._id,
      workspace: workspace._id,
      type: 'WORKSPACE_INVITE',
      status: 'pending',
      text: `${requester.name} invited you to workspace "${workspace.name}"`,
      meta: { workspaceId: workspace._id, workspaceName: workspace.name, invitedBy: requester.name },
    });

    const io = req.app.get('io');
    if (io) io.to(`user:${invitedUser._id}`).emit('notification', notification);

    return res.status(200).json({ message: 'Workspace invite sent' });
  } catch (err) { next(err); }
};

// POST /api/workspaces/:id/accept
const acceptWorkspaceInvite = async (req, res, next) => {
  try {
    const { notificationId } = req.body;
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    const notification = await Notification.findOne({
      _id: notificationId, user: req.user.id,
      workspace: workspace._id, type: 'WORKSPACE_INVITE', status: 'pending',
    });
    if (!notification) return res.status(404).json({ message: 'Invite not found or resolved' });

    if (!workspace.members.some(m => m.toString() === req.user.id)) {
      workspace.members.push(req.user.id);
      await workspace.save();
    }
    notification.status = 'accepted';
    notification.read = true;
    await notification.save();

    return res.status(200).json({ message: 'Workspace invite accepted', notification });
  } catch (err) { next(err); }
};

// POST /api/workspaces/:id/decline
const declineWorkspaceInvite = async (req, res, next) => {
  try {
    const { notificationId } = req.body;
    const notification = await Notification.findOne({
      _id: notificationId, user: req.user.id,
      workspace: req.params.id, type: 'WORKSPACE_INVITE', status: 'pending',
    });
    if (!notification) return res.status(404).json({ message: 'Invite not found or resolved' });
    notification.status = 'declined';
    notification.read = true;
    await notification.save();
    return res.status(200).json({ message: 'Workspace invite declined' });
  } catch (err) { next(err); }
};

module.exports = { getWorkspaces, createWorkspace, getWorkspace, updateWorkspace, deleteWorkspace, inviteToWorkspace, acceptWorkspaceInvite, declineWorkspaceInvite };
