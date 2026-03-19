import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Socket } from 'socket.io-client';
import { Copy, Check, Users, LogOut } from 'lucide-react';
import { motion } from 'motion/react';

export default function RoomView({ user, socket }: { user: any; socket: Socket }) {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    socket.emit('join_room', { roomId, userId: user.id });

    socket.on('room_update', ({ room }) => {
      setRoom(room);
    });

    socket.on('game_start', ({ room }) => {
      setRoom(room);
      navigate(`/game/${roomId}`);
    });

    socket.on('room_closed', () => {
      navigate('/');
    });

    return () => {
      socket.off('room_update');
      socket.off('game_start');
      socket.off('room_closed');
    };
  }, [roomId, user.id, socket, navigate]);

  const copyCode = () => {
    navigator.clipboard.writeText(roomId || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const leaveRoom = () => {
    socket.emit('leave_room', { roomId, userId: user.id });
    navigate('/');
  };

  if (!room) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-100 px-4 md:px-8 py-4 md:py-8 flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-3xl md:max-w-2xl lg:max-w-xl bg-white p-8 rounded-3xl shadow-xl shadow-rose-100/50 border border-rose-50 text-center"
      >
        <div className="flex justify-center mb-6">
          <div className="bg-rose-50 p-4 rounded-full">
            <Users className="w-12 h-12 text-rose-500" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-slate-800 mb-2">Sala de Espera</h2>
        <p className="text-slate-500 text-sm mb-4">Compartilhe o codigo abaixo com seu parceiro(a) para comecar a jogar.</p>

        <button
          onClick={leaveRoom}
          className="mb-8 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair da sala
        </button>

        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-8 relative group">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Codigo da Sala</div>
          <div className="text-4xl font-mono font-bold text-slate-800 tracking-wider">{roomId}</div>
          <button
            onClick={copyCode}
            className="absolute top-1/2 -translate-y-1/2 right-4 p-2 bg-white rounded-full shadow-sm hover:bg-rose-50 transition-colors"
          >
            {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-slate-400" />}
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-tr from-rose-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="font-medium text-slate-700">{user.name}</span>
            </div>
            <span className="text-xs font-semibold text-green-500 bg-green-50 px-2 py-1 rounded-full">Pronto</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-slate-400" />
              </div>
              <span className="font-medium text-slate-400">Aguardando jogador 2...</span>
            </div>
            <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-rose-500 animate-spin"></div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-xs text-slate-400 mb-4">Para testar sozinho, abra outra aba e use o codigo.</p>
        </div>
      </motion.div>
    </div>
  );
}
