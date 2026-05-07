import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { useSocket } from './SocketContext';
import toast from 'react-hot-toast';

const BoardContext = createContext(null);

const initialState = {
  board: null,
  lists: [],
  cards: [],
  activeUsers: [],
  editingUsers: {}, // Map of cardId -> [{ userId, userName }]
  activityFeed: [], // Array of Activity objects
};

const reducer = (state, action) => {
  switch (action.type) {
    // ── Board ──────────────────────────────────────────────────────────────────
    case 'SET_BOARD_DATA':
      return {
        ...state,
        board: action.payload.board,
        lists: action.payload.lists,
        cards: action.payload.cards,
        activityFeed: action.payload.activityFeed || [],
        editingUsers: {},
      };

    case 'CLEAR_BOARD':
      return initialState;

    case 'UPDATE_BOARD':
      return { ...state, board: { ...state.board, ...action.payload } };

    case 'MEMBER_INVITED': {
      if (!state.board) return state;
      const members = state.board.members || [];
      return { ...state, board: { ...state.board, members: [...members, action.payload] } };
    }

    case 'MEMBER_REMOVED': {
      if (!state.board) return state;
      const members = state.board.members || [];
      return { ...state, board: { ...state.board, members: members.filter(m => m._id !== action.payload) } };
    }

    // ── Presence & Editing ─────────────────────────────────────────────────────
    case 'SET_ACTIVE_USERS':
      return { ...state, activeUsers: action.payload };

    case 'ADD_EDITING_USER': {
      const { cardId, user } = action.payload;
      const currentUsers = state.editingUsers[cardId] || [];
      if (currentUsers.find(u => u.userId === user.userId)) return state;
      return {
        ...state,
        editingUsers: { ...state.editingUsers, [cardId]: [...currentUsers, user] }
      };
    }

    case 'REMOVE_EDITING_USER': {
      const { cardId, userId } = action.payload;
      const currentUsers = state.editingUsers[cardId] || [];
      return {
        ...state,
        editingUsers: {
          ...state.editingUsers,
          [cardId]: currentUsers.filter(u => u.userId !== userId)
        }
      };
    }

    case 'CLEAR_EDITING_USER': {
      // Remove a user from all cards (used on disconnect wildcard)
      const { userId } = action.payload;
      const newEditingUsers = {};
      for (const [cId, users] of Object.entries(state.editingUsers)) {
        newEditingUsers[cId] = users.filter(u => u.userId !== userId);
      }
      return { ...state, editingUsers: newEditingUsers };
    }

    // ── Activity ───────────────────────────────────────────────────────────────
    case 'SET_ACTIVITY_FEED':
      return { ...state, activityFeed: action.payload };

    case 'ADD_ACTIVITY':
      return { ...state, activityFeed: [action.payload, ...state.activityFeed] };

    // ── Lists ──────────────────────────────────────────────────────────────────
    case 'ADD_LIST':
      return { ...state, lists: [...state.lists, action.payload] };

    case 'UPDATE_LIST':
      return {
        ...state,
        lists: state.lists.map((l) => (l._id === action.payload._id ? action.payload : l)),
      };

    case 'DELETE_LIST':
      return {
        ...state,
        lists: state.lists.filter((l) => l._id !== action.payload),
        cards: state.cards.filter((c) => c.list !== action.payload),
      };

    // ── Cards ──────────────────────────────────────────────────────────────────
    case 'ADD_CARD':
      return { ...state, cards: [...state.cards, action.payload] };

    case 'UPDATE_CARD':
      return {
        ...state,
        cards: state.cards.map((c) => (c._id === action.payload._id ? action.payload : c)),
      };

    case 'DELETE_CARD':
      return {
        ...state,
        cards: state.cards.filter((c) => c._id !== action.payload),
      };

    // ── Optimistic Move ────────────────────────────────────────────────────────
    case 'MOVE_CARD': {
      const { cardId, fromListId, toListId, fromIndex, toIndex } = action.payload;
      let updatedCards = [...state.cards];
      const cardIdx = updatedCards.findIndex((c) => c._id === cardId);
      if (cardIdx === -1) return state;

      const card = { ...updatedCards[cardIdx], list: toListId };

      // Remove from source list (adjust positions)
      updatedCards = updatedCards
        .map((c) => {
          if (c.list === fromListId && c.position > fromIndex)
            return { ...c, position: c.position - 1 };
          return c;
        })
        .filter((c) => c._id !== cardId);

      // Insert into destination list (adjust positions)
      updatedCards = updatedCards.map((c) => {
        if (c.list === toListId && c.position >= toIndex)
          return { ...c, position: c.position + 1 };
        return c;
      });

      card.position = toIndex;
      updatedCards.push(card);

      return { ...state, cards: updatedCards };
    }

    // ── Revert Move (on rejection) ─────────────────────────────────────────────
    case 'REVERT_CARDS':
      return { ...state, cards: action.payload };

    default:
      return state;
  }
};

