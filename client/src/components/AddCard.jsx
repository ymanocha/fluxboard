import { useState } from 'react';
import { useBoard } from '../context/BoardContext';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const AddCard = ({ listId, boardId }) => {
  const socket = useSocket();
  const { user } = useAuth();
  const { dispatch } = useBoard();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!title.trim()) return;
    setAdding(true);

    if (!socket) { 
      setAdding(false); 
      toast.error('Socket not connected');
      return; 
    }
    
    try {
      socket.emit(
        'cardOperation',
        {
          type: 'CARD_CREATE',
          boardId,
          payload: { title: title.trim(), listId, boardId },
          clientTimestamp: Date.now(),
        },
        (ack) => {
          try {
            setAdding(false);
            if (ack && ack.success && ack.serverState) {
              dispatch({ type: 'ADD_CARD', payload: ack.serverState });
              setTitle('');
              setOpen(false);
            } else {
              toast.error((ack && ack.reason) ? ack.reason : 'Failed to create card');
            }
          } catch (e) {
            console.error('Error in AddCard ack callback:', e);
            setAdding(false);
          }
        }
      );
    } catch (err) {
      console.error('Error emitting cardOperation:', err);
      setAdding(false);
      toast.error('Network error while creating card');
    }
  };

  if (!open) {
    return (
      <button
        id={`add-card-btn-${listId}`}
        className="add-card-btn"
        onClick={() => setOpen(true)}
      >
        + Add a card
      </button>
    );
  }

  return (
    <div className="add-card-form">
      <textarea
        id={`add-card-input-${listId}`}
        autoFocus
        rows={3}
        placeholder="Enter card title…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd(); }
          if (e.key === 'Escape') setOpen(false);
        }}
      />
      <div className="add-card-actions">
        <button
          id={`add-card-confirm-${listId}`}
          className="btn-primary small"
          onClick={handleAdd}
          disabled={adding}
        >
          {adding ? <span className="spinner small" /> : 'Add Card'}
        </button>
        <button className="btn-ghost small" onClick={() => { setOpen(false); setTitle(''); }}>
          Cancel
        </button>
      </div>
    </div>
  );
};

export default AddCard;
