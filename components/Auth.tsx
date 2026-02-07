
import React, { useState } from 'react';
import { UserRole, User } from '../types';

interface AuthProps {
  onLogin: (username: string, role: UserRole) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('PLAYER');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Preencha todos os pergaminhos.');
      return;
    }

    const users: User[] = JSON.parse(localStorage.getItem('rpg_users') || '[]');

    if (isLogin) {
      const user = users.find(u => u.username === username && u.passwordHash === password);
      if (user) {
        onLogin(user.username, user.role);
      } else {
        setError('Usuário ou senha incorretos.');
      }
    } else {
      if (users.find(u => u.username === username)) {
        setError('Este nome já foi clamado.');
        return;
      }
      users.push({ username, passwordHash: password, role });
      localStorage.setItem('rpg_users', JSON.stringify(users));
      onLogin(username, role);
    }
  };

  return (
    <div className="max-w-md mx-auto parchment-bg p-8 rounded shadow-2xl border-[12px] border-double border-[#2d1b0d] animate-fade-in">
      <div className="absolute top-2 right-2 opacity-10">🛡️</div>
      <h2 className="uncial-font text-3xl text-center mb-8 border-b-2 border-[#2d1b0d]/20 pb-4 text-[#7a1212]">
        {isLogin ? 'Entrar na Taverna' : 'Novo Recruta'}
      </h2>

      {error && (
        <div className="bg-[#7a1212]/10 border-l-4 border-[#7a1212] p-3 mb-6 text-sm medieval-font italic text-[#7a1212] font-bold">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-[10px] uppercase font-bold mb-2 medieval-font text-[#2d1b0d]">Identidade do Viajante</label>
          <input 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Seu nome aqui..."
            className="w-full ink-text p-3 rounded outline-none border-2 shadow-inner"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase font-bold mb-2 medieval-font text-[#2d1b0d]">Palavra-Passe Secreta</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full ink-text p-3 rounded outline-none border-2 shadow-inner"
          />
        </div>

        {!isLogin && (
          <div className="p-4 bg-black/5 rounded border border-[#2d1b0d]/10">
            <label className="block text-[10px] uppercase font-bold mb-3 medieval-font text-[#2d1b0d]">Seu papel nesta jornada:</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="radio" checked={role === 'PLAYER'} onChange={() => setRole('PLAYER')} className="w-4 h-4 accent-[#7a1212]" />
                <span className="text-sm font-bold text-[#2d1b0d] group-hover:text-[#7a1212] transition-colors">🛡️ JOGADOR</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="radio" checked={role === 'GM'} onChange={() => setRole('GM')} className="w-4 h-4 accent-purple-800" />
                <span className="text-sm font-bold text-purple-900 group-hover:text-purple-700 transition-colors">👑 MESTRE</span>
              </label>
            </div>
          </div>
        )}

        <button type="submit" className="btn-medieval w-full py-4 rounded font-bold uppercase tracking-[0.2em] uncial-font text-sm">
          {isLogin ? 'Cruzar o Portal' : 'Prestar Juramento'}
        </button>
      </form>

      <p className="mt-8 text-center text-[10px] medieval-font uppercase tracking-widest text-[#2d1b0d]/60">
        <button onClick={() => setIsLogin(!isLogin)} className="font-bold text-[#7a1212] hover:text-red-800 underline decoration-dotted underline-offset-4">
          {isLogin ? 'Ainda não registrado? Aliste-se' : 'Já é um veterano? Faça Login'}
        </button>
      </p>
    </div>
  );
};

export default Auth;
