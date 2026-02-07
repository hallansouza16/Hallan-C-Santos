
import React, { useState } from 'react';
import { TableRoom, Character } from '../types';

interface MasterPanelProps {
  onClose: () => void;
  table: TableRoom;
  onUpdateTable: (t: TableRoom) => void;
  characters: Character[];
}

const MasterPanel: React.FC<MasterPanelProps> = ({ onClose, table, onUpdateTable, characters }) => {
  const [msg, setMsg] = useState(table.worldMessage);
  const [copyStatus, setCopyStatus] = useState(false);

  const handleUpdateMessage = () => {
    onUpdateTable({ ...table, worldMessage: msg });
    alert("O mural do mundo foi atualizado.");
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(table.id).then(() => {
      setCopyStatus(true);
      setTimeout(() => setCopyStatus(false), 2000);
    });
  };

  const handleSceneryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateTable({ 
          ...table, 
          sceneryImage: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const exportTable = () => {
    const data = {
      table,
      characters: characters.filter(c => c.tableId === table.id)
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PERGAMINHO_${table.name.replace(/\s+/g, '_')}_${table.id}.json`;
    link.click();
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (imported.table && imported.characters) {
          // Atualiza Mesas
          const tables: TableRoom[] = JSON.parse(localStorage.getItem('rpg_tables') || '[]');
          const otherTables = tables.filter(t => t.id !== imported.table.id);
          localStorage.setItem('rpg_tables', JSON.stringify([...otherTables, imported.table]));

          // Atualiza Personagens
          const allChars: Character[] = JSON.parse(localStorage.getItem('rpg_characters') || '[]');
          const otherChars = allChars.filter(c => c.tableId !== imported.table.id);
          localStorage.setItem('rpg_characters', JSON.stringify([...otherChars, ...imported.characters]));

          alert("Os registros desta era foram restaurados com sucesso!");
          window.location.reload();
        }
      } catch (err) {
        alert("Erro ao ler o pergaminho. O arquivo pode estar corrompido.");
      }
    };
    reader.readAsText(file);
  };

  const clearScenery = () => {
    onUpdateTable({ ...table, sceneryImage: '' });
  };

  return (
    <div className="max-w-5xl mx-auto bg-[#1a0f0a]/95 backdrop-blur-md border-4 border-purple-900 rounded-lg p-6 md:p-8 shadow-2xl relative overflow-hidden animate-fade-in mb-20">
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-900/10 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none"></div>
      
      <div className="flex justify-between items-center mb-8 border-b border-purple-500/30 pb-4">
        <h2 className="uncial-font text-3xl text-purple-400">👑 Autoridade do Mestre</h2>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleCopyId}
            className={`text-[10px] font-bold px-3 py-1 rounded border tracking-widest transition-all duration-300 flex items-center gap-2 ${copyStatus ? 'bg-green-600 text-white border-green-400' : 'text-purple-400 bg-purple-900/20 border-purple-500/30 hover:bg-purple-900/40'}`}
          >
            {copyStatus ? '✅ COPIADO!' : `📋 COPIAR ID: ${table.id}`}
          </button>
          <button onClick={onClose} className="bg-purple-900/40 hover:bg-purple-700 px-4 py-2 rounded text-purple-200 medieval-font text-[10px] uppercase transition-colors tracking-widest border border-purple-500/30">Fechar</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Mural e Backup */}
        <div className="space-y-6">
          <div className="parchment-bg p-6 rounded border-2 border-purple-900/50 shadow-2xl flex flex-col">
            <h3 className="medieval-font font-bold text-purple-900 uppercase mb-4 tracking-widest text-xs flex items-center gap-2">
              <span>📜 Mural do Mundo</span>
            </h3>
            <textarea 
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              className="w-full ink-text p-4 text-sm italic outline-none mb-4 h-32 resize-none border-2 shadow-inner"
              placeholder="Ex: Uma névoa púrpura cobre a cidade..."
            />
            <button 
              onClick={handleUpdateMessage}
              className="w-full btn-medieval py-3 rounded medieval-font uppercase text-[10px] font-bold shadow-lg border-2 border-purple-400/30 mb-2"
            >
              Proclamar Decreto
            </button>
          </div>

          <div className="bg-purple-900/20 p-4 rounded border border-purple-500/30 space-y-3">
             <h4 className="text-[9px] text-purple-300 uppercase font-bold medieval-font tracking-widest">💾 Gestão de Dados (Online)</h4>
             <button onClick={exportTable} className="w-full py-2 bg-purple-700 hover:bg-purple-600 text-white rounded text-[9px] uppercase font-bold transition-all">Exportar Pergaminho (.json)</button>
             <label className="block w-full py-2 bg-black/40 hover:bg-black/60 text-purple-200 rounded text-[9px] uppercase font-bold text-center cursor-pointer transition-all">
               Importar Pergaminho
               <input type="file" className="hidden" accept=".json" onChange={importData} />
             </label>
             <p className="text-[7px] text-purple-300/40 italic">Exporte para salvar sua mesa ou envie o arquivo para que outros mestres possam rodar sua campanha.</p>
          </div>
        </div>

        {/* Cenário */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#2d1b0d] p-5 rounded border-2 border-purple-500/30 shadow-2xl">
            <h3 className="medieval-font font-bold text-purple-300 uppercase mb-4 tracking-widest text-xs">🖼️ Ambientação</h3>
            
            <div className="aspect-video w-full bg-black/40 rounded border-2 border-purple-500/20 overflow-hidden mb-4 relative group shadow-inner">
              {table.sceneryImage ? (
                <img src={table.sceneryImage} alt="Current Scenery" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center opacity-20">
                  <span className="text-4xl mb-2">🏰</span>
                  <span className="text-[8px] font-bold uppercase tracking-widest">Sem Cenário</span>
                </div>
              )}
              <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                <span className="text-white text-[10px] font-bold tracking-[0.2em] uncial-font">Trocar Ambiente</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleSceneryChange} />
              </label>
            </div>

            <button 
              onClick={clearScenery}
              className="w-full bg-red-900/20 hover:bg-red-900/40 text-red-300 py-2 rounded text-[9px] font-bold uppercase medieval-font transition-colors border border-red-500/30"
            >
              Resetar Ambiente
            </button>
          </div>
        </div>

        {/* Jogadores */}
        <div className="bg-black/30 border border-purple-500/20 p-5 rounded flex flex-col h-full shadow-2xl">
          <h4 className="text-[9px] text-purple-300 uppercase font-bold medieval-font mb-4 tracking-widest border-b border-purple-500/20 pb-2">Personagens Ativos</h4>
          <div className="space-y-2 overflow-y-auto pr-1 flex-1 max-h-[350px] custom-scroll">
            {characters.map((c, i) => (
              <div key={i} className="flex justify-between items-center bg-purple-900/10 p-2 rounded text-xs border border-purple-500/10">
                <div className="flex items-center gap-2">
                  <span className={c.isNPC ? 'text-purple-400' : 'text-[#c5a059]'}>{c.isNPC ? '👾' : '🛡️'}</span>
                  <span className="text-purple-100 font-bold tracking-wide truncate max-w-[100px]">{c.name}</span>
                </div>
                <div className="flex items-center gap-2">
                   <div className="bg-black/40 px-2 py-0.5 rounded text-[8px] font-bold text-red-400">{c.hp}/{c.maxHp} HP</div>
                </div>
              </div>
            ))}
            {characters.length === 0 && <p className="text-center text-[8px] opacity-20 uppercase font-bold py-10">Nenhum herói registrado.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MasterPanel;
