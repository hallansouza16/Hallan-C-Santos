
import React, { useState, useEffect } from 'react';
import { TableRoom } from '../types';
import { Icons } from '../constants';

interface RoomManagerProps {
  currentUser: string;
  onJoin: (table: TableRoom) => void;
}

const RoomManager: React.FC<RoomManagerProps> = ({ currentUser, onJoin }) => {
  const [tables, setTables] = useState<TableRoom[]>([]);
  const [newTableName, setNewTableName] = useState('');
  const [joinId, setJoinId] = useState('');

  // Carrega mesas ao montar e quando o storage muda
  const loadTables = () => {
    const saved = JSON.parse(localStorage.getItem('rpg_tables') || '[]');
    setTables(saved);
  };

  useEffect(() => {
    loadTables();
    window.addEventListener('storage', loadTables);
    return () => window.removeEventListener('storage', loadTables);
  }, []);

  const createTable = () => {
    const name = newTableName.trim();
    if (!name) {
      alert("Dê um nome à sua crônica antes de fundá-la.");
      return;
    }

    // Gera um ID de 6 caracteres garantidos
    const generateId = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    const newTable: TableRoom = {
      id: generateId(),
      name: name,
      gmUsername: currentUser,
      worldMessage: 'O reino aguarda seus heróis...',
      createdAt: Date.now()
    };

    // Atualiza storage
    const currentTables = JSON.parse(localStorage.getItem('rpg_tables') || '[]');
    const updated = [...currentTables, newTable];
    localStorage.setItem('rpg_tables', JSON.stringify(updated));
    
    // Força atualização em todas as abas/instâncias
    window.dispatchEvent(new Event('storage'));
    
    setNewTableName('');
    onJoin(newTable);
  };

  const joinTable = () => {
    const idToSearch = joinId.trim().toUpperCase();
    if (!idToSearch) {
      alert("Digite o código do pergaminho (ID da mesa).");
      return;
    }

    // Busca definitiva no LocalStorage
    const rawTables = localStorage.getItem('rpg_tables');
    const currentTables: TableRoom[] = rawTables ? JSON.parse(rawTables) : [];
    const table = currentTables.find(t => t.id === idToSearch);
    
    if (table) {
      onJoin(table);
    } else {
      alert(`A mesa [${idToSearch}] não foi encontrada neste navegador.\n\nLembre-se: Para jogar com amigos em computadores diferentes, o Mestre deve enviar o arquivo ".json" (Exportar Pergaminho) para você importar primeiro.`);
    }
  };

  const myTables = tables.filter(t => t.gmUsername === currentUser);

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-fade-in pb-20">
      <div className="text-center space-y-4">
        <h2 className="uncial-font text-4xl text-[#c5a059] drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">Escolha sua Mesa</h2>
        <p className="medieval-font italic text-[#e2d1b3]/60">Cada pergaminho guarda uma história única. Qual você irá escrever hoje?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Criar Mesa */}
        <div className="parchment-bg p-8 rounded-lg border-[8px] border-double border-[#2d1b0d] shadow-2xl relative">
          <div className="absolute -top-4 -left-4 w-12 h-12 bg-[#2d1b0d] rounded-full border-2 border-[#c5a059] flex items-center justify-center text-[#c5a059] shadow-xl">👑</div>
          <h3 className="uncial-font text-2xl text-[#7a1212] mb-6 border-b border-[#2d1b0d]/10 pb-2">Fundar Campanha</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-bold mb-2 text-[#2d1b0d] medieval-font">Nome da Aventura</label>
              <input 
                type="text" 
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                className="w-full ink-text p-3 rounded border-2 shadow-inner"
                placeholder="Ex: O Retorno do Dragão"
              />
            </div>
            <button 
              onClick={createTable} 
              className="btn-medieval w-full py-4 uncial-font text-sm uppercase tracking-widest hover:scale-[1.02] transition-transform active:scale-95"
            >
              Erguer o Trono (GM)
            </button>
          </div>
        </div>

        {/* Entrar em Mesa */}
        <div className="parchment-bg p-8 rounded-lg border-[8px] border-double border-[#2d1b0d] shadow-2xl relative">
          <div className="absolute -top-4 -right-4 w-12 h-12 bg-[#2d1b0d] rounded-full border-2 border-[#c5a059] flex items-center justify-center text-[#c5a059] shadow-xl">⚔️</div>
          <h3 className="uncial-font text-2xl text-[#7a1212] mb-6 border-b border-[#2d1b0d]/10 pb-2">Entrar em Mesa</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-bold mb-2 text-[#2d1b0d] medieval-font">Código da Mesa</label>
              <input 
                type="text" 
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && joinTable()}
                className="w-full ink-text p-3 rounded border-2 uppercase text-center tracking-[0.5em] font-bold text-xl"
                placeholder="XXXXXX"
                maxLength={6}
              />
            </div>
            <button 
              onClick={joinTable} 
              className="btn-medieval w-full py-4 uncial-font text-sm uppercase tracking-widest hover:scale-[1.02] transition-transform active:scale-95 border-2 border-[#c5a059]"
            >
              Viajar para Mesa
            </button>
          </div>
        </div>
      </div>

      {/* Suas Mesas Ativas */}
      <section className="space-y-6">
        <div className="flex items-center gap-4">
          <h3 className="uncial-font text-2xl text-[#c5a059] whitespace-nowrap">Seus Reinos</h3>
          <div className="h-px w-full bg-gradient-to-r from-[#c5a059]/40 to-transparent"></div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {myTables.map(t => (
            <div 
              key={t.id} 
              onClick={() => onJoin(t)} 
              className="parchment-bg p-5 rounded border-4 border-[#2d1b0d] cursor-pointer hover:border-[#c5a059] transition-all group shadow-lg hover:-translate-y-1"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="text-[#7a1212] opacity-60 group-hover:opacity-100 transition-opacity">
                  <Icons.Shield />
                </div>
                <span className="text-[10px] font-bold text-[#2d1b0d] bg-black/5 px-2 py-0.5 rounded tracking-widest group-hover:bg-[#c5a059] group-hover:text-white transition-colors">{t.id}</span>
              </div>
              <h4 className="uncial-font text-lg text-[#2d1b0d] truncate border-b border-[#2d1b0d]/10 pb-1 mb-2">{t.name}</h4>
              <div className="flex justify-between items-center mt-4">
                <span className="text-[8px] text-[#2d1b0d]/40 uppercase font-bold">Mestre: {t.gmUsername}</span>
                <span className="text-[8px] bg-[#2d1b0d] text-[#c5a059] px-2 py-1 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity">ENTRAR</span>
              </div>
            </div>
          ))}
          
          {myTables.length === 0 && (
            <div className="col-span-full py-12 border-2 border-dashed border-[#c5a059]/20 rounded-lg flex flex-col items-center justify-center space-y-2 opacity-40">
              <span className="text-4xl">🏰</span>
              <p className="medieval-font italic text-white/40">Você ainda não governa nenhum reino.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default RoomManager;
