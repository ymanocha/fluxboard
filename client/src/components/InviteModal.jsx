import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useBoard } from '../context/BoardContext';

const InviteModal = ({ boardId, onClose }) => {
  const [emailInput, setEmailInput] = useState('');
  const [inviting, setInviting] = useState(false);
  const { board } = useBoard();

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setInviting(true);
    try {
      await api.post(`/members/${boardId}/invite`, { email: emailInput.trim() });
      toast.success('User invited to board!');
      setEmailInput('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to invite user');
    } finally {
      setInviting(false);
    }
  };

  const isMember = (userId) => {
    return board?.members?.some(m => m._id === userId || m === userId);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Invite to Board</h2>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleInvite} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <input
              type="email"
              placeholder="Enter user email address..."
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              style={{ flex: 1 }}
              autoFocus
              required
            />
            <button type="submit" className="btn-primary" disabled={inviting}>
              {inviting ? <span className="spinner small" /> : 'Invite'}
            </button>
          </form>

          <div style={{ marginTop: '16px' }}>
            <h3 style={{ fontSize: '14px', marginBottom: '10px', color: 'var(--text-muted)' }}>Current Members</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
              {board?.members?.map(m => (
                <div key={m._id || m} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="avatar" style={{ background: 'var(--accent)', cursor: 'default' }}>
                    {m.name ? m.name[0].toUpperCase() : '?'}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px' }}>{m.name}</div>
                  </div>
                  {(m._id === (board.owner?._id || board.owner)) && (
                    <span style={{ marginLeft: 'auto', fontSize: '12px', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>Owner</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteModal;
