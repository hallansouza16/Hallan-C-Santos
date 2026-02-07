
import React from 'react';
import { Character, UserRole } from '../types';
import { Icons } from '../constants';

interface CharacterListProps {
  characters: Character[];
  currentUser: string;
  userRole: UserRole;
  onSelect: (char: Character) => void;
  onCreate: () => void;
}

const CharacterCard: React.FC<{ 
  char: Character; 
  onSelect: (char: Character) => void; 
  isMe: boolean;
  isGM: boolean;
}> = ({ char, onSelect, isMe, isGM }) => (
  <div 
    onClick={() => onSelect(char)}
    className={`relative group cursor-pointer transition-all duration-500 hover:-translate-y-4 hover:rotate-1 shrink-0 w-64 animate-fade-in`}
  >
    {/* Marcador de Dono */}
    {isMe && (
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 bg-[#c5a059] text-[#2d1b0d] text-[7px] font-bold px-3 py-1 rounded-full border border-[#2d1b0d] shadow-lg uppercase tracking-widest">
        Seu Herói
      </div>
    )}

    {/* Moldura da Carta - Estilo TCG/RPG */}
    <div className={`p-1.5 rounded-lg shadow-[0_20px_40px_rgba(0,0,0,0.7)] ${char.isNPC ? 'bg-gradient-to-b from-[#7a1212] to-[#1a0f0a]' : 'bg-gradient-to-b from-[#c5a059] via-[#2d1b0d] to-[#c5a059]'}`}>
      <div className="parchment-bg h-full rounded-md p-1 border-2 border-black/20 flex flex-col relative overflow-hidden">
        
        {/* Banner de Nome */}
        <div className={`py-1 px-3 mb-2 flex justify-between items-center ${char.isNPC ? 'bg-red-900/10' : 'bg-black/5'} border-b border-black/10`}>
          <span className="uncial-font text-[10px] text-[#2d1b0d] font-bold truncate">{char.name}</span>
          {char.isNPC && <span className="text-[7px] font-bold text-white bg-red-900 px-1.5 py-0.5 rounded">BOSS</span>}
        </div>

        {/* Retrato */}
        <div className="relative aspect-[4/3] w-full bg-[#1a0f0a] rounded border border-black/40 overflow-hidden">
          {char.image ? (
            <img src={char.image} alt={char.name} className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700" />
          ) : (
            <div className="w-full h-full flex items-center justify-center opacity-10">
              <Icons.Shield />
            </div>
          )}
          {/* Overlay de Vida */}
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-1">
             <div className="flex items-center gap-2">
                <div className="flex-1 h-1 bg-black/40 rounded-full overflow-hidden border border-white/5">
                   <div 
                    className={`h-full transition-all duration-1000 ${char.hp / char.maxHp < 0.3 ? 'bg-red-600' : 'bg-green-600'}`}
                    style={{ width: `${(char.hp / char.maxHp) * 100}%` }}
                   />
                </div>
                <span className="text-[8px] font-bold text-white">{char.hp}/{char.maxHp}</span>
             </div>
          </div>
        </div>

        {/* Habilidades Rápidas */}
        <div className="p-2 space-y-1.5 flex-1">
          <div className="flex flex-wrap gap-1">
            {char.abilities.slice(0, 3).map((a, i) => (
              <span key={i} className="text-[6px] uppercase font-bold bg-[#2d1b0d] text-[#c5a059] px-1.5 py-0.5 rounded-sm">
                {a}
              </span>
            ))}
          </div>
          <p className="text-[8px] italic opacity-60 medieval-font leading-tight line-clamp-2 mt-2">
            {char.description || 'Uma alma forjada pelo destino...'}
          </p>
        </div>

        {/* Info de Jogador */}
        <div className="mt-auto pt-1 border-t border-black/5 flex justify-between items-center px-1">
           <span className="text-[6px] font-bold text-[#2d1b0d]/40 uppercase">Viajante: {char.owner}</span>
           <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>
        </div>
      </div>
    </div>
  </div>
);

const CharacterList: React.FC<CharacterListProps> = ({ characters, currentUser, userRole, onSelect, onCreate }) => {
  const isGM = userRole === 'GM';

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Mesa de Heróis - Visual Lado a Lado */}
      <section className="relative">
        <div className="flex justify-between items-end mb-6">
          <div className="space-y-1">
            <h2 className="uncial-font text-3xl text-[#c5a059] drop-shadow-md">A Reunião do Grupo</h2>
            <p className="medieval-font text-[10px] italic text-[#e2d1b3]/40 tracking-widest uppercase">Heróis presentes na taverna</p>
          </div>
          <button 
            onClick={onCreate} 
            className="btn-medieval px-6 py-2 uncial-font text-[10px] flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
          >
            <Icons.Sword /> <span>Criar Novo Herói</span>
          </button>
        </div>

        {/* Área da Mesa (Scroll Horizontal) */}
        <div className="relative group/table">
          {/* Efeito de Gradiente nas bordas do scroll */}
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#0f0907] to-transparent z-10 pointer-events-none opacity-0 group-hover/table:opacity-100 transition-opacity"></div>
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#0f0907] to-transparent z-10 pointer-events-none opacity-0 group-hover/table:opacity-100 transition-opacity"></div>
          
          <div className="flex gap-8 overflow-x-auto pb-12 pt-6 px-4 custom-scroll snap-x">
            {characters.map(char => (
              <div key={char.id} className="snap-center">
                <CharacterCard 
                  char={char} 
                  onSelect={onSelect} 
                  isMe={char.owner === currentUser}
                  isGM={isGM}
                />
              </div>
            ))}

            {characters.length === 0 && (
              <div className="w-full h-64 flex flex-col items-center justify-center border-4 border-dashed border-[#c5a059]/10 rounded-2xl bg-[#2d1b0d]/20">
                <div className="text-4xl mb-4 opacity-20">🪑</div>
                <p className="medieval-font italic text-[#e2d1b3]/30">A mesa está vazia... Clame seu lugar na história.</p>
                <button onClick={onCreate} className="mt-4 text-[#c5a059] text-[10px] font-bold underline hover:text-white transition-colors">CRIAR MEU PRIMEIRO HERÓI</button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Seção de Mural do Mestre (Para Notas e NPCs secundários se quiser) */}
      {isGM && (
        <div className="bg-[#1a0f0a]/40 border border-purple-500/20 p-4 rounded-lg flex items-center justify-between">
           <div className="flex items-center gap-3">
              <span className="text-xl">📜</span>
              <p className="text-[9px] medieval-font text-purple-300 italic">"Mestre, você pode ver e editar todos os heróis da mesa para auxiliar na narrativa."</p>
           </div>
           <div className="flex -space-x-2">
              {characters.map((c, i) => (
                <div key={i} className="w-6 h-6 rounded-full border border-purple-400 bg-purple-900 flex items-center justify-center text-[8px] font-bold text-white shadow-lg" title={c.name}>
                  {c.name[0]}
                </div>
              ))}
           </div>
        </div>
      )}
    </div>
  );
};

export default CharacterList;
