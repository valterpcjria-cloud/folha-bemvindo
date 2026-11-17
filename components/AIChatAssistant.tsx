import React, { useState, useRef, useEffect } from 'react';
import { X, Send, User, MessageCircle, MoreVertical, Phone, Video, Paperclip, Smile } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { startAiChat } from '../services/aiService';
import { useAuth } from '../contexts/AuthContext';
import { CONFIG } from '../config';
import { api } from '../services/mockApi';

const AIChatAssistant: React.FC = () => {
  const { user, selectedCompanyId } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>(() => {
    const saved = sessionStorage.getItem('chat_messages');
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [companyName, setCompanyName] = useState<string>('');
  const chatRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Sync messages to localStorage
  useEffect(() => {
    sessionStorage.setItem('chat_messages', JSON.stringify(messages));
  }, [messages]);

  // Fetch company name if selected
  useEffect(() => {
    if (selectedCompanyId) {
      api.getCompanies().then(res => {
        const comp = res.data?.find((c: any) => c.id === selectedCompanyId);
        if (comp) setCompanyName(comp.razao_social);
      });
    } else {
      setCompanyName('');
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    if (isOpen && !chatRef.current) {
      chatRef.current = startAiChat({
        userName: user?.nome,
        userPerfil: user?.perfil,
        companyName: companyName,
        version: CONFIG.VERSION
      });

      // Only add welcome message if history is empty
      if (messages.length === 0) {
        setTimeout(() => {
          setMessages([
            { role: 'model', text: 'Olá! Sou o Assistente IA do Sistema RH. Como posso ajudar você hoje com dúvidas sobre RH, CLT ou cálculos trabalhistas?' }
          ]);
        }, 500);
      }
    }
  }, [isOpen, user, companyName, messages.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput('');
    const newMessages = [...messages, { role: 'user' as const, text: userMsg }];
    setMessages(newMessages);
    setIsLoading(true);

    // Placeholder for streaming response
    setMessages(prev => [...prev, { role: 'model' as const, text: '' }]);

    try {
      if (!chatRef.current) {
        chatRef.current = startAiChat({
          userName: user?.nome,
          userPerfil: user?.perfil,
          companyName: companyName,
          version: CONFIG.VERSION
        });
      }

      await chatRef.current.sendStreamingMessage(userMsg, messages, (fullText: string) => {
        setMessages(prev => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          if (lastMsg && lastMsg.role === 'model') {
            lastMsg.text = fullText;
          }
          return updated;
        });
      });
    } catch (error: any) {
      console.error("Chat Error Detail:", error);
      const msg = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
      setMessages(prev => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg && lastMsg.role === 'model' && lastMsg.text === '') {
          lastMsg.text = `⚠️ Erro Técnico: ${msg}`;
        } else {
          updated.push({ role: 'model', text: `⚠️ Erro Técnico: ${msg}` });
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (location.pathname === '/' || location.pathname === '/login') {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all z-50 flex items-center justify-center animate-bounce-slow group hover:bg-blue-700 border-4 border-white"
        aria-label="Abrir Chat"
      >
        <MessageCircle size={32} strokeWidth={2} fill="white" className="text-blue-600 group-hover:rotate-12 transition-transform" />
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-sky-400 rounded-full border-2 border-white animate-pulse"></div>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:justify-end p-0 sm:p-6 backdrop-blur-sm bg-slate-900/30 animate-in fade-in duration-200">
          <div className="w-full h-full sm:w-[400px] sm:h-[600px] bg-slate-50 sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden relative border border-slate-200">

            {/* Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0 z-10 shadow-md">
              <div className="flex items-center gap-3">
                <button onClick={() => setIsOpen(false)} className="sm:hidden text-white mr-1 opacity-70 hover:opacity-100">
                  <X size={24} />
                </button>
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center overflow-hidden shadow-inner border border-blue-500">
                  <div className="w-full h-full flex items-center justify-center text-white">
                    <MessageCircle size={20} fill="currentColor" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm tracking-wide leading-none">Frimelo AI</span>
                  <p className="text-[10px] text-blue-300 mt-1 uppercase font-black tracking-widest flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></span>
                    Online
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-white/70">
                <button
                  onClick={() => {
                    if (confirm('Deseja limpar o histórico de mensagens?')) {
                      setMessages([]);
                      sessionStorage.removeItem('chat_messages');
                    }
                  }}
                  title="Limpar Histórico"
                  className="hover:bg-white/10 p-1.5 rounded-lg transition-colors"
                >
                  <MoreVertical size={18} />
                </button>
                <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1.5 rounded-lg transition-colors hidden sm:block">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 z-10 bg-slate-50">
              {messages.length === 0 && (
                <div className="flex justify-center my-4">
                  <div className="bg-blue-50 border border-blue-100 text-blue-800 text-[11px] font-medium px-4 py-2 rounded-xl shadow-sm text-center max-w-[85%]">
                    🔒 Criptografia ponta-a-ponta ativada com segurança corporativa.
                  </div>
                </div>
              )}

              {messages.map((m: any, i: number) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`
                          max-w-[85%] px-4 py-3 rounded-2xl text-[13px] leading-relaxed shadow-sm relative break-words border
                          ${m.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none border-blue-700'
                      : 'bg-white text-slate-700 rounded-tl-none border-slate-200'}
                      `}>
                    {m.text}

                    <div className={`text-[9px] text-right mt-2 select-none flex justify-end items-center gap-1 font-medium ${m.role === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {m.role === 'user' && (<span className="text-blue-300">✓✓</span>)}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="bg-white border-t border-slate-200 p-3 flex items-center gap-2 z-20 shrink-0">
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl flex items-center px-4 py-2.5 shadow-inner focus-within:border-blue-300 focus-within:bg-white transition-all">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Envie sua dúvida..."
                  className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 placeholder:text-slate-400 font-medium"
                />
              </div>
              {input.trim() ? (
                <button onClick={handleSend} className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-200 w-11 h-11 flex items-center justify-center">
                  <Send size={18} fill="white" className="ml-0.5" />
                </button>
              ) : (
                <button className="p-3 bg-slate-100 text-slate-400 rounded-xl cursor-not-allowed transition-colors w-11 h-11 flex items-center justify-center">
                  <Send size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatAssistant;
