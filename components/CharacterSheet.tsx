
import React, { useState } from 'react';
import { Character, UserRole } from '../types';
import { Icons } from '../constants';

interface CharacterSheetProps {
  character: Character | null;
  currentUser: string;
  userRole: UserRole;
  tableId: string;
  onSave: (char: Character) => void;
  onCancel: () => void;
  onDelete: (id: string) => void;
}

const CharacterSheet: React.FC<CharacterSheetProps> = ({ character, currentUser, userRole, tableId, onSave, onCancel, onDelete }) => {
  const isOwner = !character || character.owner === currentUser;
  const isGM = userRole === 'GM';
  const canEdit = isOwner || isGM;

  const [name, setName] = useState(character?.name || '');
  const [hp, setHp] = useState(character?.hp || 10);
  const [maxHp, setMaxHp] = useState(character?.maxHp || 10);
  const [image, setImage] = useState(character?.image || '');
  const [abilityInput, setAbilityInput] = useState('');
  const [abilities, setAbilities] = useState<string[]>(character?.abilities || []);
  const [description, setDescription] = useState(character?.description || '');
  const [isNPC, setIsNPC] = useState(character?.isNPC || false);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: character?.id || Date.now().toString(),
      owner: character?.owner || currentUser,
      tableId,
      name, hp, maxHp, image, abilities, description,
      isNPC: isGM ? isNPC : (character?.isNPC || false)
    });
  };

  const handleDelete = () => {
    if (!character) return;
    if (confirm('Deseja realmente apagar este registro das crônicas?')) {
      onDelete(character.id);
    }
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col items-center animate-fade-in mb-20">
      <div className="w-full parchment-bg rounded-sm shadow-[0_50px_100px_rgba(0,0,0,0.8)] border-[16px] border-[#2d1b0d] relative flex flex-col md:flex-row min-h-[700px]">
        
        <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-2 bg-gradient-to-r from-black/20 via-black/40 to-transparent -translate-x-1/2 z-10"></div>
        
        {/* Lado Esquerdo: Imagem e Vida */}
        <div className="w-full md:w-2/5 p-8 flex flex-col items-center border-b md:border-b-0 md:border-r border-black/10">
          <div className="relative w-full aspect-[3/4] mb-8 group">
            <div className="absolute inset-0 border-8 border-double border-[#2d1b0d]/40 rounded-sm z-0"></div>
            <div className="relative z-10 h-full w-full bg-black/20 overflow-hidden rounded-sm shadow-inner">
              {image ? (
                <img src={image} alt="Portrait" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#2d1b0d]/10">
                  <Icons.Shield />
                </div>
              )}
              {canEdit && (
                <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity z-20">
                  <Icons.Sword />
                  <span className="text-[10px] uncial-font mt-2 text-[#c5a059]">Mudar Imagem</span>
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if(f) { const r = new FileReader(); r.onloadend = () => setImage(r.result as string); r.readAsDataURL(f); }
                  }} />
                </label>
              )}
            </div>
          </div>

          <div className="w-full space-y-6">
            <div className="text-center">
               <label className="medieval-font text-[10px] font-bold uppercase text-[#7a1212] mb-2 block tracking-widest">Vitalidade (HP)</label>
               <div className="flex flex-col items-center gap-2">
                 <div className="flex items-center justify-center gap-4">
                   <button onClick={() => setHp(Math.max(0, hp - 1))} className="w-10 h-10 rounded-full border-2 border-[#7a1212] flex items-center justify-center hover:bg-[#7a1212] transition-colors text-[#7a1212] hover:text-white font-bold">-</button>
                   
                   <div className="flex flex-col items-center">
                    <input 
                        type="number" 
                        value={hp} 
                        onChange={(e) => setHp(Number(e.target.value))}
                        disabled={!canEdit}
                        className="w-24 text-center text-4xl uncial-font bg-transparent border-none outline-none ink-text focus:ring-0"
                        style={{ appearance: 'textfield' }}
                    />
                   </div>

                   <button onClick={() => setHp(hp + 1)} className="w-10 h-10 rounded-full border-2 border-green-800 flex items-center justify-center hover:bg-green-800 transition-colors text-green-800 hover:text-white font-bold">+</button>
                 </div>
                 
                 <div className="flex items-center gap-2 text-sm medieval-font text-[#2d1b0d]/40">
                    <span>MÁXIMO:</span>
                    <input 
                      type="number" 
                      value={maxHp} 
                      onChange={(e) => setMaxHp(Number(e.target.value))}
                      disabled={!canEdit}
                      className="w-16 bg-transparent border-b border-[#2d1b0d]/20 text-center ink-text outline-none focus:border-[#c5a059]"
                    />
                 </div>
               </div>
            </div>

            {isGM && (
              <div className="bg-black/5 p-4 rounded border-2 border-purple-900/10 shadow-inner">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={isNPC} 
                    onChange={(e) => setIsNPC(e.target.checked)}
                    className="w-5 h-5 accent-purple-800"
                  />
                  <span className="medieval-font text-[10px] font-bold text-purple-900 uppercase tracking-tighter group-hover:text-purple-700 transition-colors">NPC / Monstro Epíco</span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Lado Direito: Atributos */}
        <div className="w-full md:w-3/5 p-8 md:p-12 space-y-8">
          <div>
            <input 
              type="text" 
              value={name} 
              disabled={!canEdit}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-5xl uncial-font bg-transparent border-b-2 border-[#2d1b0d]/20 outline-none text-[#7a1212] py-2 ink-text transition-all focus:border-[#7a1212]"
              placeholder="Nome do Herói ou Fera..."
            />
            <p className="text-[8px] uppercase medieval-font opacity-40 mt-1">Identidade Registrada</p>
          </div>

          <section>
            <h3 className="medieval-font font-bold text-[10px] uppercase text-[#2d1b0d] border-b border-[#2d1b0d]/10 mb-4 pb-1 tracking-[0.2em]">Poderes e Atributos</h3>
            {canEdit && (
              <div className="flex gap-2 mb-4">
                <input 
                  type="text" 
                  value={abilityInput} 
                  onChange={(e) => setAbilityInput(e.target.value)} 
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && abilityInput) {
                      setAbilities([...abilities, abilityInput]);
                      setAbilityInput('');
                    }
                  }}
                  className="flex-1 ink-text p-2 rounded text-sm medieval-font italic outline-none border-2"
                  placeholder="Invoque um novo poder..."
                />
                <button onClick={() => { if(abilityInput){ setAbilities([...abilities, abilityInput]); setAbilityInput(''); } }} className="btn-medieval px-4 rounded font-bold">+</button>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {abilities.map((a, i) => (
                <span key={i} className="bg-[#2d1b0d] text-[#c5a059] px-4 py-2 rounded-sm text-xs border border-black/40 shadow-lg flex items-center gap-2">
                  <Icons.Sword /> {a}
                  {canEdit && <button onClick={() => setAbilities(abilities.filter((_, idx) => idx !== i))} className="text-red-500 font-bold ml-2 hover:scale-125 transition-all">×</button>}
                </span>
              ))}
              {abilities.length === 0 && <p className="text-xs italic opacity-30 medieval-font">Este ser ainda não revelou seus segredos.</p>}
            </div>
          </section>

          <section>
            <h3 className="medieval-font font-bold text-[10px] uppercase text-[#2d1b0d] border-b border-[#2d1b0d]/10 mb-4 pb-1 tracking-[0.2em]">Crônicas e História</h3>
            <textarea 
              value={description} 
              disabled={!canEdit}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full ink-text p-4 rounded min-h-[220px] outline-none italic leading-relaxed border-2 shadow-inner resize-none"
              placeholder="Descreva a origem e os feitos deste ser..."
            />
          </section>

          <div className="pt-8 flex justify-between gap-6">
            <button onClick={onCancel} className="flex-1 btn-medieval py-4 rounded-sm font-bold uppercase text-[10px] tracking-[0.3em] uncial-font">Voltar</button>
            {canEdit && <button onClick={handleSave} className="flex-[2] btn-medieval py-4 rounded-sm font-bold uppercase text-[10px] tracking-[0.3em] uncial-font border-2 border-[#e5c158]">Salvar Crônica</button>}
            {character && canEdit && <button onClick={handleDelete} className="px-6 py-4 bg-[#7a1212] hover:bg-red-800 text-white rounded-sm transition-all shadow-xl"><Icons.Logout /></button>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterSheet;
