import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Socket } from 'socket.io-client';
import { Heart, Send, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';

const QUESTION_SUGGESTIONS = [
  {
    question: 'Qual é o meu filme romântico favorito?',
    options: ['Diário de uma Paixão', 'Titanic', 'Um Amor para Recordar', 'A Culpa É das Estrelas'],
    correctIndex: 0,
  },
  {
    question: 'Qual foi a primeira viagem que fizemos juntos?',
    options: ['Praia', 'Montanha', 'Parque', 'Museu'],
    correctIndex: 0,
  },
  {
    question: 'Qual é meu prato preferido?',
    options: ['Pizza', 'Sushi', 'Lasanha', 'Churrasco'],
    correctIndex: 2,
  },
  {
    question: 'Qual é minha música favorita?',
    options: ['A Thousand Years', 'Shape of You', 'Perfect', 'Sunflower'],
    correctIndex: 0,
  },
  {
    question: 'Qual é meu lugar ideal para um encontro?',
    options: ['Cinema', 'Jantar', 'Parque', 'Praia'],
    correctIndex: 1,
  },
  {
    question: 'O que não pode faltar no nosso relacionamento?',
    options: ['Confiança 🤝', 'Amor ❤️', 'Respeito 🙏', 'Diversão 😄'],
    correctIndex: 1,
    },
    {
    question: 'Qual é a minha comida favorita?',
    options: ['Arroz com frango 🍗', 'Pizza 🍕', 'Matapa 🍲', 'Hambúrguer 🍔'],
    correctIndex: 0,
  },
  {
    question: 'O que eu mais gosto de fazer no tempo livre?',
    options: ['Dormir 😴', 'Mexer no telemóvel 📱', 'Ver filmes 🎬', 'Sair com amigos 🚶‍♂️'],
    correctIndex: 1,
  },
  {
    question: 'Qual é o meu maior sonho?',
    options: ['Ficar rico 💰', 'Viajar o mundo 🌍', 'Ter uma família feliz 👨‍👩‍👧', 'Ter um negócio próprio 💼'],
    correctIndex: 3,
  },
  {
    question: 'O que mais me irrita?',
    options: ['Mentira 🤥', 'Atrasos ⏰', 'Falta de respeito 😤', 'Barulho excessivo 🔊'],
    correctIndex: 0,
  },
  {
    question: 'Qual é a minha cor favorita?',
    options: ['Preto ⚫', 'Azul 🔵', 'Branco ⚪', 'Vermelho 🔴'],
    correctIndex: 0,
  },
  {
    question: 'Se eu pudesse escolher agora, eu preferia…',
    options: ['Ficar em casa contigo 🏠❤️', 'Sair para comer 🍔', 'Viajar ✈️', 'Jogar ou ver algo 🎮'],
    correctIndex: 0,
  },
  {
    question: 'O que eu mais valorizo em um relacionamento?',
    options: ['Amor ❤️', 'Fidelidade 💍', 'Respeito 🙏', 'Comunicação 🗣️'],
    correctIndex: 1,
  },
  {
    question: 'Qual é o meu tipo de filme favorito?',
    options: ['Ação 💥', 'Romance 💖', 'Comédia 😂', 'Terror 😱'],
    correctIndex: 0,
  },
  {
    question: 'O que eu faria primeiro se ganhasse muito dinheiro?',
    options: ['Compraria casa 🏡', 'Ajudaria família 👨‍👩‍👧', 'Compraria carro 🚗', 'Investiria 💼'],
    correctIndex: 1,
  },
  {
    question: 'O que eu mais gosto em ti? 😏',
    options: ['Teu sorriso 😊', 'Tua forma de cuidar de mim 🥰', 'Tua personalidade 😍', 'Tudo em ti ❤️'],
    correctIndex: 3,
  },
    {
    question: 'Qual é a minha bebida favorita?',
    options: ['Sumo 🧃', 'Refrigerante 🥤', 'Água 💧', 'Cerveja 🍺'],
    correctIndex: 1,
  },
  {
    question: 'O que eu faço quando estou chateado?',
    options: ['Fico calado 🤐', 'Reclamo 😤', 'Me afasto 🚶‍♂️', 'Brinco para disfarçar 😅'],
    correctIndex: 0,
  },
  {
    question: 'Qual é o meu maior medo?',
    options: ['Perder quem amo 💔', 'Falhar na vida 😟', 'Ficar sozinho 😶', 'Não alcançar meus sonhos 😓'],
    correctIndex: 0,
  },
  {
    question: 'Qual dessas coisas eu escolheria comer agora?',
    options: ['Frango assado 🍗', 'Pizza 🍕', 'Batatas fritas 🍟', 'Churrasco 🍖'],
    correctIndex: 3,
  },
  {
    question: 'Qual é o meu estilo de música favorito?',
    options: ['Hip Hop 🎧', 'Kizomba 🎶', 'Afrobeat 🔥', 'Gospel 🙏'],
    correctIndex: 2,
  },
  {
    question: 'Se eu pudesse comprar algo agora, seria…',
    options: ['Telemóvel novo 📱', 'Carro 🚗', 'Roupas 👕', 'Casa 🏠'],
    correctIndex: 0,
  },
  {
    question: 'O que eu mais gosto de fazer contigo?',
    options: ['Conversar 💬', 'Rir 😂', 'Sair juntos 🚶‍♂️', 'Ficar juntinhos ❤️'],
    correctIndex: 3,
  },
  {
    question: 'Qual é o meu maior defeito?',
    options: ['Impaciência 😤', 'Ciúmes 😒', 'Teimosia 😅', 'Preguiça 😴'],
    correctIndex: 2,
  },
  {
    question: 'Qual dessas qualidades eu mais tenho?',
    options: ['Carinhoso 🥰', 'Divertido 😂', 'Responsável 💼', 'Atencioso ❤️'],
    correctIndex: 0,
  },
  {
    question: 'Se eu fosse sair agora, eu iria…',
    options: ['Com amigos 🧑‍🤝‍🧑', 'Contigo ❤️', 'Sozinho 🚶‍♂️', 'Nem sairia 😅'],
    correctIndex: 1,
  },
  {
    question: 'O que eu faço primeiro ao acordar?',
    options: ['Pego no telemóvel 📱', 'Volto a dormir 😴', 'Levanto direto 🚶‍♂️', 'Penso na vida 🤔'],
    correctIndex: 0,
  },
  {
    question: 'Qual dessas coisas eu mais valorizo em mim?',
    options: ['Força 💪', 'Inteligência 🧠', 'Coração ❤️', 'Persistência 🔥'],
    correctIndex: 3,
  }
  {
    question: 'Qual é a minha rede social favorita?',
    options: ['WhatsApp 💬', 'Facebook 📘', 'Instagram 📸', 'TikTok 🎵'],
    correctIndex: 0,
  },
  {
    question: 'Qual é a hora do dia que eu mais gosto?',
    options: ['Manhã 🌅', 'Tarde ☀️', 'Noite 🌙', 'Madrugada 🌌'],
    correctIndex: 2,
  },
  {
    question: 'O que eu prefiro assistir?',
    options: ['Séries 📺', 'Filmes 🎬', 'YouTube ▶️', 'Jogos 🎮'],
    correctIndex: 1,
  },
  {
    question: 'Qual é o meu prato típico favorito?',
    options: ['Xima com caril 🍛', 'Matapa 🍲', 'Arroz com peixe 🐟', 'Frango grelhado 🍗'],
    correctIndex: 1,
  },
  {
    question: 'Se eu estivesse triste, o que me anima mais?',
    options: ['Conversar contigo ❤️', 'Ouvir música 🎧', 'Ficar sozinho 🤐', 'Dormir 😴'],
    correctIndex: 0,
  },
  {
    question: 'Qual é o meu tipo de clima favorito?',
    options: ['Calor ☀️', 'Frio ❄️', 'Chuva 🌧️', 'Nublado ☁️'],
    correctIndex: 0,
  },
  {
    question: 'Qual dessas coisas eu mais gosto de comprar?',
    options: ['Roupas 👕', 'Tecnologia 📱', 'Comida 🍔', 'Sapatos 👟'],
    correctIndex: 1,
  },
  {
    question: 'Qual é o meu passatempo preferido?',
    options: ['Jogar 🎮', 'Assistir 📺', 'Passear 🚶‍♂️', 'Ouvir música 🎧'],
    correctIndex: 0,
  },
  {
    question: 'O que eu faria num dia perfeito?',
    options: ['Ficar contigo ❤️', 'Sair com amigos 🧑‍🤝‍🧑', 'Descansar 😴', 'Viajar ✈️'],
    correctIndex: 0,
  },
  {
    question: 'Qual dessas coisas eu mais odeio?',
    options: ['Mentiras 🤥', 'Atrasos ⏰', 'Desorganização 😤', 'Barulho 🔊'],
    correctIndex: 0,
  },
  {
    question: 'Qual é o meu estilo de roupa?',
    options: ['Casual 👕', 'Elegante 🤵', 'Desportivo 🏃‍♂️', 'Misturado 😅'],
    correctIndex: 0,
  },
  {
    question: 'Qual dessas comidas eu escolheria sempre?',
    options: ['Pizza 🍕', 'Hambúrguer 🍔', 'Churrasco 🍖', 'Frango 🍗'],
    correctIndex: 2,
  },
  {
    question: 'Se eu pudesse mudar algo na minha vida, seria…',
    options: ['Dinheiro 💰', 'Tempo ⏳', 'Trabalho 💼', 'Nada 😌'],
    correctIndex: 0,
  },
  {
    question: 'Qual dessas coisas eu faria contigo agora?',
    options: ['Ver filme 🎬', 'Comer 🍔', 'Conversar 💬', 'Dormir 😴'],
    correctIndex: 0,
  },
  {
    question: 'Qual dessas qualidades eu mais admiro nas pessoas?',
    options: ['Sinceridade 🤝', 'Humildade 🙏', 'Inteligência 🧠', 'Coragem 💪'],
    correctIndex: 0,
  },
  {
    question: 'Qual é o meu maior objetivo agora?',
    options: ['Ganhar dinheiro 💰', 'Crescer na vida 📈', 'Ser feliz ❤️', 'Ajudar família 👨‍👩‍👧'],
    correctIndex: 1,
  },
  {
    question: 'O que eu faço quando estou entediado?',
    options: ['Uso o telemóvel 📱', 'Durmo 😴', 'Saio 🚶‍♂️', 'Como 🍔'],
    correctIndex: 0,
  },
  {
    question: 'Qual dessas coisas eu mais gosto em um dia?',
    options: ['Boa comida 🍛', 'Boa companhia ❤️', 'Descanso 😴', 'Diversão 😂'],
    correctIndex: 1,
  },
  {
    question: 'Se eu pudesse aprender algo novo, seria…',
    options: ['Programação 💻', 'Música 🎧', 'Negócios 💼', 'Idiomas 🌍'],
    correctIndex: 0,
  },
  {
    question: 'O que eu mais gosto de fazer à noite?',
    options: ['Ver filmes 🎬', 'Conversar 💬', 'Dormir 😴', 'Mexer no telemóvel 📱'],
    correctIndex: 3,
  }
];

export default function GameView({ user, socket, onMinimize }: { user: any; socket: Socket; onMinimize: (roomId: string) => void }) {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [room, setRoom] = useState<any>(null);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState('0');
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [questionCount, setQuestionCount] = useState(1);

  useEffect(() => {
    const pendingQuestion = (location.state as any)?.pendingQuestion;
    if (pendingQuestion) {
      setCurrentQuestion(pendingQuestion);
    }

    socket.emit('join_room', { roomId, userId: user.id });

    socket.on('room_update', (payload) => {
      const updatedRoom = payload?.room;
      setRoom(updatedRoom);
      if (!currentQuestion && updatedRoom?.current_question_id) {
        const questionId = updatedRoom.current_question_id;
        socket.emit('request_question_by_id', { questionId }, (res: any) => {
          if (res?.ok && res.question) {
            setCurrentQuestion(res.question);
          }
        });
      }
    });

    socket.on('new_question', (q) => {
      setCurrentQuestion(q);
      setIsMinimized(false);
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

  const applySuggestion = () => {
    const suggestion = QUESTION_SUGGESTIONS[suggestionIndex];
    setQuestion(suggestion.question);
    setOptions([...suggestion.options]);
    setCorrectAnswer(String(suggestion.correctIndex));
  };

  const randomSuggestion = () => {
    const next = Math.floor(Math.random() * QUESTION_SUGGESTIONS.length);
    setSuggestionIndex(next);
    const suggestion = QUESTION_SUGGESTIONS[next];
    setQuestion(suggestion.question);
    setOptions([...suggestion.options]);
    setCorrectAnswer(String(suggestion.correctIndex));
  };

  const addAutoQuestions = () => {
    if (!roomId) return;
    QUESTION_SUGGESTIONS.slice(0, 3).forEach((suggestion) => {
      socket.emit('submit_question', {
        roomId,
        question: suggestion.question,
        options: suggestion.options,
        correctAnswer: suggestion.options[suggestion.correctIndex],
      });
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

  const passTurnToPartner = () => {
    if (!roomId || !room?.asker || !room?.responder) return;
    socket.emit('pass_turn', { roomId, userId: user.id });
    setCurrentQuestion(null);
    setQuestion('');
    setOptions(['', '', '', '']);
    setCorrectAnswer('0');
    setResult(null);
    setSelectedAnswer(null);
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
          {isAsker && (
            <button
              onClick={passTurnToPartner}
              className="ml-auto px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-500 text-white hover:bg-indigo-600"
            >
              Dar vez ao parceiro
            </button>
          )}
        </div>
      </header>

      <main className="w-full max-w-5xl md:max-w-3xl mx-auto flex-1 flex flex-col justify-center">
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
              
              <div className="space-y-4 mb-3">
                <label className="block text-sm font-medium text-slate-700">Sugestões automáticas</label>
                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <select
                    className="w-full md:w-2/3 px-3 py-2 rounded-lg border border-slate-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-200 transition-all"
                    value={suggestionIndex}
                    onChange={(e) => setSuggestionIndex(Number(e.target.value))}
                  >
                    {QUESTION_SUGGESTIONS.map((s, index) => (
                      <option key={index} value={index}>
                        {s.question}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={applySuggestion}
                      className="px-3 py-2 rounded-lg bg-rose-500 text-white text-xs font-semibold"
                    >
                      Carregar Suggestão
                    </button>
                    <button
                      type="button"
                      onClick={randomSuggestion}
                      className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold"
                    >
                      Aleatória
                    </button>
                    <button
                      type="button"
                      onClick={addAutoQuestions}
                      className="px-3 py-2 rounded-lg bg-emerald-500 text-white text-xs font-semibold"
                    >
                      + 3 Automáticas
                    </button>
                  </div>
                </div>
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
              className="bg-white p-6 rounded-3xl shadow-xl shadow-rose-100/50 border border-rose-50 text-center"
            >
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin"></div>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Aguardando...</h2>
              <p className="text-slate-500 mb-4">Seu parceiro(a) está criando uma pergunta difícil para você!</p>
              <p className="text-sm text-slate-400">A opção de minimizar não está disponível enquanto aguarda pergunta.</p>
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
