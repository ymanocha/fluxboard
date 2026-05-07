import { useBoard } from '../context/BoardContext';

const ActivityFeed = ({ open, onClose }) => {
  const { activityFeed } = useBoard();

  return (
    <div className={`activity-feed ${!open ? 'closed' : ''}`}>
      <div className="activity-header">
        <h3>Activity</h3>
        <button onClick={onClose} className="close-btn">
          ✕
        </button>
      </div>
      <div className="activity-list">
        {activityFeed.length === 0 ? (
          <p className="empty-text">No activity yet.</p>
        ) : (
          activityFeed.map((act) => (
            <div key={act._id} className="activity-item">
              <div className="activity-dot" />
              <div className="activity-content">
                <span className="activity-user">{act.user?.name || 'Unknown'} </span>
                {act.text}
                <div className="activity-time">
                  {new Date(act.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;
