const express = require('express');
const { inviteMember, acceptInvite, declineInvite, removeMember, getMembers } = require('../controllers/memberController');
const auth = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
router.use(auth);

router.post('/:boardId/invite', inviteMember);
router.post('/:boardId/accept', acceptInvite);
router.post('/:boardId/decline', declineInvite);
router.delete('/:boardId/members/:userId', removeMember);
router.get('/:boardId/members', getMembers);

module.exports = router;
