import { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import Card from './Card';
import AddCard from './AddCard';
import { useBoard } from '../context/BoardContext';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';

const List = ({ list, cards, boardId }) => {
  const socket = useSocket();
  const { dispatch } = useBoard();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(list.title);

  const handleTitleSave = () => {
    if (!title.trim() || title === list.title) {
      setTitle(list.title);
      setEditing(false);
      return;
    }
    setEditing(false);

    const optimistic = { ...list, title: title.trim() };
    dispatch({ type: 'UPDATE_LIST', payload: optimistic });

    if (!socket) return;
    socket.emit(
      'listOperation',
      { type: 'LIST_UPDATE', boardId, payload: { listId: list._id, title: title.trim() } },
      (ack) => {
        if (!ack.success) {
          dispatch({ type: 'UPDATE_LIST', payload: list }); // revert
          toast.error('Failed to rename list');
        }
      }
    );
  };

  const handleDelete = () => {
    if (!window.confirm(`Delete list "${list.title}" and all its cards?`)) return;
    dispatch({ type: 'DELETE_LIST', payload: list._id });

    if (!socket) return;
    socket.emit(
      'listOperation',
      { type: 'LIST_DELETE', boardId, payload: { listId: list._id } },
      (ack) => {
        if (!ack.success) toast.error('Failed to delete list');
      }
    );
  };

  return (
    <div className="list" id={`list-${list._id}`}>
      <div className="list-header">
        {editing ? (
          <input
            className="list-title-input"
            value={title}
            autoFocus
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTitleSave();
              if (e.key === 'Escape') { setTitle(list.title); setEditing(false); }
            }}
          />
        ) : (
          <h2
            className="list-title"
            onClick={() => setEditing(true)}
            title="Click to rename"
          >
            {list.title}
          </h2>
        )}
        <span className="list-count">{cards.length}</span>
        <button
          id={`delete-list-${list._id}`}
          className="list-delete-btn"
          onClick={handleDelete}
          title="Delete list"
        >
          ✕
        </button>
      </div>

      <Droppable droppableId={list._id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`list-cards ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
          >
            {cards.map((card, index) => (
              <Card key={card._id} card={card} index={index} boardId={boardId} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      <AddCard listId={list._id} boardId={boardId} />
    </div>
  );
};

export default List;
