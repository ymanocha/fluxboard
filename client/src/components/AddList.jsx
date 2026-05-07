import { useState } from 'react';
import { useBoard } from '../context/BoardContext';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';

const AddList = ({ boardId }) => {
  const socket = useSocket();
  const { dispatch } = useBoard();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = () => {
    if (!title.trim()) return;
    setAdding(true);

    if (!socket) { setAdding(false); return; }
    socket.emit(
      'listOperation',
      { type: 'LIST_CREATE', boardId, payload: { title: title.trim() } },
      (ack) => {
        setAdding(false);
        if (ack.success && ack.result) {
          dispatch({ type: 'ADD_LIST', payload: ack.result });
          setTitle('');
          setOpen(false);
        } else {
          toast.error(ack.reason || 'Failed to create list');
        }
      }
    );
  };

  if (!open) {
    return (
      <button
        id="add-list-btn"
        className="add-list-btn"
        onClick={() => setOpen(true)}
      >
        + Add a list
      </button>
    );
  }

  return (
    <div className="add-list-form">
      <input
        id="add-list-input"
        autoFocus
        type="text"
        placeholder="List title…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleAdd();
          if (e.key === 'Escape') setOpen(false);
        }}
      />
      <div className="add-list-actions">
        <button id="add-list-confirm" className="btn-primary small" onClick={handleAdd} disabled={adding}>
          {adding ? <span className="spinner small" /> : 'Add List'}
        </button>
        <button className="btn-ghost small" onClick={() => { setOpen(false); setTitle(''); }}>
          Cancel
        </button>
      </div>
    </div>
  );
};

export default AddList;
