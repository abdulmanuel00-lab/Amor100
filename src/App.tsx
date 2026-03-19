import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import LoginView from './views/LoginView';
import HomeView from './views/HomeView';
import RoomView from './views/RoomView';
import GameView from './views/GameView';
import ResultView from './views/ResultView';
import RankingView from './views/RankingView';
import ChatView from './views/ChatView';
import DirectChatView from './views/DirectChatView';
import { API_BASE_URL } from './lib/api';

// Initialize socket connection
const socket: Socket = io(API_BASE_URL);

function Signature() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-rose-100 bg-white/90 py-2 text-center text-xs font-medium text-slate-600 backdrop-blur">
      Desenvolvido | ABDUL MANUEL ALBINO
    </footer>
  );
}

function InviteOverlay({
  socket,
  user,
}: {
  socket: Socket;
  user: { id: string; name: string; phone: string } | null;
}) {
  const navigate = useNavigate();
  const [invite, setInvite] = useState<{ fromUserId: string; fromName: string; roomId: string } | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const onRoomInvite = (payload: { fromUserId: string; fromName: string; roomId: string }) => {
      setInvite(payload);
    };

    socket.on('room_invite', onRoomInvite);
    return () => {
      socket.off('room_invite', onRoomInvite);
    };
  }, [socket, user?.id]);

  const respond = (accepted: boolean) => {
    if (!invite || !user?.id) return;
    socket.emit('respond_room_invite', {
      fromUserId: invite.fromUserId,
      toUserId: user.id,
      roomId: invite.roomId,
      accepted,
    });

    if (accepted) navigate(`/room/${invite.roomId}`);
    setInvite(null);
  };

  if (!invite) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-rose-200 bg-white p-5 shadow-xl">
        <p className="text-base font-semibold text-slate-800">{invite.fromName} convidou voce para uma sala</p>
        <p className="mt-1 text-sm text-slate-500">Codigo: {invite.roomId}</p>
        <div className="mt-4 flex gap-2">
          <button onClick={() => respond(true)} className="flex-1 rounded-xl bg-rose-500 px-3 py-2 text-sm font-medium text-white hover:bg-rose-600">
            Aceitar
          </button>
          <button onClick={() => respond(false)} className="flex-1 rounded-xl bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300">
            Rejeitar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<{ id: string; name: string; phone: string } | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Array<{ id: string; name: string; online?: boolean }>>([]);
  const [minimizedRoomId, setMinimizedRoomId] = useState<string | null>(null);
  const [redirectToGame, setRedirectToGame] = useState<string | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('amor100_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    const storedRoom = localStorage.getItem('amor100_minimized_room');
    if (storedRoom) {
      setMinimizedRoomId(storedRoom);
    }
  }, []);

  const handleLogin = (userData: any) => {
    setUser(userData);
    localStorage.setItem('amor100_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    if (user?.id) {
      socket.emit('logout_user', { userId: user.id });
    }
    setUser(null);
    localStorage.removeItem('amor100_user');
  };

  const handleMinimizeGame = (roomId: string) => {
    setMinimizedRoomId(roomId);
    localStorage.setItem('amor100_minimized_room', roomId);
  };

  const handleRestoreMinimized = (roomId: string) => {
    setMinimizedRoomId(null);
    localStorage.removeItem('amor100_minimized_room');
    setRedirectToGame(roomId);
  };

  const handleCloseMinimized = () => {
    setMinimizedRoomId(null);
    localStorage.removeItem('amor100_minimized_room');
  };

  useEffect(() => {
    const onOnlineUsers = ({ users }: { users: Array<{ id: string; name: string; online?: boolean }> }) => {
      setOnlineUsers(Array.isArray(users) ? users : []);
    };
    const onUserNameUpdated = ({ userId, name }: { userId: string; name: string }) => {
      if (!userId || !name) return;
      setOnlineUsers((prev) => prev.map((item) => (item.id === userId ? { ...item, name } : item)));
      setUser((prev) => {
        if (!prev || prev.id !== userId) return prev;
        const updated = { ...prev, name };
        localStorage.setItem('amor100_user', JSON.stringify(updated));
        return updated;
      });
    };

    const onNewQuestion = (payload: { roomId?: string }) => {
      if (!payload?.roomId) return;
      if (minimizedRoomId === payload.roomId) {
        setMinimizedRoomId(null);
        localStorage.removeItem('amor100_minimized_room');
        setRedirectToGame(payload.roomId);
      }
    };

    socket.on('online_users', onOnlineUsers);
    socket.on('user_name_updated', onUserNameUpdated);
    socket.on('new_question', onNewQuestion);
    return () => {
      socket.off('online_users', onOnlineUsers);
      socket.off('user_name_updated', onUserNameUpdated);
      socket.off('new_question', onNewQuestion);
    };
  }, [minimizedRoomId]);

  useEffect(() => {
    if (!redirectToGame) return;
    setRedirectToGame(null);
  }, [redirectToGame]);

  useEffect(() => {
    if (user?.id) {
      socket.emit('register_user', { userId: user.id });
    } else {
      setOnlineUsers([]);
    }

    const onBeforeUnload = () => {
      if (user?.id) {
        socket.emit('logout_user', { userId: user.id });
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [user?.id]);

  if (!user) {
    return (
      <>
        <LoginView onLogin={handleLogin} />
        <Signature />
      </>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-pink-50 text-slate-900 font-sans selection:bg-pink-200">
        <InviteOverlay socket={socket} user={user} />

        {redirectToGame && <Navigate to={`/game/${redirectToGame}`} replace />}

        {minimizedRoomId && (
          <div className="fixed bottom-20 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
            <div className="w-full max-w-3xl pointer-events-auto bg-white/95 backdrop-blur rounded-xl border border-rose-200 p-3 flex items-center justify-between gap-3 shadow-lg">
              <span className="text-sm font-medium text-slate-700">Jogo minimizado (Sala {minimizedRoomId})</span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRestoreMinimized(minimizedRoomId)}
                  className="px-3 py-1.5 rounded-lg bg-rose-500 text-white text-xs font-semibold"
                >
                  Maximizar
                </button>
                <button
                  onClick={handleCloseMinimized}
                  className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        <Routes>
          <Route
            path="/"
            element={
              <HomeView
                user={user}
                onLogout={handleLogout}
                onlineUsers={onlineUsers}
                socket={socket}
                minimizedRoomId={minimizedRoomId}
                onRestoreMinimized={(roomId) => {
                  handleRestoreMinimized(roomId);
                }}
                onCloseMinimized={handleCloseMinimized}
              />
            }
          />
          <Route path="/room/:roomId" element={<RoomView user={user} socket={socket} />} />
          <Route path="/game/:roomId" element={<GameView user={user} socket={socket} onMinimize={handleMinimizeGame} />} />
          <Route path="/result/:roomId" element={<ResultView user={user} socket={socket} />} />
          <Route path="/ranking" element={<RankingView />} />
          <Route path="/chat/:roomId" element={<ChatView user={user} socket={socket} />} />
          <Route path="/chat/user/:targetUserId" element={<DirectChatView user={user} socket={socket} />} />
        </Routes>
        <Signature />
      </div>
    </Router>
  );
}
