const Activity = require('../models/Activity');

// GET /api/activity/:boardId
const getActivity = async (req, res, next) => {
  try {
    const { boardId } = req.params;

    const activities = await Activity.find({ board: boardId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('user', 'name email');

    return res.status(200).json(activities);
  } catch (err) {
    next(err);
  }
};

module.exports = { getActivity };
