import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { accessToken } = useAuth();
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!accessToken) {
      // Disconnect any existing socket when logged out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    // Disconnect old socket before creating new one (token rotation)
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const s = io('http://localhost:5000', {
      auth: { token: accessToken },
      reconnectionAttempts: 5,
    });

    s.on('connect', () => console.log('Socket connected:', s.id));
    s.on('connect_error', (err) => console.error('Socket connection error:', err.message));
    s.on('disconnect', (reason) => console.log('Socket disconnected:', reason));

    socketRef.current = s;
    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [accessToken]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);
