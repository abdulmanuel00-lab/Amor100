import React, { useEffect, useState } from 'react';
import { Heart, Mail, User } from 'lucide-react';
import { motion } from 'motion/react';
import { apiUrl } from '../lib/api';

async function readJsonSafe(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { error: `Resposta invalida do servidor (${res.status})` };
  }
}

export default function LoginView({ onLogin }: { onLogin: (user: any) => void }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [totalLogins, setTotalLogins] = useState<number | null>(null);

  useEffect(() => {
    fetch(apiUrl('/api/stats'))
      .then((res) => res.json())
      .then((data) => {
        if (typeof data?.totalLogins === 'number') {
          setTotalLogins(data.totalLogins);
        }
      })
      .catch(() => {
        setTotalLogins(null);
      });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) {
      setError('Informe um e-mail valido.');
      return;
    }
    if (!name) return;

    setLoading(true);
    setError('');
    try {
      const res = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });
      const data = await readJsonSafe(res);
      if (data.user) {
        onLogin(data.user);
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      console.error(err);
      setError('Falha de rede ao fazer login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-rose-200 flex items-center justify-center p-4 pb-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-xl w-full max-w-md border border-white/50"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="bg-gradient-to-tr from-rose-500 to-pink-500 p-4 rounded-full shadow-lg shadow-rose-500/30 mb-4">
            <Heart className="w-10 h-10 text-white fill-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">AMOR 100%</h1>
          <p className="text-slate-500 mt-2 text-center text-sm">Descubra o quanto voces se conhecem</p>
          {totalLogins !== null && (
            <p className="mt-3 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 border border-rose-200">
              {`${totalLogins} adesoes ja registradas`}
            </p>
          )}
        </div>

        {error && (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Seu e-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder="voce@exemplo.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all bg-white/50"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Como devemos te chamar?</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all bg-white/50"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-rose-500/30 disabled:opacity-70"
          >
            {loading ? 'Entrando...' : 'Comecar a jogar'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
