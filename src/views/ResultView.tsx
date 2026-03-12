import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Socket } from 'socket.io-client';
import { MessageCircle, Home, Share2 } from 'lucide-react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';

export default function ResultView({ user, socket }: { user: any; socket: Socket }) {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<any>(null);
  const [shareStatus, setShareStatus] = useState('');

  useEffect(() => {
    socket.emit('join_room', { roomId, userId: user.id });

    socket.on('room_update', ({ room }) => {
      setRoom(room);
      if (room.percentage >= 80) {
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.5 },
          colors: ['#f43f5e', '#ec4899', '#fb7185', '#ffffff'],
        });
      }
    });

    return () => {
      socket.off('room_update');
    };
  }, [roomId, user.id, socket]);

  if (!room) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;

  const getMessage = (percentage: number) => {
    if (percentage <= 30) return 'Ainda precisam se conhecer melhor';
    if (percentage <= 70) return 'Boa conexao';
    return 'Amor verdadeiro';
  };

  const getEmoji = (percentage: number) => {
    if (percentage <= 30) return '??';
    if (percentage <= 70) return '??';
    return '??';
  };

  const handleShare = async () => {
    if (!roomId || !room) return;

    const text = `No Amor100limites fizemos ${room.percentage}% de compatibilidade! Sala: ${roomId}`;
    const url = window.location.origin;

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Amor100limites',
          text,
          url,
        });
        setShareStatus('Resultado partilhado com sucesso.');
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setShareStatus('Resultado copiado para a area de transferencia.');
      }
    } catch {
      setShareStatus('Nao foi possivel partilhar agora.');
    }

    setTimeout(() => setShareStatus(''), 2500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-100 p-4 pb-20 md:p-8 md:pb-20 flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-8 rounded-3xl shadow-2xl shadow-rose-200/50 border border-rose-100 w-full max-w-md text-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-rose-100/50 to-transparent"></div>

        <div className="relative z-10">
          <div className="text-6xl mb-4">{getEmoji(room.percentage)}</div>

          <h1 className="text-3xl font-bold text-slate-800 mb-2">Resultado Final</h1>
          <p className="text-slate-500 font-medium mb-8">Voces se conhecem...</p>

          <div className="relative w-48 h-48 mx-auto mb-8 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#ffe4e6" strokeWidth="10" />
              <motion.circle
                initial={{ strokeDashoffset: 283 }}
                animate={{ strokeDashoffset: 283 - (283 * room.percentage) / 100 }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#f43f5e"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray="283"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-black text-rose-500">{room.percentage}%</span>
            </div>
          </div>

          <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 mb-8">
            <p className="text-lg font-bold text-rose-600">{getMessage(room.percentage)}</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => navigate('/chat/' + roomId)}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-medium py-4 rounded-2xl transition-all shadow-lg shadow-rose-500/30"
            >
              <MessageCircle className="w-5 h-5" />
              Abrir Chat
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/')}
                className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl transition-colors"
              >
                <Home className="w-4 h-4" />
                Inicio
              </button>
              <button
                onClick={handleShare}
                className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Compartilhar
              </button>
            </div>
            {shareStatus && <p className="text-xs text-emerald-600 text-center">{shareStatus}</p>}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
