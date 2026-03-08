import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Socket } from 'socket.io-client';
import { Heart, Send, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';

export default function GameView({ user, socket }: { user: any, socket: Socket }) {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<any>(null);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState('0');
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [questionCount, setQuestionCount] = useState(1);

  useEffect(() => {
    socket.emit('join_room', { roomId, userId: user.id });

    socket.on('room_update', ({ room }) => {
      setRoom(room);
    });

    socket.on('new_question', (q) => {
      setCurrentQuestion(q);
      setResult(null);
      setSelectedAnswer(null);
    });

    socket.on('answer_result', (res) => {
      setResult(res);
      if (room?.asker === user.id && res.selectedAnswer) {
        setSelectedAnswer(res.selectedAnswer);
      }
      if (res.isCorrect) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f43f5e', '#ec4899', '#fb7185']
        });
      }
      setTimeout(() => {
        if (questionCount >= 10) {
          navigate(`/result/${roomId}`);
        } else {
          setQuestionCount(prev => prev + 1);
          setCurrentQuestion(null);
          setResult(null);
          setSelectedAnswer(null);
          setQuestion('');
          setOptions(['', '', '', '']);
        }
      }, 3000);
    });

    return () => {
      socket.off('room_update');
      socket.off('new_question');
      socket.off('answer_result');
    };
  }, [roomId, user.id, socket, navigate, questionCount, room?.asker]);

  const submitQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question || options.some(o => !o)) return;
    
    socket.emit('submit_question', {
      roomId,
      question,
      options,
      correctAnswer: options[parseInt(correctAnswer)]
    });
  };

  const submitAnswer = (answer: string) => {
    if (selectedAnswer) return;
    setSelectedAnswer(answer);
    socket.emit('submit_answer', {
      roomId,
      questionId: currentQuestion.id,
      answer,
      userId: user.id
    });
  };

  if (!room) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;

  const isAsker = room.asker === user.id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-100 p-4 pb-20 md:p-8 md:pb-20 flex flex-col items-center">
      <header className="w-full max-w-md flex justify-between items-center mb-8 bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-white">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
          <span className="font-bold text-slate-800">AMOR 100%</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm font-medium text-slate-500">Pergunta {questionCount}/10</div>
          <div className="bg-rose-100 text-rose-600 px-3 py-1 rounded-full text-sm font-bold">
            {room.percentage}%
          </div>
        </div>
      </header>

      <main className="w-full max-w-md flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {isAsker && !currentQuestion && (
            <motion.div 
              key="asker-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-white p-6 rounded-3xl shadow-xl shadow-rose-100/50 border border-rose-50"
            >
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="w-5 h-5 text-rose-500" />
                <h2 className="text-xl font-bold text-slate-800">Crie uma pergunta</h2>
              </div>
              
              <form onSubmit={submitQuestion} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Sua pergunta</label>
                  <input
                    type="text"
                    required
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ex: Qual é o meu filme favorito?"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all bg-slate-50"
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700">Opções de resposta</label>
                  {options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="correctAnswer"
                        value={idx}
                        checked={correctAnswer === idx.toString()}
                        onChange={(e) => setCorrectAnswer(e.target.value)}
                        className="w-5 h-5 text-rose-500 focus:ring-rose-500 border-slate-300"
                      />
                      <input
                        type="text"
                        required
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...options];
                          newOpts[idx] = e.target.value;
                          setOptions(newOpts);
                        }}
                        placeholder={`Opção ${String.fromCharCode(65 + idx)}`}
                        className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all bg-slate-50"
                      />
                    </div>
                  ))}
                </div>

                <button 
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-medium py-4 rounded-2xl transition-all shadow-lg shadow-rose-500/30 mt-6"
                >
                  <Send className="w-5 h-5" />
                  Enviar Pergunta
                </button>
              </form>
            </motion.div>
          )}

          {!isAsker && !currentQuestion && (
            <motion.div 
              key="responder-wait"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-8 rounded-3xl shadow-xl shadow-rose-100/50 border border-rose-50 text-center"
            >
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin"></div>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Aguardando...</h2>
              <p className="text-slate-500">Seu parceiro(a) está criando uma pergunta difícil para você!</p>
            </motion.div>
          )}

          {currentQuestion && (
            <motion.div 
              key="question-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-3xl shadow-xl shadow-rose-100/50 border border-rose-50"
            >
              <h2 className="text-2xl font-bold text-slate-800 mb-8 text-center leading-tight">
                {currentQuestion.question}
              </h2>

              <div className="space-y-3">
                {currentQuestion.options.map((opt: string, idx: number) => {
                  let btnClass = "w-full text-left px-6 py-4 rounded-2xl border-2 transition-all font-medium text-lg ";
                  
                  if (!result) {
                    btnClass += selectedAnswer === opt 
                      ? "border-rose-500 bg-rose-50 text-rose-700" 
                      : "border-slate-100 bg-slate-50 hover:border-rose-200 hover:bg-rose-50/50 text-slate-700";
                  } else {
                    if (opt === result.correctAnswer) {
                      btnClass += "border-green-500 bg-green-50 text-green-700";
                    } else if (selectedAnswer === opt && !result.isCorrect) {
                      btnClass += "border-red-500 bg-red-50 text-red-700";
                    } else {
                      btnClass += "border-slate-100 bg-slate-50 text-slate-400 opacity-50";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      disabled={isAsker || !!selectedAnswer}
                      onClick={() => submitAnswer(opt)}
                      className={btnClass}
                    >
                      <div className="flex items-center justify-between">
                        <span>{opt}</span>
                        {result && opt === result.correctAnswer && <CheckCircle2 className="w-6 h-6 text-green-500" />}
                        {result && selectedAnswer === opt && !result.isCorrect && <XCircle className="w-6 h-6 text-red-500" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {result && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-8 p-4 rounded-2xl text-center font-bold text-lg ${result.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                >
                  {result.isCorrect ? '🎉 Resposta Correta!' : '💔 Resposta Incorreta!'}
                </motion.div>
              )}
              
              {isAsker && !result && (
                <div className="mt-8 text-center text-slate-400 text-sm font-medium">
                  Aguardando resposta...
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
