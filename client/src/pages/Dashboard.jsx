import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import NotificationBell from '../components/NotificationBell';

// ── Verified, high-quality Unsplash IDs ─────────────────────────────────────
const BACKGROUNDS = [
  // Gradients
  { label: 'Ocean',    value: 'linear-gradient(135deg,#1a78c2,#0d4f8b)',             type: 'gradient', preview: 'linear-gradient(135deg,#1a78c2,#0d4f8b)' },
  { label: 'Sunset',   value: 'linear-gradient(135deg,#f97316,#ef4444,#a21caf)',      type: 'gradient', preview: 'linear-gradient(135deg,#f97316,#ef4444,#a21caf)' },
  { label: 'Forest',   value: 'linear-gradient(135deg,#16a34a,#065f46)',             type: 'gradient', preview: 'linear-gradient(135deg,#16a34a,#065f46)' },
  { label: 'Purple',   value: 'linear-gradient(135deg,#667eea,#764ba2)',             type: 'gradient', preview: 'linear-gradient(135deg,#667eea,#764ba2)' },
  { label: 'Midnight', value: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)',     type: 'gradient', preview: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)' },
  { label: 'Rose',     value: 'linear-gradient(135deg,#f43f5e,#ec4899)',             type: 'gradient', preview: 'linear-gradient(135deg,#f43f5e,#ec4899)' },
  { label: 'Teal',     value: 'linear-gradient(135deg,#0891b2,#0e7490)',             type: 'gradient', preview: 'linear-gradient(135deg,#0891b2,#0e7490)' },
  { label: 'Gold',     value: 'linear-gradient(135deg,#f59e0b,#b45309)',             type: 'gradient', preview: 'linear-gradient(135deg,#f59e0b,#b45309)' },
  // Nature — verified Unsplash photo IDs
  { label: 'Beach',    value: 'url(https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=90&auto=format&fit=crop)', type: 'image', preview: 'url(https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80&auto=format&fit=crop)' },
  { label: 'Mountain', value: 'url(https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1920&q=90&auto=format&fit=crop)', type: 'image', preview: 'url(https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&q=80&auto=format&fit=crop)' },
  { label: 'Forest',   value: 'url(https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=90&auto=format&fit=crop)', type: 'image', preview: 'url(https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&q=80&auto=format&fit=crop)' },
  { label: 'Desert',   value: 'url(https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1920&q=90&auto=format&fit=crop)', type: 'image', preview: 'url(https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=400&q=80&auto=format&fit=crop)' },
  { label: 'Aurora',   value: 'url(https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1920&q=90&auto=format&fit=crop)', type: 'image', preview: 'url(https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=400&q=80&auto=format&fit=crop)' },
  { label: 'Lake',     value: 'url(https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=1920&q=90&auto=format&fit=crop)', type: 'image', preview: 'url(https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=400&q=80&auto=format&fit=crop)' },
  // Space — verified Unsplash photo IDs
  { label: 'Galaxy',   value: 'url(https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1920&q=90&auto=format&fit=crop)', type: 'image', preview: 'url(https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=400&q=80&auto=format&fit=crop)' },
  { label: 'Nebula',   value: 'url(https://images.unsplash.com/photo-1543722530-d2c3201371e7?w=1920&q=90&auto=format&fit=crop)', type: 'image', preview: 'url(https://images.unsplash.com/photo-1543722530-d2c3201371e7?w=400&q=80&auto=format&fit=crop)' },
  { label: 'Stars',    value: 'url(https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1920&q=90&auto=format&fit=crop)', type: 'image', preview: 'url(https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400&q=80&auto=format&fit=crop)' },
  { label: 'Moon',     value: 'url(https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1920&q=90&auto=format&fit=crop)', type: 'image', preview: 'url(https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400&q=80&auto=format&fit=crop)' },
  { label: 'Cosmos',   value: 'url(https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=1920&q=90&auto=format&fit=crop)', type: 'image', preview: 'url(https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=400&q=80&auto=format&fit=crop)' },
];

