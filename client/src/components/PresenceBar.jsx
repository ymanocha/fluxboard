import { useBoard } from '../context/BoardContext';

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6',
  '#f59e0b', '#3b82f6', '#10b981', '#f43f5e',
];

const getInitials = (name = '') =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

const PresenceBar = () => {
  const { activeUsers } = useBoard();

  if (!activeUsers.length) return null;

  return (
    <div className="presence-bar" aria-label="Active collaborators">
      <span className="presence-label">Online:</span>
      <div className="presence-avatars">
        {activeUsers.map((u, idx) => (
          <div
            key={u.socketId || u.userId}
            className="avatar"
            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
            title={u.name}
          >
            {getInitials(u.name)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PresenceBar;
