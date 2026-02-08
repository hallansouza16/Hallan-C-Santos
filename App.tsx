
import React, { useState, useEffect } from 'react';
import { User, Character, View, UserRole, TableRoom, LogEntry } from './types';
import Auth from './components/Auth';
import CharacterList from './components/CharacterList';
import CharacterSheet from './components/CharacterSheet';
import DiceRoller from './components/DiceRoller';
import MasterPanel from './components/MasterPanel';
import RoomManager from './components/RoomManager';
import VoiceOracle from './components/VoiceOracle';
import PartyVoice from './components/PartyVoice';
import ActivityLog from './components/ActivityLog';
import { Icons } from './constants';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [view, setView] = useState<View>('LOGIN');
  const [currentTable, setCurrentTable] = useState<TableRoom | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [allCharacters, setAllCharacters] = useState<Character[]>([]);
  const [copyStatus, setCopyStatus] = useState(false);

  // Sincronização entre abas e mudanças no storage
  const refreshData = () => {
    if (currentTable) {
      const tables: TableRoom[] = JSON.parse(localStorage.getItem('rpg_tables') || '[]');
      const updatedTable = tables.find(t => t.id === currentTable.id);
      if (updatedTable) setCurrentTable(updatedTable);

      const chars: Character[] = JSON.parse(localStorage.getItem('rpg_characters') || '[]');
      setAllCharacters(chars.filter(c => c.tableId === currentTable.id));
    }
  };

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (['rpg_tables', 'rpg_characters', 'rpg_logs'].includes(e.key || '')) {
        refreshData();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [currentTable]);

  useEffect(() => {
    const savedUser = localStorage.getItem('rpg_current_user');
    if (savedUser) {
      setCurrentUser(savedUser);
      setView('ROOM_SELECT');
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [currentTable, view]);

  const handleLogin = (username: string, role: UserRole) => {
    setCurrentUser(username);
    localStorage.setItem('rpg_current_user', username);
    setView('ROOM_SELECT');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentTable(null);
    localStorage.removeItem('rpg_current_user');
    setView('LOGIN');
  };

  const handleJoinTable = (table: TableRoom) => {
    setCurrentTable(table);
    setView('LIST');
    
    // Log de entrada
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      tableId: table.id,
      type: 'SYSTEM',
      content: `${currentUser} cruzou o portal e entrou no Reino.`,
      username: 'SISTEMA',
      timestamp: Date.now()
    };
    const allLogs = JSON.parse(localStorage.getItem('rpg_logs') || '[]');
    localStorage.setItem('rpg_logs', JSON.stringify([...allLogs, newLog]));
    window.dispatchEvent(new Event('storage'));
  };

  const handleCopyId = (id: string) => {
    if (!id) return;
    navigator.clipboard.writeText(id).then(() => {
      setCopyStatus(true);
      setTimeout(() => setCopyStatus(false), 2000);
    });
  };

  const handleSaveCharacter = (char: Character) => {
    const all: Character[] = JSON.parse(localStorage.getItem('rpg_characters') || '[]');
    const existingIndex = all.findIndex(c => c.id === char.id);
    let updated = existingIndex >= 0 ? [...all] : [...all, char];
    if (existingIndex >= 0) updated[existingIndex] = char;
    localStorage.setItem('rpg_characters', JSON.stringify(updated));
    refreshData();
    setView('LIST');
  };

  const handleDeleteCharacter = (id: string) => {
    const all: Character[] = JSON.parse(localStorage.getItem('rpg_characters') || '[]');
    const updated = all.filter(c => c.id !== id);
    localStorage.setItem('rpg_characters', JSON.stringify(updated));
    refreshData();
    setView('LIST');
  };

  const handleUpdateTable = (updatedTable: TableRoom) => {
    const tables: TableRoom[] = JSON.parse(localStorage.getItem('rpg_tables') || '[]');
    const index = tables.findIndex(t => t.id === updatedTable.id);
    if (index >= 0) {
      tables[index] = updatedTable;
      localStorage.setItem('rpg_tables', JSON.stringify(tables));
      setCurrentTable(updatedTable);
    }
  };

  const userRole: UserRole = currentTable?.gmUsername === currentUser ? 'GM' : 'PLAYER';

  const backgroundStyle: React.CSSProperties = currentTable?.sceneryImage ? {
    backgroundImage: `linear-gradient(to bottom, rgba(15, 9, 7, 0.85), rgba(15, 9, 7, 0.95)), url(${currentTable.sceneryImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  } : {};

  return (
    <div className="min-h-screen bg-[#0f0907] flex flex-col items-center p-4 md:p-8 relative transition-all duration-1000" style={backgroundStyle}>
      {currentUser && (
        <div className="w-full max-w-6xl space-y-4 mb-8 z-10">
          {currentTable && (
            <div className="bg-[#2d1b0d]/90 backdrop-blur-sm border-l-4 border-[#c5a059] p-4 rounded shadow-2xl flex items-center gap-4 border border-[#c5a059]/20 animate-fade-in">
              <span className="text-2xl">📜</span>
              <div className="flex-1">
                <p className="text-[10px] uppercase font-bold text-[#c5a059] medieval-font tracking-widest">Crônicas de {currentTable.name}</p>
                <p className="italic text-[#e2d1b3] medieval-font text-sm leading-relaxed">{currentTable.worldMessage}</p>
              </div>
              <div className="flex items-center gap-2">
                <div 
                  onClick={() => handleCopyId(currentTable.id)}
                  className={`text-[10px] font-bold cursor-pointer transition-all duration-300 px-3 py-1 rounded border border-[#c5a059]/20 flex items-center gap-2 ${copyStatus ? 'bg-green-800 text-white border-green-400 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'text-[#c5a059] bg-black/40 hover:bg-black/60'}`}
                >
                  <span className="opacity-60">{copyStatus ? '✅' : '📋'}</span>
                  <span>{copyStatus ? 'COPIADO!' : `ID: ${currentTable.id}`}</span>
                </div>
              </div>
            </div>
          )}

          <header className="flex justify-between items-center border-b border-[#c5a059]/30 pb-4">
            <div className="flex items-center gap-3">
              <div className="text-[#c5a059] drop-shadow-lg hover:rotate-12 transition-transform duration-500"><Icons.Shield /></div>
              <h1 className="uncial-font text-2xl md:text-3xl text-[#c5a059] tracking-wider cursor-pointer drop-shadow-md hover:text-[#e5c158] transition-colors" onClick={() => currentTable ? setView('LIST') : setView('ROOM_SELECT')}>
                {currentTable ? currentTable.name : 'Cronistas do Reino'}
              </h1>
            </div>
            <div className="flex items-center gap-4">
              {currentUser && (
                <div className="flex flex-col items-end">
                  <span className="text-[10px] medieval-font uppercase text-[#c5a059] bg-[#2d1b0d] px-3 py-1 rounded border border-[#c5a059]/30">
                    {currentUser}
                  </span>
                  {/* Removido papel do usuário (GM/Player) conforme solicitado */}
                </div>
              )}
              {currentTable && userRole === 'GM' && (
                <button 
                  onClick={() => setView('MASTER_PANEL')}
                  className="bg-purple-900/60 hover:bg-purple-800 text-purple-100 px-4 py-2 rounded border border-purple-400/50 text-xs medieval-font transition-all shadow-lg hover:-translate-y-1 active:translate-y-0"
                >
                  👑 MESTRE
                </button>
              )}
              {currentTable && (
                <button onClick={() => setView('ROOM_SELECT')} className="p-2 bg-[#2d1b0d] hover:bg-[#42281a] text-[#c5a059] rounded border border-[#c5a059]/30 transition-all hover:scale-110" title="Mudar de Mesa">
                   <Icons.Logout />
                </button>
              )}
              <button onClick={handleLogout} className="p-2 bg-[#7a1212] hover:bg-red-800 text-white rounded shadow-xl transition-all hover:scale-110" title="Sair da Taverna"><Icons.Logout /></button>
            </div>
          </header>
        </div>
      )}

      <main className="w-full max-w-6xl flex flex-col md:flex-row gap-8 z-10 pb-20">
        <div className="flex-1 min-h-[60vh]">
          {view === 'LOGIN' && <Auth onLogin={handleLogin} />}
          {view === 'ROOM_SELECT' && <RoomManager currentUser={currentUser || ''} onJoin={handleJoinTable} />}
          {view === 'LIST' && (
            <CharacterList 
              characters={allCharacters} currentUser={currentUser || ''} userRole={userRole}
              onSelect={(c) => { setSelectedCharacter(c); setView('SHEET'); }} 
              onCreate={() => { setSelectedCharacter(null); setView('SHEET'); }} 
            />
          )}
          {view === 'SHEET' && (
            <CharacterSheet 
              character={selectedCharacter} currentUser={currentUser || ''} userRole={userRole}
              tableId={currentTable?.id || ''}
              onSave={handleSaveCharacter} onCancel={() => setView('LIST')} onDelete={handleDeleteCharacter}
            />
          )}
          {view === 'MASTER_PANEL' && userRole === 'GM' && currentTable && (
            <MasterPanel 
              onClose={() => setView('LIST')} 
              table={currentTable} 
              onUpdateTable={handleUpdateTable}
              characters={allCharacters}
            />
          )}
        </div>
        {currentUser && currentTable && view !== 'ROOM_SELECT' && view !== 'LOGIN' && (
          <aside className="w-full md:w-80 space-y-6">
            <ActivityLog currentUser={currentUser} tableId={currentTable.id} />
            <DiceRoller currentUser={currentUser} tableId={currentTable.id} />
            <VoiceOracle currentUser={currentUser} tableId={currentTable.id} />
            <PartyVoice currentUser={currentUser} tableId={currentTable.id} />
          </aside>
        )}
      </main>
    </div>
  );
};

export default App;
