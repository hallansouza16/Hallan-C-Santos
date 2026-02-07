
import React, { useState, useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface ActivityLogProps {
  currentUser: string;
  tableId: string;
}

const ActivityLog: React.FC<ActivityLogProps> = ({ currentUser, tableId }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [message, setMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadLogs = () => {
    const allLogs: LogEntry[] = JSON.parse(localStorage.getItem('rpg_logs') || '[]');
    setLogs(allLogs.filter(l => l.tableId === tableId).sort((a, b) => a.timestamp - b.timestamp));
  };

  useEffect(() => {
    loadLogs();
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'rpg_logs') loadLogs();
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [tableId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      tableId,
      type: 'CHAT',
      content: message,
      username: currentUser,
      timestamp: Date.now()
    };

    const allLogs = JSON.parse(localStorage.getItem('rpg_logs') || '[]');
    localStorage.setItem('rpg_logs', JSON.stringify([...allLogs, newLog]));
    setMessage('');
    loadLogs();
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <div className="bg-[#1a0f0a]/90 border-4 border-[#c5a059]/40 rounded-xl flex flex-col h-[400px] shadow-2xl animate-fade-in overflow-hidden">
      <div className="bg-[#2d1b0d] p-2 border-b border-[#c5a059]/20 flex justify-between items-center">
        <span className="uncial-font text-[9px] text-[#c5a059] tracking-widest flex items-center gap-2">
          <span>📜</span> Diário da Jornada
        </span>
        <button 
          onClick={() => { localStorage.setItem('rpg_logs', '[]'); loadLogs(); }}
          className="text-[7px] text-[#c5a059]/40 hover:text-[#c5a059] transition-colors font-bold uppercase"
        >
          Limpar
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scroll bg-[url('https://www.transparenttextures.com/patterns/pinstripe.png')]">
        {logs.map((log) => (
          <div key={log.id} className={`animate-fade-in flex flex-col ${log.type === 'SYSTEM' ? 'items-center' : ''}`}>
            {log.type === 'SYSTEM' ? (
              <span className="text-[8px] italic text-[#c5a059]/40 uppercase tracking-tighter">{log.content}</span>
            ) : (
              <div className={`max-w-[85%] p-2 rounded border ${log.username === currentUser ? 'bg-[#c5a059]/10 border-[#c5a059]/30 ml-auto' : 'bg-black/20 border-[#2d1b0d] mr-auto'}`}>
                <div className="flex justify-between items-center gap-4 mb-1 border-b border-white/5 pb-1">
                  <span className="text-[7px] font-bold text-[#c5a059] uppercase">{log.username}</span>
                  <span className="text-[6px] opacity-20 italic">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <p className="text-[10px] medieval-font text-[#e2d1b3] leading-relaxed break-words">
                  {log.type === 'DICE' && <span className="mr-1">🎲</span>}
                  {log.content}
                </p>
              </div>
            )}
          </div>
        ))}
        {logs.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-20 italic text-[10px]">
            <span>Nenhuma história contada ainda...</span>
          </div>
        )}
      </div>

      <form onSubmit={sendMessage} className="p-2 bg-[#2d1b0d] border-t border-[#c5a059]/20 flex gap-2">
        <input 
          type="text" 
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Escreva sua ação..."
          className="flex-1 bg-black/40 border-none ink-text p-2 rounded text-[10px] outline-none placeholder:text-white/20"
        />
        <button type="submit" className="bg-[#c5a059] text-[#2d1b0d] px-3 py-1 rounded font-bold text-[10px] hover:bg-[#e5c158] transition-colors">
          OK
        </button>
      </form>
    </div>
  );
};

export default ActivityLog;
