const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', default: null },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', default: null },
    type: {
      type: String,
      enum: ['BOARD_INVITE', 'WORKSPACE_INVITE', 'CARD_ASSIGNED', 'CARD_DUE_SOON'],
      required: true
    },
    text: { type: String, required: true },
    read: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'accepted', 'declined', 'none'], default: 'none' },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
