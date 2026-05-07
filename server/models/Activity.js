const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'CARD_CREATE', 'CARD_MOVE', 'CARD_UPDATE', 'CARD_DELETE',
        'LIST_CREATE', 'LIST_UPDATE', 'LIST_DELETE',
        'MEMBER_INVITED', 'MEMBER_REMOVED',
        'CARD_ASSIGNED', 'CARD_DUE_SET'
      ],
      required: true
    },
    text: { type: String, required: true },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Activity', activitySchema);
