import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Socket } from 'socket.io-client';
import { ArrowLeft, Send, Heart, Image as ImageIcon, Smile } from 'lucide-react';
import { motion } from 'motion/react';

export default function ChatView({ user, socket }: { user: any, socket: Socket }) {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    socket.emit('join_room', { roomId, userId: user.id });

    socket.on('new_message', (msg) => {
      setMessages(prev => [...prev, msg]);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => {
      socket.off('new_message');
    };
  }, [roomId, user.id, socket]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    socket.emit('send_message', {
      roomId,
      userId: user.id,
      message: input
    });
    setInput('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-100 pb-20 flex flex-col items-center">
      <header className="w-full max-w-md flex items-center justify-between p-4 bg-white/80 backdrop-blur-md shadow-sm border-b border-rose-100 sticky top-0 z-10">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
            Sala {roomId}
          </h1>
          <span className="text-xs text-green-500 font-medium flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Online
          </span>
        </div>
        <div className="w-9"></div>
      </header>

      <main className="w-full max-w-md flex-1 p-4 overflow-y-auto flex flex-col gap-3">
        <div className="text-center text-xs text-slate-400 my-4">
          Chat iniciado após o jogo. Vocês se conhecem bem!
        </div>
        
        {messages.map((msg, idx) => {
          const isMe = msg.userId === user.id;
          return (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={"flex " + (isMe ? "justify-end" : "justify-start")}
            >
              <div className={"max-w-[75%] p-3 rounded-2xl " + (
                isMe 
                  ? "bg-gradient-to-br from-rose-500 to-pink-500 text-white rounded-tr-none shadow-md shadow-rose-500/20" 
                  : "bg-white text-slate-800 rounded-tl-none shadow-sm border border-slate-100"
              )}>
                <p className="text-sm">{msg.message}</p>
                <span className={"text-[10px] block mt-1 " + (isMe ? "text-rose-100" : "text-slate-400")}>
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
          <button type="button" className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
            <Smile className="w-6 h-6" />
          </button>
          <button type="button" className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
            <ImageIcon className="w-6 h-6" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite uma mensagem..."
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
