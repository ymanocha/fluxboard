import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import toast from 'react-hot-toast';

const NotificationBell = () => {
  const { notifications, unreadCount, markRead, markAllRead, acceptBoardInvite, declineBoardInvite, acceptWorkspaceInvite, declineWorkspaceInvite } = useNotification();
  const [open, setOpen] = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleNotificationClick = (notification) => {
    // Only navigate for non-invite notifications or already resolved ones
    if (notification.type !== 'BOARD_INVITE' && notification.type !== 'WORKSPACE_INVITE') {
      if (!notification.read) markRead(notification._id);
      setOpen(false);
      if (notification.meta?.boardId) navigate(`/board/${notification.meta.boardId}`);
    }
  };

  const handleAccept = async (e, notification) => {
    e.stopPropagation();
    setLoadingId(notification._id);
    const fn = notification.type === 'WORKSPACE_INVITE' ? acceptWorkspaceInvite : acceptBoardInvite;
    const result = await fn(notification);
    setLoadingId(null);
    if (result.success) {
      toast.success(notification.type === 'WORKSPACE_INVITE' ? 'Joined workspace!' : 'Joined board!');
    } else {
      toast.error(result.message);
    }
  };

  const handleDecline = async (e, notification) => {
    e.stopPropagation();
    setLoadingId(notification._id);
    const fn = notification.type === 'WORKSPACE_INVITE' ? declineWorkspaceInvite : declineBoardInvite;
    const result = await fn(notification);
    setLoadingId(null);
    if (!result.success) toast.error(result.message);
  };

  const isInvite = (n) => n.type === 'BOARD_INVITE' || n.type === 'WORKSPACE_INVITE';

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button className="notification-bell-btn" onClick={() => setOpen(!open)}>
        🔔
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button className="btn-ghost small" onClick={markAllRead}>Mark all read</button>
            )}
          </div>
          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="empty-notifications">No notifications yet.</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  className={`notification-item ${!n.read ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <p className="notification-text">{n.text}</p>
                  <span className="notification-time">{new Date(n.createdAt).toLocaleDateString()}</span>

                  {/* Accept / Decline for pending invites */}
                  {isInvite(n) && n.status === 'pending' && (
                    <div className="invite-actions" onClick={e => e.stopPropagation()}>
                      <button
                        className="invite-btn accept"
                        disabled={loadingId === n._id}
                        onClick={e => handleAccept(e, n)}
                      >
                        {loadingId === n._id ? '...' : '✓ Accept'}
                      </button>
                      <button
                        className="invite-btn decline"
                        disabled={loadingId === n._id}
                        onClick={e => handleDecline(e, n)}
                      >
                        ✕ Decline
                      </button>
                    </div>
                  )}

                  {/* Status badge for resolved invites */}
                  {isInvite(n) && n.status === 'accepted' && (
                    <span className="invite-status accepted">✓ Joined</span>
                  )}
                  {isInvite(n) && n.status === 'declined' && (
                    <span className="invite-status declined">Declined</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
