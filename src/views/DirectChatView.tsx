import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Socket } from 'socket.io-client';
import { ArrowLeft, Send } from 'lucide-react';
import { motion } from 'motion/react';

type DirectMessage = {
  id: string;
  fromUserId: string;
  toUserId: string;
  message: string;
  timestamp: string;
};

export default function DirectChatView({ user, socket }: { user: any; socket: Socket }) {
  const { targetUserId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [input, setInput] = useState('');
  const [targetName, setTargetName] = useState((location.state as any)?.targetName || 'Jogador');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const peerId = useMemo(() => targetUserId || '', [targetUserId]);

  useEffect(() => {
    if (!user?.id || !peerId) return;

    socket.emit('request_direct_messages', { userId: user.id, withUserId: peerId }, (result: { ok: boolean; messages?: any[] }) => {
      if (!result?.ok) return;
      const initialMessages = (result.messages || []).map((msg) => ({
        id: msg.id,
        fromUserId: msg.from_user_id,
        toUserId: msg.to_user_id,
        message: msg.message,
        timestamp: msg.timestamp,
      }));
      setMessages(initialMessages);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    });

    socket.emit('mark_direct_read', { userId: user.id, withUserId: peerId });
  }, [peerId, socket, user?.id]);

  useEffect(() => {
    if (!user?.id || !peerId) return;

    const onThreads = ({ threads }: { threads: Array<{ peer_id: string; peer_name?: string }> }) => {
      const thread = (threads || []).find((item) => item.peer_id === peerId);
      if (thread?.peer_name) setTargetName(thread.peer_name);
    };

    const onDirectMessage = (msg: DirectMessage) => {
      const belongsToThisChat =
        (msg.fromUserId === user.id && msg.toUserId === peerId) || (msg.fromUserId === peerId && msg.toUserId === user.id);
      if (!belongsToThisChat) return;

      setMessages((prev) => [...prev, msg]);
      socket.emit('mark_direct_read', { userId: user.id, withUserId: peerId });
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    };

    socket.on('direct_threads', onThreads);
    socket.on('direct_message', onDirectMessage);
    socket.emit('request_direct_threads', { userId: user.id });

    return () => {
      socket.off('direct_threads', onThreads);
      socket.off('direct_message', onDirectMessage);
    };
  }, [peerId, socket, user?.id]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !peerId) return;
    socket.emit('send_direct_message', {
      fromUserId: user.id,
      toUserId: peerId,
      message: text,
    });
    setInput('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-100 pb-20 flex flex-col items-center">
      <header className="w-full max-w-md flex items-center justify-between p-4 bg-white/80 backdrop-blur-md shadow-sm border-b border-rose-100 sticky top-0 z-10">
        <button onClick={() => navigate('/')} className="p-2 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-lg font-bold text-slate-800 tracking-tight">{targetName}</h1>
          <span className="text-xs text-slate-500">Chat privado</span>
        </div>
        <div className="w-9" />
      </header>

      <main className="w-full max-w-md flex-1 p-4 overflow-y-auto flex flex-col gap-3">
        {messages.length === 0 && <div className="text-center text-xs text-slate-400 my-4">Envie a primeira mensagem.</div>}

        {messages.map((msg) => {
          const isMe = msg.fromUserId === user.id;
          return (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={isMe ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className={
                  'max-w-[78%] p-3 rounded-2xl ' +
                  (isMe
                    ? 'bg-gradient-to-br from-rose-500 to-pink-500 text-white rounded-tr-none shadow-md shadow-rose-500/20'
                    : 'bg-white text-slate-800 rounded-tl-none shadow-sm border border-slate-100')
                }
              >
                <p className="text-sm">{msg.message}</p>
                <span className={'text-[10px] block mt-1 ' + (isMe ? 'text-rose-100' : 'text-slate-400')}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </main>

      <footer className="w-full max-w-md p-4 bg-white border-t border-rose-100 sticky bottom-0">
        <form onSubmit={sendMessage} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escreva sua mensagem..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all text-sm"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="p-3 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-colors disabled:opacity-50 disabled:hover:bg-rose-500 shadow-md shadow-rose-500/30"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </footer>
    </div>
  );
}
