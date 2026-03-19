import { motion } from 'motion/react';
import { Heart, Plus, LogIn, Shuffle, Trophy, MessageCircle, LogOut, Users, Bell, Trash2, ChevronDown, ChevronRight, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';

export default function HomeView({
  user,
  onLogout,
  onlineUsers,
  socket,
  minimizedRoomId,
  onRestoreMinimized,
  onCloseMinimized,
}: {
  user: any;
  onLogout: () => void;
  onlineUsers: Array<{ id: string; name: string; online?: boolean }>;
  socket: Socket;
  minimizedRoomId: string | null;
  onRestoreMinimized: (roomId: string) => void;
  onCloseMinimized: () => void;
}) {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [inviteStatus, setInviteStatus] = useState('');
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);
  const [threads, setThreads] = useState<Array<{ peer_id: string; peer_name: string; last_message: string; last_message_at: string; unread_count: number }>>([]);
  const [notifications, setNotifications] = useState<Array<{ id: string; text: string }>>([]);
  const [availableRooms, setAvailableRooms] = useState<Array<{ id: string; player1: string; player1_name?: string }>>([]);
  const [joiningRandom, setJoiningRandom] = useState(false);
  const [clearingThreadId, setClearingThreadId] = useState<string | null>(null);
  const [showOnlinePlayers, setShowOnlinePlayers] = useState(true);
  const [showOfflinePlayers, setShowOfflinePlayers] = useState(false);

  const createRoom = () => {
    const code = 'LOVE-' + Math.floor(1000 + Math.random() * 9000);
    navigate(`/room/${code}`);
  };

  const joinRandomRoom = () => {
    setJoiningRandom(true);
    const candidate = availableRooms.find((room) => room.player1 !== user.id);

    if (candidate?.id) {
      setInviteStatus(`A entrar na sala de ${candidate.player1_name || 'outro jogador'}...`);
      navigate(`/room/${candidate.id}`);
      setJoiningRandom(false);
      return;
    }

    setInviteStatus('Nenhuma sala disponivel. Criamos uma nova para voce.');
    createRoom();
    setJoiningRandom(false);
  };

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.length > 4) {
      navigate(`/room/${joinCode.toUpperCase()}`);
    }
  };

  const invitePlayer = (target: { id: string; name: string }) => {
    const roomCode = 'LOVE-' + Math.floor(1000 + Math.random() * 9000);
    setInvitingUserId(target.id);
    setInviteStatus('');

    socket.emit(
      'invite_to_room',
      {
        fromUserId: user.id,
        toUserId: target.id,
        roomId: roomCode,
        fromName: user.name,
      },
      (result: { ok: boolean; error?: string }) => {
        setInvitingUserId(null);
        if (!result?.ok) {
          setInviteStatus(result?.error || 'Nao foi possivel enviar o convite.');
          return;
        }
        setInviteStatus(`Convite enviado para ${target.name}.`);
        navigate(`/room/${roomCode}`);
      }
    );
  };

  const editMyName = () => {
    const currentName = String(user?.name || '').trim();
    const nextName = window.prompt('Novo nome:', currentName);
    if (!nextName) return;
    const cleanName = nextName.trim();
    if (cleanName.length < 2) {
      setInviteStatus('O nome deve ter pelo menos 2 letras.');
      return;
    }

    socket.emit('update_user_name', { userId: user.id, name: cleanName }, (result: { ok: boolean; error?: string }) => {
      if (!result?.ok) {
        setInviteStatus(result?.error || 'Nao foi possivel atualizar o nome.');
        return;
      }
      setInviteStatus('Nome atualizado com sucesso.');
    });
  };

  useEffect(() => {
    const onInviteResponse = (data: { accepted: boolean; roomId: string }) => {
      if (data.accepted) {
        setInviteStatus(`Convite aceite! Entraram na sala ${data.roomId}.`);
      } else {
        setInviteStatus('Convite recusado.');
      }
    };

    socket.on('invite_response', onInviteResponse);

    return () => {
      socket.off('invite_response', onInviteResponse);
    };
  }, [socket]);

  useEffect(() => {
    if (!user?.id) return;

    const onAvailableRooms = ({ rooms }: { rooms: Array<{ id: string; player1: string; player1_name?: string }> }) => {
      setAvailableRooms(Array.isArray(rooms) ? rooms : []);
    };

    socket.on('available_rooms', onAvailableRooms);
    socket.emit('request_available_rooms');

    return () => {
      socket.off('available_rooms', onAvailableRooms);
    };
  }, [socket, user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const onThreads = ({
      threads,
    }: {
      threads: Array<{ peer_id: string; peer_name: string; last_message: string; last_message_at: string; unread_count: number }>;
    }) => {
      setThreads(Array.isArray(threads) ? threads : []);
    };

    const onDirectNotification = (payload: { fromName?: string; message?: string; timestamp?: string }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const sender = payload?.fromName || 'Jogador';
      const message = payload?.message || 'Nova mensagem';
      setNotifications((prev) => [...prev, { id, text: `${sender}: ${message}` }].slice(-3));
      setTimeout(() => {
        setNotifications((prev) => prev.filter((item) => item.id !== id));
      }, 3500);
    };

    socket.on('direct_threads', onThreads);
    socket.on('direct_message_notification', onDirectNotification);
    socket.emit('request_direct_threads', { userId: user.id });

    return () => {
      socket.off('direct_threads', onThreads);
      socket.off('direct_message_notification', onDirectNotification);
    };
  }, [socket, user?.id]);

  const openDirectChat = (target: { id: string; name: string }) => {
    navigate(`/chat/user/${target.id}`, { state: { targetName: target.name } });
  };

  const clearThread = (peerId: string, peerName: string) => {
    if (!user?.id || !peerId) return;
    const confirmed = window.confirm(`Limpar todas as mensagens com ${peerName || 'este jogador'}?`);
    if (!confirmed) return;

    setClearingThreadId(peerId);
    socket.emit('clear_direct_messages', { userId: user.id, withUserId: peerId }, (result: { ok: boolean; error?: string }) => {
      setClearingThreadId(null);
      if (!result?.ok) {
        setInviteStatus(result?.error || 'Nao foi possivel limpar esta conversa.');
        return;
      }
      setThreads((prev) => prev.filter((thread) => thread.peer_id !== peerId));
    });
  };

  const totalUnread = threads.reduce((acc, item) => acc + Number(item.unread_count || 0), 0);
  const onlinePlayers = onlineUsers.filter((player) => !!player.online);
  const offlinePlayers = onlineUsers.filter((player) => !player.online);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-100 px-4 md:px-8 py-4 md:py-8 flex flex-col items-center">
      <header className="w-full max-w-5xl flex justify-between items-center mb-8">

        <div className="flex items-center gap-2">
          <div className="bg-rose-500 p-2 rounded-lg shadow-md shadow-rose-500/20">
            <Heart className="w-6 h-6 text-white fill-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">AMOR 100%</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-600">{user.name}</span>
          <button onClick={editMyName} className="p-2 bg-white/50 rounded-full hover:bg-white/80 transition-colors" title="Alterar nome">
            <Pencil className="w-4 h-4 text-slate-500" />
          </button>
          <button onClick={onLogout} className="p-2 bg-white/50 rounded-full hover:bg-white/80 transition-colors">
            <LogOut className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </header>

      {minimizedRoomId && (
        <div className="w-full max-w-5xl mb-4 bg-white border border-rose-200 rounded-xl p-3 flex items-center justify-between gap-3 shadow-sm">
          <span className="text-sm font-medium text-slate-700">Jogo minimizado (Sala {minimizedRoomId})</span>
          <div className="flex gap-2">
            <button
              onClick={() => onRestoreMinimized(minimizedRoomId)}
              className="px-3 py-1.5 rounded-lg bg-rose-500 text-white text-xs font-semibold"
            >
              Maximizar
            </button>
            <button
              onClick={() => onCloseMinimized()}
              className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-xs font-semibold"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl space-y-6 mx-auto"
      >
        {inviteStatus && <div className="rounded-xl bg-white px-4 py-3 text-sm text-slate-600 shadow-sm border border-slate-100">{inviteStatus}</div>}
        {notifications.length > 0 && (
          <div className="space-y-2">
            {notifications.map((item) => (
              <div key={item.id} className="rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-700 border border-emerald-200 flex items-center gap-2">
                <Bell className="w-4 h-4" />
                <span className="truncate">{item.text}</span>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white p-6 rounded-3xl shadow-xl shadow-rose-100/50 border border-rose-50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-100 rounded-full blur-3xl -mr-10 -mt-10 opacity-60"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-pink-100 rounded-full blur-2xl -ml-10 -mb-10 opacity-60"></div>

          <div className="relative z-10">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Prontos para jogar?</h2>
            <p className="text-slate-500 text-sm mb-6">Teste o quanto voces se conhecem com perguntas divertidas e romanticas.</p>

            <button
              onClick={createRoom}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-medium py-4 rounded-2xl transition-all shadow-lg shadow-rose-500/30"
            >
              <Plus className="w-5 h-5" />
              Criar Nova Sala
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-md border border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
            <LogIn className="w-4 h-4 text-rose-500" />
            Entrar em uma Sala
          </h3>
          <form onSubmit={joinRoom} className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Ex: LOVE-7842"
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all uppercase bg-slate-50"
            />
            <button
              type="submit"
              className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              Entrar
            </button>
          </form>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-md border border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" />
            Jogadores
          </h3>
          {onlineUsers.length === 0 ? (
            <div className="text-center py-3 text-slate-400 text-sm">Nenhum jogador encontrado.</div>
          ) : (
            <div className="space-y-3">
              <div>
                <button
                  onClick={() => setShowOnlinePlayers((prev) => !prev)}
                  className="w-full flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-left"
                >
                  <span className="text-xs font-semibold text-emerald-700">Online ({onlinePlayers.length})</span>
                  {showOnlinePlayers ? <ChevronDown className="h-4 w-4 text-emerald-700" /> : <ChevronRight className="h-4 w-4 text-emerald-700" />}
                </button>
                {showOnlinePlayers && (
                  <div className="mt-2 space-y-2">
                    {onlinePlayers.length === 0 ? (
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">Ninguem online agora.</div>
                    ) : (
                      onlinePlayers.map((player) => (
                        <div key={player.id} className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                          <span className="text-sm font-medium text-slate-700">{player.name}</span>
                          {player.id !== user.id && (
                            <div className="ml-auto flex items-center gap-2">
                              <button
                                onClick={() => openDirectChat(player)}
                                className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-600"
                              >
                                Chat
                              </button>
                              <button
                                onClick={() => invitePlayer(player)}
                                disabled={invitingUserId === player.id}
                                className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-70"
                              >
                                {invitingUserId === player.id ? 'A enviar...' : 'Convidar'}
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div>
                <button
                  onClick={() => setShowOfflinePlayers((prev) => !prev)}
                  className="w-full flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2 text-left"
                >
                  <span className="text-xs font-semibold text-slate-600">Offline ({offlinePlayers.length})</span>
                  {showOfflinePlayers ? <ChevronDown className="h-4 w-4 text-slate-600" /> : <ChevronRight className="h-4 w-4 text-slate-600" />}
                </button>
                {showOfflinePlayers && (
                  <div className="mt-2 space-y-2">
                    {offlinePlayers.length === 0 ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-500">Sem jogadores offline.</div>
                    ) : (
                      offlinePlayers.map((player) => (
                        <div key={player.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                          <span className="text-sm font-medium text-slate-600">{player.name}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={joinRandomRoom}
            disabled={joiningRandom}
            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:border-rose-200 hover:shadow-md transition-all flex flex-col items-center justify-center gap-3 group disabled:opacity-70"
          >
            <div className="bg-orange-50 p-3 rounded-full group-hover:bg-orange-100 transition-colors">
              <Shuffle className="w-6 h-6 text-orange-500" />
            </div>
            <span className="text-sm font-medium text-slate-700">{joiningRandom ? 'A procurar...' : 'Aleatorio'}</span>
          </button>

          <button
            onClick={() => navigate('/ranking')}
            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:border-rose-200 hover:shadow-md transition-all flex flex-col items-center justify-center gap-3 group"
          >
            <div className="bg-yellow-50 p-3 rounded-full group-hover:bg-yellow-100 transition-colors">
              <Trophy className="w-6 h-6 text-yellow-500" />
            </div>
            <span className="text-sm font-medium text-slate-700">Ranking</span>
          </button>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-md border border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-rose-500" />
            Caixa de Mensagens
            {totalUnread > 0 && (
              <span className="ml-auto rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-semibold text-white">{totalUnread} nova(s)</span>
            )}
          </h3>
          {threads.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm">Nenhuma conversa ainda.</div>
          ) : (
            <div className="space-y-2">
              {threads.map((thread) => (
                <div key={thread.peer_id} className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 hover:bg-white hover:border-rose-200 transition-colors">
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => openDirectChat({ id: thread.peer_id, name: thread.peer_name || 'Jogador' })}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-700 truncate">{thread.peer_name || 'Jogador'}</span>
                        <div className="flex items-center gap-2">
                          {thread.unread_count > 0 && (
                            <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-semibold text-white">{thread.unread_count}</span>
                          )}
                          <span className="text-[10px] text-slate-400">
                            {new Date(thread.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 truncate">{thread.last_message}</p>
                    </button>
                    <button
                      onClick={() => clearThread(thread.peer_id, thread.peer_name || 'Jogador')}
                      disabled={clearingThreadId === thread.peer_id}
                      className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
                      title="Limpar conversa"
                      aria-label={`Limpar conversa com ${thread.peer_name || 'Jogador'}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.main>

      {minimizedRoomId && (
        <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center px-4">
          <div className="w-full max-w-3xl bg-white/95 backdrop-blur rounded-xl border border-rose-200 p-3 flex items-center justify-between gap-3 shadow-lg">
            <span className="text-sm font-medium text-slate-700">Jogo minimizado (Sala {minimizedRoomId})</span>
            <div className="flex gap-2">
              <button
                onClick={() => onRestoreMinimized(minimizedRoomId)}
                className="px-3 py-1.5 rounded-lg bg-rose-500 text-white text-xs font-semibold"
              >
                Maximizar
              </button>
              <button
                onClick={() => onCloseMinimized()}
                className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