export const BoardProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const socket = useSocket();

  // ── Subscribe to socket events ────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    socket.on('presenceUpdate', (users) => {
      dispatch({ type: 'SET_ACTIVE_USERS', payload: users });
    });

    socket.on('cardUpdated', ({ op, serverState }) => {
      if (!serverState) return;
      switch (op.type) {
        case 'CARD_CREATE':
          dispatch({ type: 'ADD_CARD', payload: serverState });
          break;
        case 'CARD_MOVE':
        case 'CARD_UPDATE':
          dispatch({ type: 'UPDATE_CARD', payload: serverState });
          break;
        case 'CARD_DELETE':
          dispatch({ type: 'DELETE_CARD', payload: serverState.cardId });
          break;
        default:
          break;
      }
    });

    socket.on('listUpdated', ({ type, result }) => {
      if (!result) return;
      if (type === 'LIST_CREATE') dispatch({ type: 'ADD_LIST', payload: result });
      else if (type === 'LIST_UPDATE') dispatch({ type: 'UPDATE_LIST', payload: result });
      else if (type === 'LIST_DELETE') dispatch({ type: 'DELETE_LIST', payload: result.listId });
    });

    socket.on('operationRejected', ({ reason }) => {
      toast.error(reason || 'Operation rejected by server');
    });

    socket.on('cardEditing', ({ cardId, userId, userName }) => {
      dispatch({ type: 'ADD_EDITING_USER', payload: { cardId, user: { userId, userName } } });
    });

    socket.on('cardEditingEnd', ({ cardId, userId, wildcard }) => {
      if (wildcard) {
        dispatch({ type: 'CLEAR_EDITING_USER', payload: { userId } });
      } else {
        dispatch({ type: 'REMOVE_EDITING_USER', payload: { cardId, userId } });
      }
    });

    // ── New Events ─────────────────────────────────────────────────────────────
    socket.on('activityAdded', (activity) => {
      dispatch({ type: 'ADD_ACTIVITY', payload: activity });
    });

    socket.on('memberInvited', ({ member }) => {
      dispatch({ type: 'MEMBER_INVITED', payload: member });
    });

    socket.on('memberRemoved', ({ userId }) => {
      dispatch({ type: 'MEMBER_REMOVED', payload: userId });
    });

    return () => {
      socket.off('presenceUpdate');
      socket.off('cardUpdated');
      socket.off('listUpdated');
      socket.off('operationRejected');
      socket.off('cardEditing');
      socket.off('cardEditingEnd');
      socket.off('activityAdded');
      socket.off('memberInvited');
      socket.off('memberRemoved');
    };
  }, [socket]); // socket is stable

  const setBoardData = useCallback((board, lists, cards) => {
    dispatch({ type: 'SET_BOARD_DATA', payload: { board, lists, cards } });
  }, []);

  const clearBoard = useCallback(() => {
    dispatch({ type: 'CLEAR_BOARD' });
  }, []);

  return (
    <BoardContext.Provider value={{ ...state, dispatch, setBoardData, clearBoard }}>
      {children}
    </BoardContext.Provider>
  );
};

export const useBoard = () => {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error('useBoard must be used inside BoardProvider');
  return ctx;
};
