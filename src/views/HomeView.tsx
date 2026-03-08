import { motion } from 'motion/react';
import { Heart, Plus, LogIn, Shuffle, Trophy, MessageCircle, LogOut, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';

export default function HomeView({
  user,
  onLogout,
  onlineUsers,
  socket,
}: {
  user: any;
  onLogout: () => void;
  onlineUsers: Array<{ id: string; name: string }>;
  socket: Socket;
}) {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [inviteStatus, setInviteStatus] = useState('');
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);

  const createRoom = () => {
    const code = 'LOVE-' + Math.floor(1000 + Math.random() * 9000);
    navigate(`/room/${code}`);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-100 p-4 pb-20 md:p-8 md:pb-20 flex flex-col items-center">
      <header className="w-full max-w-md flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <div className="bg-rose-500 p-2 rounded-lg shadow-md shadow-rose-500/20">
            <Heart className="w-6 h-6 text-white fill-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">AMOR 100%</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-600">{user.name}</span>
          <button onClick={onLogout} className="p-2 bg-white/50 rounded-full hover:bg-white/80 transition-colors">
            <LogOut className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </header>

      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-6"
      >
        {inviteStatus && <div className="rounded-xl bg-white px-4 py-3 text-sm text-slate-600 shadow-sm border border-slate-100">{inviteStatus}</div>}

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
            Jogadores Online
          </h3>
          {onlineUsers.length === 0 ? (
            <div className="text-center py-3 text-slate-400 text-sm">Nenhum jogador online.</div>
          ) : (
            <div className="space-y-2">
              {onlineUsers.map((player) => (
                <div key={player.id} className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="text-sm font-medium text-slate-700">{player.name}</span>
                  {player.id !== user.id && (
                    <button
                      onClick={() => invitePlayer(player)}
                      disabled={invitingUserId === player.id}
                      className="ml-auto rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-70"
                    >
                      {invitingUserId === player.id ? 'A enviar...' : 'Convidar'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:border-rose-200 hover:shadow-md transition-all flex flex-col items-center justify-center gap-3 group">
            <div className="bg-orange-50 p-3 rounded-full group-hover:bg-orange-100 transition-colors">
              <Shuffle className="w-6 h-6 text-orange-500" />
            </div>
            <span className="text-sm font-medium text-slate-700">Aleatorio</span>
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
            Conversas Recentes
          </h3>
          <div className="text-center py-6 text-slate-400 text-sm">Nenhuma conversa ainda. Jogue para liberar o chat!</div>
        </div>
      </motion.main>
    </div>
  );
}
