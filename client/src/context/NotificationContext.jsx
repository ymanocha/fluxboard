import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const socket = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read).length);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!socket || !user) return;

    const handleNotification = (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };

    socket.on('notification', handleNotification);
    return () => socket.off('notification', handleNotification);
  }, [socket, user]);

  const markRead = async (id) => {
    try {
      const { data } = await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const updateNotificationStatus = (id, status) => {
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, status, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const acceptBoardInvite = async (notification) => {
    try {
      await api.post(`/members/${notification.meta.boardId}/accept`, { notificationId: notification._id });
      updateNotificationStatus(notification._id, 'accepted');
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to accept' };
    }
  };

  const declineBoardInvite = async (notification) => {
    try {
      await api.post(`/members/${notification.meta.boardId}/decline`, { notificationId: notification._id });
      updateNotificationStatus(notification._id, 'declined');
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to decline' };
    }
  };

  const acceptWorkspaceInvite = async (notification) => {
    try {
      await api.post(`/workspaces/${notification.meta.workspaceId}/accept`, { notificationId: notification._id });
      updateNotificationStatus(notification._id, 'accepted');
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to accept' };
    }
  };

  const declineWorkspaceInvite = async (notification) => {
    try {
      await api.post(`/workspaces/${notification.meta.workspaceId}/decline`, { notificationId: notification._id });
      updateNotificationStatus(notification._id, 'declined');
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to decline' };
    }
  };

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markRead, markAllRead, fetchNotifications, acceptBoardInvite, declineBoardInvite, acceptWorkspaceInvite, declineWorkspaceInvite }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);
