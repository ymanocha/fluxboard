import { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { useBoard } from '../context/BoardContext';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';
import CardDetailModal from './CardDetailModal';

const Card = ({ card, index, boardId }) => {
  const socket = useSocket();
  const { cards, dispatch, editingUsers } = useBoard();
  const [showDetail, setShowDetail] = useState(false);

  const startEditing = () => {
    setShowDetail(true);
    if (socket) socket.emit('cardEditStart', { boardId, cardId: card._id });
  };

  const stopEditing = () => {
    setShowDetail(false);
    if (socket) socket.emit('cardEditEnd', { boardId, cardId: card._id });
  };

  const handleDelete = () => {
    const snapshot = cards.map((c) => ({ ...c }));
    dispatch({ type: 'DELETE_CARD', payload: card._id });

    if (!socket) return;
    socket.emit(
      'cardOperation',
      {
        type: 'CARD_DELETE',
        boardId,
        payload: { cardId: card._id },
        clientTimestamp: Date.now(),
      },
      (ack) => {
        if (!ack.success) {
          dispatch({ type: 'REVERT_CARDS', payload: snapshot });
          toast.error(ack.reason || 'Failed to delete card');
        }
      }
    );
  };

  const handleToggleComplete = (e) => {
    e.stopPropagation();
    const newStatus = !card.isCompleted;
    const snapshot = cards.map((c) => ({ ...c }));
    dispatch({ type: 'UPDATE_CARD', payload: { ...card, isCompleted: newStatus } });

    if (!socket) return;
    socket.emit(
      'cardOperation',
      {
        type: 'CARD_UPDATE',
        boardId,
        payload: { cardId: card._id, isCompleted: newStatus },
        clientTimestamp: Date.now(),
      },
      (ack) => {
        if (!ack.success) {
          dispatch({ type: 'REVERT_CARDS', payload: snapshot });
          toast.error(ack.reason || 'Failed to update card status');
        }
      }
    );
  };

  const currentEditingUsers = editingUsers[card._id] || [];

  return (
    <Draggable draggableId={card._id} index={index}>
      {(provided, snapshot) => {
        const isBeingEditedByOthers = currentEditingUsers.length > 0;
        return (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          id={`card-${card._id}`}
          className={`card ${snapshot.isDragging ? 'dragging' : ''} ${isBeingEditedByOthers ? 'is-editing-by-other' : ''}`}
          onClick={startEditing}
        >
          {isBeingEditedByOthers && (
            <div className="card-editing-indicator-badge" style={{ marginBottom: '8px' }}>
              <span className="spinner small" style={{ marginRight: '4px', borderColor: 'rgba(255,255,255,0.4)', borderTopColor: '#fff' }}></span>
              {currentEditingUsers.map(u => u.userName).join(', ')}
            </div>
          )}

          <div className="card-content-wrapper">
            <div 
              className={`card-checkmark ${card.isCompleted ? 'completed' : ''}`}
              onClick={handleToggleComplete}
              title={card.isCompleted ? 'Mark as incomplete' : 'Mark as completed'}
            >
              {card.isCompleted && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              )}
            </div>

            <div className="card-main-content">
              <p className="card-title" style={{ textDecoration: card.isCompleted ? 'line-through' : 'none', color: card.isCompleted ? 'var(--text-faint)' : 'inherit' }}>
                {card.title}
              </p>
              
              {card.description && (
                <p className="card-desc">{card.description}</p>
              )}
              
              <div className="card-meta-row">
                {card.dueDate && (
                  <div className="card-badge due-date">
                    📅 {new Date(card.dueDate).toLocaleDateString()}
                  </div>
                )}
                
                {card.assignee && (
                  <div className="card-assignee-tag">
                    <span className="assignee-avatar">{card.assignee.name ? card.assignee.name[0].toUpperCase() : '?'}</span>
                    <span className="assignee-name">{card.assignee.name}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="card-actions-hover">
              <button
                id={`delete-card-${card._id}`}
                className="card-action-btn hover-danger"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                title="Delete"
              >
                ✕
              </button>
            </div>
          </div>

          {showDetail && (
            <CardDetailModal 
              card={card} 
              boardId={boardId} 
              onClose={stopEditing} 
            />
          )}
        </div>
        );
      }}
    </Draggable>
  );
};

export default Card;
