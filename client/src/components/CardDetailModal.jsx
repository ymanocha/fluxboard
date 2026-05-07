import { useState, useEffect } from 'react';
import { useBoard } from '../context/BoardContext';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';

const CardDetailModal = ({ card, onClose, boardId }) => {
  const { board, dispatch } = useBoard();
  const socket = useSocket();
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [assignee, setAssignee] = useState(card.assignee?._id || card.assignee || '');
  const [dueDate, setDueDate] = useState(card.dueDate ? new Date(card.dueDate).toISOString().slice(0, 10) : '');
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    if (!title.trim()) return;
    setSaving(true);

    const payload = {
      cardId: card._id,
      title: title.trim(),
      description,
      assignee: assignee || null,
      dueDate: dueDate || null,
    };

    if (socket) {
      socket.emit(
        'cardOperation',
        {
          type: 'CARD_UPDATE',
          boardId,
          payload,
          clientTimestamp: Date.now(),
        },
        (ack) => {
          setSaving(false);
          if (ack.success) {
            toast.success('Card updated');
            onClose();
          } else {
            toast.error(ack.reason || 'Failed to update card');
          }
        }
      );
    } else {
      setSaving(false);
      toast.error('Socket not connected');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content card-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <input
            className="modal-title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Card Title"
          />
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="modal-section">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a more detailed description..."
              rows={4}
            />
          </div>

          <div className="modal-row">
            <div className="modal-section">
              <label>Assignee</label>
              <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                <option value="">Unassigned</option>
                {board.members?.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name}
                  </option>
                ))}
                {/* Include owner in options if not in members */}
                {board.owner && (
                    <option value={board.owner._id || board.owner}>
                        {board.owner.name || 'Owner'} (Owner)
                    </option>
                )}
              </select>
            </div>

            <div className="modal-section">
              <label>Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner small" /> : 'Save Changes'}
          </button>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default CardDetailModal;