const WORKSPACE_COLORS = ['#7C5CFC', '#0ea5e9', '#10b981', '#f97316', '#ef4444', '#ec4899'];

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [selectedBg, setSelectedBg] = useState(BACKGROUNDS[0]);
  const [creating, setCreating] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [bgTab, setBgTab] = useState('gradient');

  const [workspaces, setWorkspaces] = useState([]);
  const [wsLoading, setWsLoading] = useState(true);
  const [showNewWorkspace, setShowNewWorkspace] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsColor, setNewWsColor] = useState(WORKSPACE_COLORS[0]);
  const [creatingWs, setCreatingWs] = useState(false);
  const [activeView, setActiveView] = useState('all');

  // Workspace invite panel
  const [wsInviteTarget, setWsInviteTarget] = useState(null); // workspace object
  const [wsInviteEmail, setWsInviteEmail] = useState('');
  const [wsInviting, setWsInviting] = useState(false);

  useEffect(() => {
    const fetchBoards = async () => {
      try {
        const { data } = await api.get('/boards');
        setBoards(data);
      } catch (err) { toast.error('Failed to load boards'); }
      finally { setLoading(false); }
    };
    const fetchWorkspaces = async () => {
      try {
        const { data } = await api.get('/workspaces');
        setWorkspaces(data);
      } catch (err) { console.error(err); }
      finally { setWsLoading(false); }
    };
    fetchBoards();
    fetchWorkspaces();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const payload = { title: newTitle.trim(), color: selectedBg.value, ...(selectedWorkspace && { workspaceId: selectedWorkspace }) };
      const { data } = await api.post('/boards', payload);
      setBoards(prev => [data, ...prev]);
      setNewTitle('');
      toast.success('Board created!');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create board'); }
    finally { setCreating(false); }
  };

  const handleDelete = async (boardId) => {
    if (!window.confirm('Delete this board and all its data?')) return;
    try {
      await api.delete(`/boards/${boardId}`);
      setBoards(prev => prev.filter(b => b._id !== boardId));
      toast.success('Board deleted');
    } catch (err) { toast.error('Failed to delete board'); }
  };

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    setCreatingWs(true);
    try {
      const { data } = await api.post('/workspaces', { name: newWsName.trim(), color: newWsColor });
      setWorkspaces(prev => [data, ...prev]);
      setNewWsName('');
      setShowNewWorkspace(false);
      toast.success('Workspace created!');
    } catch (err) { toast.error('Failed to create workspace'); }
    finally { setCreatingWs(false); }
  };

  const handleDeleteWorkspace = async (wsId) => {
    if (!window.confirm('Delete this workspace?')) return;
    try {
      await api.delete(`/workspaces/${wsId}`);
      setWorkspaces(prev => prev.filter(w => w._id !== wsId));
      if (activeView === wsId) setActiveView('all');
      toast.success('Workspace deleted');
    } catch (err) { toast.error('Failed to delete workspace'); }
  };

  const handleWsInvite = async (e) => {
    e.preventDefault();
    if (!wsInviteEmail.trim() || !wsInviteTarget) return;
    setWsInviting(true);
    try {
      await api.post(`/workspaces/${wsInviteTarget._id}/invite`, { email: wsInviteEmail.trim() });
      toast.success(`Invite sent to ${wsInviteEmail.trim()}!`);
      setWsInviteEmail('');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to send invite'); }
    finally { setWsInviting(false); }
  };

  const filteredBoards = activeView === 'all'
    ? boards
    : boards.filter(b => b.workspace === activeView || b.workspace?._id === activeView);

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const gradients = BACKGROUNDS.filter(b => b.type === 'gradient');
  const images = BACKGROUNDS.filter(b => b.type === 'image');
  const currentList = bgTab === 'gradient' ? gradients : images;

  // Helper: apply background correctly for preview vs board card
  const getBgStyle = (bg) => bg.type === 'image'
    ? { backgroundImage: bg.value, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: bg.value };

  return (
    <div className="dashboard">
      {/* ── Premium Glassy Header ───────────────────────────────────────── */}
      <header className="dashboard-header">
        <div className="header-left">
          <div className="logo-pill">
            <span className="logo-bolt">⚡</span>
            <span className="logo-text">Fluxboard</span>
          </div>
        </div>
        <div className="header-right">
          <NotificationBell />
          <div className="user-chip">
            <div className="user-avatar-sm">{user?.name?.[0]?.toUpperCase()}</div>
            <span className="user-chip-name">{user?.name}</span>
          </div>
          <button id="logout-btn" className="header-signout-btn" onClick={handleLogout}>Sign Out</button>
        </div>
      </header>

      <div className="dashboard-layout">
        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <aside className="dashboard-sidebar">
          <div className="sidebar-section">
            <h3 className="sidebar-label">Navigation</h3>
            <button className={`sidebar-item ${activeView === 'all' ? 'active' : ''}`} onClick={() => { setActiveView('all'); setWsInviteTarget(null); }}>
              <span className="sidebar-icon">🏠</span> All Boards
              <span className="sidebar-badge">{boards.length}</span>
            </button>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-label-row">
              <h3 className="sidebar-label">Workspaces</h3>
              <button className="sidebar-add-btn" onClick={() => setShowNewWorkspace(!showNewWorkspace)} title="New Workspace">+</button>
            </div>

            {showNewWorkspace && (
              <form onSubmit={handleCreateWorkspace} className="sidebar-ws-form">
                <input type="text" placeholder="Workspace name..." value={newWsName} onChange={e => setNewWsName(e.target.value)} autoFocus />
                <div className="ws-color-row">
                  {WORKSPACE_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setNewWsColor(c)} style={{ background: c, outline: newWsColor === c ? '2px solid #fff' : 'none' }} className="ws-color-dot" />
                  ))}
                </div>
                <button type="submit" className="btn-primary small" disabled={creatingWs || !newWsName.trim()}>
                  {creatingWs ? <span className="spinner small" /> : 'Create'}
                </button>
              </form>
            )}

            {wsLoading ? <div className="sidebar-item" style={{ opacity: 0.5 }}>Loading...</div> : workspaces.length === 0 ? (
              <p className="sidebar-empty">No workspaces yet</p>
            ) : workspaces.map(ws => (
              <div key={ws._id} className={`workspace-item ${activeView === ws._id ? 'active' : ''}`}>
                <button className="sidebar-item-inner" onClick={() => { setActiveView(ws._id); setWsInviteTarget(ws); }}>
                  <span className="ws-dot" style={{ background: ws.color }} />
                  <span className="ws-name">{ws.name}</span>
                  <span className="ws-member-count">{ws.members?.length || 1}</span>
                </button>
                <button className="sidebar-item-del" onClick={() => handleDeleteWorkspace(ws._id)} title="Delete">✕</button>
              </div>
            ))}
          </div>
        </aside>

        {/* ── Main ─────────────────────────────────────────────────────── */}
        <main className="dashboard-main">

          {/* Workspace invite panel (shown when a workspace is selected) */}
          {wsInviteTarget && (
            <div className="ws-invite-banner">
              <div className="ws-invite-banner-left">
                <span className="ws-dot" style={{ background: wsInviteTarget.color, width: 12, height: 12 }} />
                <strong>{wsInviteTarget.name}</strong>
                <span className="ws-member-pill">👤 {wsInviteTarget.members?.length || 1} member{(wsInviteTarget.members?.length || 1) !== 1 ? 's' : ''}</span>
              </div>
              <form className="ws-invite-form" onSubmit={handleWsInvite}>
                <input
                  type="email"
                  placeholder="Invite member by email..."
                  value={wsInviteEmail}
                  onChange={e => setWsInviteEmail(e.target.value)}
                />
                <button type="submit" className="btn-primary small" disabled={wsInviting || !wsInviteEmail.trim()}>
                  {wsInviting ? <span className="spinner small" /> : 'Send Invite'}
                </button>
              </form>
            </div>
          )}

          <div className="dashboard-title-row">
            <h1>{activeView === 'all' ? 'My Boards' : (workspaces.find(w => w._id === activeView)?.name || 'Boards')}</h1>
          </div>

          {/* Create Board */}
          <div className="create-board-panel">
            <h2>Create a New Board</h2>
            <form onSubmit={handleCreate}>
              <div className="create-board-top">
                <input id="new-board-input" type="text" placeholder="Board title…" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                <select className="workspace-select" value={selectedWorkspace || ''} onChange={e => setSelectedWorkspace(e.target.value || null)}>
                  <option value="">No Workspace</option>
                  {workspaces.map(ws => <option key={ws._id} value={ws._id}>{ws.name}</option>)}
                </select>
                <button id="create-board-btn" type="submit" className="btn-primary" disabled={creating || !newTitle.trim()}>
                  {creating ? <span className="spinner" /> : 'Create Board'}
                </button>
              </div>

              {/* Background Picker */}
              <div className="bg-picker">
                <div className="bg-picker-header">
                  <span className="bg-picker-label">Background:</span>
                  <div className="bg-picker-tabs">
                    <button type="button" className={`bg-tab ${bgTab === 'gradient' ? 'active' : ''}`} onClick={() => setBgTab('gradient')}>Gradients</button>
                    <button type="button" className={`bg-tab ${bgTab === 'image' ? 'active' : ''}`} onClick={() => setBgTab('image')}>Photos</button>
                  </div>
                </div>
                <div className="bg-picker-body">
                  <div className="bg-swatch-row">
                    {currentList.map(bg => (
                      <button
                        key={bg.value}
                        type="button"
                        title={bg.label}
                        onClick={() => setSelectedBg(bg)}
                        className="bg-swatch"
                        style={{
                          ...getBgStyle({ ...bg, value: bg.preview }),
                          outline: selectedBg.value === bg.value ? '3px solid #fff' : 'none',
                          outlineOffset: '2px',
                        }}
                      />
                    ))}
                  </div>

                  {/* Full mini-board preview */}
                  <div
                    className="bg-preview-card"
                    style={getBgStyle(selectedBg)}
                  >
                    <div className="bg-preview-header">
                      <span>{newTitle || 'Board Title'}</span>
                    </div>
                    <div className="bg-preview-lists">
                      {['To Do', 'In Progress'].map(l => (
                        <div key={l} className="bg-preview-list">
                          <div className="bg-preview-list-title">{l}</div>
                          <div className="bg-preview-card-stub" />
                          <div className="bg-preview-card-stub" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Boards Grid */}
          {loading ? (
            <div className="loading-grid">{[...Array(4)].map((_, i) => <div key={i} className="board-card-skeleton" />)}</div>
          ) : filteredBoards.length === 0 ? (
            <div className="empty-state"><span className="empty-icon">📋</span><p>No boards yet. Create your first one above!</p></div>
          ) : (
            <div className="boards-grid">
              {filteredBoards.map(board => {
                const bg = BACKGROUNDS.find(b => b.value === board.color);
                const cardStyle = bg ? getBgStyle(bg) : { background: board.color || '#0079BF' };
                return (
                  <div
                    key={board._id}
                    className="board-card"
                    style={cardStyle}
                    onClick={() => navigate(`/board/${board._id}`)}
                    role="button"
                    tabIndex={0}
                    id={`board-card-${board._id}`}
                    onKeyDown={e => e.key === 'Enter' && navigate(`/board/${board._id}`)}
                  >
                    <div className="board-card-overlay" />
                    <h2 className="board-card-title">{board.title}</h2>
                    <p className="board-card-meta">{new Date(board.createdAt).toLocaleDateString()}</p>
                    <button id={`delete-board-${board._id}`} className="board-delete-btn" onClick={e => { e.stopPropagation(); handleDelete(board._id); }} title="Delete">✕</button>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
