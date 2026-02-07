
import React, { useState, useEffect } from 'react';
import { DiceRoll, LogEntry } from '../types';
import { Icons } from '../constants';

interface DiceRollerProps {
  currentUser: string;
  tableId: string;
}

const DiceRoller: React.FC<DiceRollerProps> = ({ currentUser, tableId }) => {
  const [history, setHistory] = useState<DiceRoll[]>([]);
  const [lastResult, setLastResult] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('rpg_dice_history');
    if (saved) setHistory(JSON.parse(saved));
    
    const handleStorage = () => {
      const updated = localStorage.getItem('rpg_dice_history');
      if (updated) setHistory(JSON.parse(updated));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const roll = (type: number) => {
    setIsRolling(true);
    setLastResult(null);
    
    setTimeout(() => {
      const res = Math.floor(Math.random() * type) + 1;
      const newRoll: DiceRoll = {
        id: Date.now().toString(),
        diceType: type,
        result: res,
        username: currentUser,
        timestamp: Date.now()
      };
      
      const updated = [newRoll, ...history].slice(0, 15);
      setHistory(updated);
      setLastResult(res);
      setIsRolling(false);
      localStorage.setItem('rpg_dice_history', JSON.stringify(updated));

      // Adiciona ao Log Global da mesa
      const newLog: LogEntry = {
        id: Math.random().toString(36).substr(2, 9),
        tableId,
        type: 'DICE',
        content: `Rolou um D${type} e obteve: ${res}`,
        username: currentUser,
        timestamp: Date.now()
      };
      const allLogs = JSON.parse(localStorage.getItem('rpg_logs') || '[]');
      localStorage.setItem('rpg_logs', JSON.stringify([...allLogs, newLog]));

      window.dispatchEvent(new Event('storage'));
    }, 600);
  };

  const diceTypes = [4, 6, 8, 10, 12, 20, 100];

  return (
    <div className="bg-[#1a0f0a] border-4 border-[#c5a059] p-6 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] space-y-6 sticky top-8 animate-fade-in">
      <div className="flex items-center justify-center gap-3 border-b border-[#c5a059]/30 pb-4">
        <span className="text-[#c5a059] drop-shadow-lg"><Icons.Dice /></span>
        <h3 className="uncial-font text-[#c5a059] tracking-widest text-lg">O Destino</h3>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {diceTypes.map(d => (
          <button 
            key={d}
            onClick={() => roll(d)}
            disabled={isRolling}
            className="btn-medieval py-2 text-[10px] font-bold"
          >
            D{d}
          </button>
        ))}
      </div>

      <div className="aspect-square bg-black/40 rounded-lg border-2 border-dashed border-[#c5a059]/20 flex flex-col items-center justify-center relative overflow-hidden group shadow-inner">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')] opacity-20"></div>
        {isRolling ? (
          <div className="animate-spin text-[#c5a059] scale-150">
            <Icons.Dice />
          </div>
        ) : lastResult !== null ? (
          <div className="text-center z-10 animate-fade-in">
             <div className="text-6xl uncial-font text-[#e5c158] drop-shadow-[0_0_15px_rgba(229,193,88,0.5)]">{lastResult}</div>
             <div className="text-[8px] text-[#c5a059] uppercase font-bold medieval-font tracking-[0.3em] mt-2">Sorte Invocada</div>
          </div>
        ) : (
          <span className="text-[9px] italic opacity-30 text-[#e2d1b3] text-center px-4 uncial-font">Invoque os Dados</span>
        )}
      </div>

      <div className="space-y-3 pt-4 border-t border-[#c5a059]/10">
        <div className="flex justify-between items-center text-[10px] text-[#c5a059] uppercase font-bold medieval-font">
          <span>Últimos Feitos</span>
          <button onClick={() => { setHistory([]); localStorage.setItem('rpg_dice_history', '[]'); window.dispatchEvent(new Event('storage')); }} className="hover:text-white transition-colors">Limpar</button>
        </div>
        <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scroll">
          {history.map(roll => (
            <div key={roll.id} className="flex flex-col bg-black/30 p-2 rounded border border-[#c5a059]/10">
              <div className="flex justify-between items-center">
                <span className="text-[8px] uncial-font text-[#c5a059]">D{roll.diceType}</span>
                <span className="text-lg font-bold text-white uncial-font">{roll.result}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-[7px] text-[#c5a059]/60 font-bold uppercase">{roll.username}</span>
                <span className="text-[7px] opacity-20 italic">{new Date(roll.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DiceRoller;
