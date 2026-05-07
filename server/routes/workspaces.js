const express = require('express');
const { getWorkspaces, createWorkspace, getWorkspace, updateWorkspace, deleteWorkspace, inviteToWorkspace, acceptWorkspaceInvite, declineWorkspaceInvite } = require('../controllers/workspaceController');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', getWorkspaces);
router.post('/', createWorkspace);
router.get('/:id', getWorkspace);
router.put('/:id', updateWorkspace);
router.delete('/:id', deleteWorkspace);
router.post('/:id/invite', inviteToWorkspace);
router.post('/:id/accept', acceptWorkspaceInvite);
router.post('/:id/decline', declineWorkspaceInvite);

module.exports = router;
