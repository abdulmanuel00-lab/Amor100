import { useEffect, useState } from 'react';
import { Trophy, ArrowLeft, Heart, Medal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { apiUrl } from '../lib/api';

export default function RankingView() {
  const navigate = useNavigate();
  const [ranking, setRanking] = useState<Array<{ rank: number; names: string; games: number }>>([]);

  useEffect(() => {
    fetch(apiUrl('/api/ranking'))
      .then(res => res.json())
      .then(data => setRanking(data));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-100 p-4 pb-20 md:p-8 md:pb-20 flex flex-col items-center">
      <header className="w-full max-w-md flex items-center justify-between mb-8">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 bg-white/50 rounded-full hover:bg-white/80 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500" />
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Ranking Global</h1>
        </div>
        <div className="w-9"></div>
      </header>

      <main className="w-full max-w-md space-y-4">
        <div className="bg-white p-6 rounded-3xl shadow-xl shadow-rose-100/50 border border-rose-50 mb-8 text-center">
          <h2 className="text-lg font-bold text-slate-800 mb-2">Top Casais da Semana</h2>
          <p className="text-slate-500 text-sm">Os casais que mais jogaram nos ultimos 7 dias</p>
        </div>

        {ranking.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
            Ainda sem partidas nesta semana.
          </div>
        )}

        <div className="space-y-3">
          {ranking.map((item, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-center justify-between p-4 rounded-2xl border ${
                index === 0 ? 'bg-gradient-to-r from-yellow-50 to-amber-100 border-yellow-200 shadow-md' :
                index === 1 ? 'bg-gradient-to-r from-slate-50 to-gray-100 border-slate-200 shadow-sm' :
                index === 2 ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200 shadow-sm' :
                'bg-white border-slate-100'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                  index === 0 ? 'bg-yellow-400 text-white shadow-lg shadow-yellow-400/30' :
                  index === 1 ? 'bg-slate-300 text-white shadow-lg shadow-slate-300/30' :
                  index === 2 ? 'bg-orange-400 text-white shadow-lg shadow-orange-400/30' :
                  'bg-slate-100 text-slate-500'
                }`}>
                  {index < 3 ? <Medal className="w-5 h-5" /> : index + 1}
                </div>
                <div>
                  <div className="font-bold text-slate-800">{item.names}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <Heart className="w-3 h-3 text-rose-400 fill-rose-400" />
                    Casal ativo
                  </div>
                </div>
              </div>
              <div className="text-xl font-black text-rose-500">
                {item.games}
                <span className="ml-1 text-xs font-semibold text-slate-500">jogos</span>
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
