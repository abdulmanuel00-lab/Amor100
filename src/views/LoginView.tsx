import React, { useState } from 'react';
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
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) {
      setError('Informe um e-mail valido.');
      return;
    }

    setSendingOtp(true);
    setError('');
    try {
      const res = await fetch(apiUrl('/api/auth/send-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await readJsonSafe(res);
      if (!res.ok) {
        setError(data.error || 'Nao foi possivel enviar o codigo por e-mail.');
        return;
      }
      setDevOtp(data.devCode || '');
      setStep(2);
    } catch (_err) {
      setError('Falha de rede ao enviar o codigo por e-mail.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 4) {
      setError('Digite os 4 numeros do codigo.');
      return;
    }

    setVerifyingOtp(true);
    setError('');
    try {
      const res = await fetch(apiUrl('/api/auth/verify-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await readJsonSafe(res);
      if (!res.ok) {
        setError(data.error || 'Codigo invalido.');
        return;
      }
      setStep(3);
    } catch (_err) {
      setError('Falha de rede ao validar o codigo.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setError('Falha de rede ao criar perfil.');
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
        </div>

        {error && (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-4">
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
            <button
              type="submit"
              disabled={sendingOtp}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-xl transition-colors shadow-md disabled:opacity-70"
            >
              {sendingOtp ? 'Enviando...' : 'Continuar'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Codigo de verificacao</label>
              <p className="text-xs text-slate-500 mb-3">Enviamos um codigo para {email}</p>
              {devOtp && (
                <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Teste localhost: use o codigo <strong>{devOtp}</strong>
                </p>
              )}
              <input
                type="text"
                required
                maxLength={4}
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, ''));
                  setError('');
                }}
                placeholder="0000"
                className="w-full px-4 py-3 text-center text-2xl tracking-widest rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all bg-white/50"
              />
            </div>
            <button
              type="submit"
              disabled={verifyingOtp}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-xl transition-colors shadow-md disabled:opacity-70"
            >
              {verifyingOtp ? 'Verificando...' : 'Verificar'}
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleCreateProfile} className="space-y-4">
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
              {loading ? 'Criando...' : 'Comecar a jogar'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
