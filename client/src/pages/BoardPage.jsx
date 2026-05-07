import { useEffect, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext } from '@hello-pangea/dnd';
import { useBoard } from '../context/BoardContext';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import Board from '../components/Board';
import PresenceBar from '../components/PresenceBar';
import ActivityFeed from '../components/ActivityFeed';
import InviteModal from '../components/InviteModal';
import NotificationBell from '../components/NotificationBell';

const BoardPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const socket = useSocket();
  const { board, lists, cards, dispatch, setBoardData, clearBoard } = useBoard();
  const [showInvite, setShowInvite] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [bgPickerTab, setBgPickerTab] = useState('gradient');

  const BG_OPTIONS = [
    { label: 'Ocean', value: 'linear-gradient(135deg, #1a78c2 0%, #0d4f8b 100%)', type: 'gradient' },
    { label: 'Sunset', value: 'linear-gradient(135deg, #f97316 0%, #ef4444 50%, #a21caf 100%)', type: 'gradient' },
    { label: 'Forest', value: 'linear-gradient(135deg, #16a34a 0%, #065f46 100%)', type: 'gradient' },
    { label: 'Purple', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', type: 'gradient' },
    { label: 'Midnight', value: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', type: 'gradient' },
    { label: 'Rose', value: 'linear-gradient(135deg, #f43f5e 0%, #ec4899 100%)', type: 'gradient' },
    { label: 'Teal', value: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)', type: 'gradient' },
    { label: 'Gold', value: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)', type: 'gradient' },
    { label: 'Beach', value: 'url("https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=90&auto=format&fit=crop")', type: 'image' },
    { label: 'Mountain', value: 'url("https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920&q=90&auto=format&fit=crop")', type: 'image' },
    { label: 'Forest', value: 'url("https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=90&auto=format&fit=crop")', type: 'image' },
    { label: 'Desert', value: 'url("https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1920&q=90&auto=format&fit=crop")', type: 'image' },
    { label: 'Aurora', value: 'url("https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1920&q=90&auto=format&fit=crop")', type: 'image' },
    { label: 'Lake', value: 'url("https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=1920&q=90&auto=format&fit=crop")', type: 'image' },
    { label: 'Galaxy', value: 'url("https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1920&q=90&auto=format&fit=crop")', type: 'image' },
    { label: 'Nebula', value: 'url("https://images.unsplash.com/photo-1543722530-d2c3201371e7?w=1920&q=90&auto=format&fit=crop")', type: 'image' },
    { label: 'Stars', value: 'url("https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1920&q=90&auto=format&fit=crop")', type: 'image' },
    { label: 'Moon', value: 'url("https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1920&q=90&auto=format&fit=crop")', type: 'image' },
    { label: 'Cosmos', value: 'url("https://images.unsplash.com/photo-1520034475321-cbe63696469a?w=1920&q=90&auto=format&fit=crop")', type: 'image' },
  ];

  // ── Load board data ────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchBoard = async () => {
      try {
        const { data } = await api.get(`/boards/${id}`);
        setBoardData(data.board, data.lists, data.cards);
        setTitleInput(data.board.title);

        // Fetch Activity Feed inside Load
        const activityRes = await api.get(`/activity/${id}`);
        dispatch({ type: 'SET_ACTIVITY_FEED', payload: activityRes.data });
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load board');
        navigate('/dashboard');
      }
    };
    fetchBoard();
    return () => clearBoard();
  }, [id]);

  // ── Join / leave socket room ────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !id) return;
    socket.emit('joinBoard', id);
    return () => {
      socket.emit('leaveBoard', id);
    };
  }, [socket, id]);

  const handleTitleSubmit = async () => {
    setEditingTitle(false);
    if (!titleInput.trim() || titleInput.trim() === board.title) {
      setTitleInput(board.title);
      return;
    }
    try {
      const { data } = await api.put(`/boards/${id}`, { title: titleInput.trim() });
      dispatch({ type: 'UPDATE_BOARD', payload: { title: data.title } });
    } catch (err) {
      toast.error('Failed to update board title');
      setTitleInput(board.title);
    }
  };

  const handleBgChange = async (newBg) => {
    try {
      await api.put(`/boards/${id}`, { color: newBg });
      dispatch({ type: 'UPDATE_BOARD', payload: { color: newBg } });
      toast.success('Background updated!');
    } catch (err) {
      toast.error('Failed to update background');
    }
  };

  // ── Drag and Drop Handler ──────────────────────────────────────────────────
  const onDragEnd = useCallback(
    (result) => {
      const { draggableId, source, destination } = result;

      if (!destination) return;
      if (
        source.droppableId === destination.droppableId &&
        source.index === destination.index
      )
        return;

      // Snapshot current cards for revert
      const snapshot = cards.map((c) => ({ ...c }));

      // Optimistic update
      dispatch({
        type: 'MOVE_CARD',
        payload: {
          cardId: draggableId,
          fromListId: source.droppableId,
          toListId: destination.droppableId,
          fromIndex: source.index,
          toIndex: destination.index,
        },
      });

      // Emit to server
      if (!socket) return;
      socket.emit(
        'cardOperation',
        {
          type: 'CARD_MOVE',
          boardId: id,
          payload: {
            cardId: draggableId,
            fromListId: source.droppableId,
            toListId: destination.droppableId,
            fromIndex: source.index,
            toIndex: destination.index,
          },
          clientTimestamp: Date.now(),
        },
        (ack) => {
          if (!ack.success) {
            // Revert
            dispatch({ type: 'REVERT_CARDS', payload: snapshot });
            toast.error(ack.reason || 'Move failed');
          } else if (ack.serverState) {
            // Reconcile with server truth
            dispatch({ type: 'UPDATE_CARD', payload: ack.serverState });
          }
        }
      );
    },
    [dispatch, socket, id, cards]
  );

  if (!board) {
    return (
      <div className="board-loading">
        <div className="spinner large" />
        <p>Loading board…</p>
      </div>
    );
  }

  const bgColor = board.color || board.background || 'var(--bg)';

  return (
    <div className="board-page" style={{ background: bgColor, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <header className="board-header">
        <div className="board-header-left">
          <button id="back-to-dashboard" className="btn-ghost" style={{ background: 'rgba(0,0,0,0.2)', border: 'none', color: '#fff' }} onClick={() => navigate('/dashboard')}>
            ← Boards
          </button>
          
          {editingTitle ? (
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
              autoFocus
              className="board-title-input"
              style={{ fontSize: '18px', fontWeight: 700, background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 8px' }}
            />
          ) : (
            <h1 
              className="board-title" 
              onClick={() => setEditingTitle(true)}
              style={{ cursor: 'pointer', color: '#fff', padding: '2px 8px', borderRadius: '4px' }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {board.title}
            </h1>
          )}
          
          <div className="board-members-count" style={{ marginLeft: '1rem', color: 'rgba(255,255,255,0.8)' }}>
            {board.members?.length || 0} Members
          </div>
        </div>

        <div className="board-header-right" style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', position: 'relative' }}>
          <NotificationBell />
          <PresenceBar />
          <button className="btn-ghost" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none' }} onClick={() => setShowBgPicker(!showBgPicker)}>
            🎨 Background
          </button>
          <button className="btn-ghost" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none' }} onClick={() => setShowInvite(true)}>
            Invite User
          </button>
          <button className="btn-ghost" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none' }} onClick={() => setShowActivity(!showActivity)}>
            {showActivity ? 'Hide Activity' : 'Activity'}
          </button>

          {/* Inline bg picker dropdown */}
          {showBgPicker && (
            <div className="board-bg-picker" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700 }}>Change Background</span>
                <button onClick={() => setShowBgPicker(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px' }}>✕</button>
              </div>
              <div className="bg-picker-tabs" style={{ marginBottom: '10px' }}>
                <button type="button" className={`bg-tab ${bgPickerTab === 'gradient' ? 'active' : ''}`} onClick={() => setBgPickerTab('gradient')}>Gradients</button>
                <button type="button" className={`bg-tab ${bgPickerTab === 'image' ? 'active' : ''}`} onClick={() => setBgPickerTab('image')}>Photos</button>
              </div>
              <div className="bg-swatch-row" style={{ flexWrap: 'wrap' }}>
                {BG_OPTIONS.filter(b => b.type === bgPickerTab).map(bg => (
                  <button
                    key={bg.value}
                    title={bg.label}
                    onClick={() => { handleBgChange(bg.value); setShowBgPicker(false); }}
                    style={{
                      background: bg.value,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      outline: (board.color === bg.value) ? '3px solid #fff' : 'none',
                      outlineOffset: '2px',
                    }}
                    className="bg-swatch"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </header>
      <div className="board-content" style={{ display: 'flex', background: 'transparent' }}>
        <DragDropContext onDragEnd={onDragEnd}>
          <div style={{ flex: 1, overflowX: 'auto' }}>
            <Board lists={lists} cards={cards} boardId={id} />
          </div>
        </DragDropContext>
        
        <ActivityFeed open={showActivity} onClose={() => setShowActivity(false)} />
        
        {showInvite && (
          <InviteModal boardId={id} onClose={() => setShowInvite(false)} />
        )}
      </div>
    </div>
  );
};

export default BoardPage;
