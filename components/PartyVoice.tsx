
import React, { useState, useEffect, useRef } from 'react';
// Added missing import for Icons
import { Icons } from '../constants';

interface PartyVoiceProps {
  currentUser: string;
  tableId: string;
}

interface PeerConnection {
  pc: RTCPeerConnection;
}

interface SignalData {
  id: string;
  from: string;
  to: string;
  type: 'offer' | 'answer' | 'candidate';
  payload: any;
  timestamp: number;
}

const PartyVoice: React.FC<PartyVoiceProps> = ({ currentUser, tableId }) => {
  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [activePeers, setActivePeers] = useState<string[]>([]);

  const localStreamRef = useRef<MediaStream | null>(null);
  const pcsRef = useRef<Record<string, PeerConnection>>({});
  const audioElementsRef = useRef<Record<string, HTMLAudioElement>>({});
  const processedSignalsRef = useRef<Set<string>>(new Set());

  const signalKey = `rpg_voice_signals_${tableId}`;
  const presenceKey = `rpg_voice_presence_${tableId}`;

  // Limpa sinais antigos ao montar
  useEffect(() => {
    const cleanup = () => {
      const signals: SignalData[] = JSON.parse(localStorage.getItem(signalKey) || '[]');
      const filtered = signals.filter(s => s.timestamp > Date.now() - 30000);
      localStorage.setItem(signalKey, JSON.stringify(filtered));
    };
    cleanup();
  }, [tableId]);

  useEffect(() => {
    if (!isJoined) return;

    const interval = setInterval(() => {
      // Atualizar minha presença
      const presence = JSON.parse(localStorage.getItem(presenceKey) || '{}');
      presence[currentUser] = Date.now();
      localStorage.setItem(presenceKey, JSON.stringify(presence));

      // Verificar quem está online
      const now = Date.now();
      const online = Object.keys(presence).filter(u => u !== currentUser && now - presence[u] < 6000);
      setActivePeers(online);
      
      // Fechar conexões de quem saiu
      Object.keys(pcsRef.current).forEach(user => {
        if (!online.includes(user)) {
          pcsRef.current[user].pc.close();
          delete pcsRef.current[user];
          audioElementsRef.current[user]?.remove();
          delete audioElementsRef.current[user];
        }
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [isJoined, currentUser, tableId]);

  useEffect(() => {
    const handleStorage = async (e: StorageEvent) => {
      if (e.key === signalKey && e.newValue) {
        const signals: SignalData[] = JSON.parse(e.newValue);
        const mySignals = signals.filter(s => s.to === currentUser && !processedSignalsRef.current.has(s.id));
        
        for (const signal of mySignals) {
          processedSignalsRef.current.add(signal.id);
          if (signal.type === 'offer') await handleOffer(signal);
          else if (signal.type === 'answer') await handleAnswer(signal);
          else if (signal.type === 'candidate') await handleCandidate(signal);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [currentUser, tableId]);

  const sendSignal = (to: string, type: SignalData['type'], payload: any) => {
    const signals: SignalData[] = JSON.parse(localStorage.getItem(signalKey) || '[]');
    const newSignal: SignalData = { 
      id: Math.random().toString(36).substr(2, 9),
      from: currentUser, 
      to, 
      type, 
      payload, 
      timestamp: Date.now() 
    };
    const updated = [...signals.filter(s => s.timestamp > Date.now() - 10000), newSignal];
    localStorage.setItem(signalKey, JSON.stringify(updated));
  };

  const createPC = (targetUser: string) => {
    if (pcsRef.current[targetUser]) return pcsRef.current[targetUser].pc;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal(targetUser, 'candidate', e.candidate);
    };

    pc.ontrack = (e) => {
      if (!audioElementsRef.current[targetUser]) {
        const audio = new Audio();
        audio.autoplay = true;
        audio.setAttribute('playsinline', 'true');
        audio.srcObject = e.streams[0];
        document.body.appendChild(audio); // Necessário em alguns navegadores
        audioElementsRef.current[targetUser] = audio;
      }
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    pcsRef.current[targetUser] = { pc };
    return pc;
  };

  const handleOffer = async (signal: SignalData) => {
    const pc = createPC(signal.from);
    await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    sendSignal(signal.from, 'answer', answer);
  };

  const handleAnswer = async (signal: SignalData) => {
    const pc = pcsRef.current[signal.from]?.pc;
    if (pc && pc.signalingState === 'have-local-offer') {
      await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
    }
  };

  const handleCandidate = async (signal: SignalData) => {
    const pc = pcsRef.current[signal.from]?.pc;
    if (pc && pc.remoteDescription) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(signal.payload));
      } catch (e) {
        console.warn("Erro ao adicionar candidate", e);
      }
    }
  };

  const startVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setIsJoined(true);
      
      const presence = JSON.parse(localStorage.getItem(presenceKey) || '{}');
      const now = Date.now();
      for (const user of Object.keys(presence)) {
        if (user !== currentUser && now - presence[user] < 6000) {
          const pc = createPC(user);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendSignal(user, 'offer', offer);
        }
      }
    } catch (err) {
      alert("Acesso ao microfone negado. Verifique as permissões do navegador.");
    }
  };

  const stopVoice = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    Object.values(pcsRef.current).forEach(p => p.pc.close());
    Object.values(audioElementsRef.current).forEach(a => { a.pause(); a.remove(); });
    pcsRef.current = {};
    audioElementsRef.current = {};
    localStreamRef.current = null;
    setIsJoined(false);
    
    const presence = JSON.parse(localStorage.getItem(presenceKey) || '{}');
    delete presence[currentUser];
    localStorage.setItem(presenceKey, JSON.stringify(presence));
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const newState = !isMuted;
      localStreamRef.current.getAudioTracks().forEach(t => t.enabled = !newState);
      setIsMuted(newState);
    }
  };

  return (
    <div className="parchment-bg p-4 rounded-lg border-2 border-[#2d1b0d]/30 shadow-xl space-y-4 animate-fade-in">
      <div className="flex items-center justify-between border-b border-[#2d1b0d]/10 pb-2">
        <h3 className="uncial-font text-[10px] text-[#2d1b0d] flex items-center gap-2">
          <span>🍻</span> Taverna de Voz
        </h3>
        <span className={`text-[7px] font-bold px-2 py-0.5 rounded-full ${isJoined ? 'bg-green-800 text-white' : 'bg-black/10 text-[#2d1b0d]/40'}`}>
          {isJoined ? 'CONECTADO' : 'OFFLINE'}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          {!isJoined ? (
            <button onClick={startVoice} className="flex-1 btn-medieval py-2 text-[8px] uppercase tracking-widest font-bold flex items-center justify-center gap-2">
              <Icons.Sword /> Entrar na Taverna
            </button>
          ) : (
            <>
              <button onClick={toggleMute} className={`p-2 rounded border transition-all ${isMuted ? 'bg-red-800 text-white border-red-900' : 'bg-green-800/10 text-green-800 border-green-800'}`}>
                {isMuted ? '🔇' : '🎙️'}
              </button>
              <button onClick={stopVoice} className="flex-1 bg-red-900/10 hover:bg-red-900/20 text-red-900 border border-red-900/30 py-2 text-[8px] uppercase font-bold">
                Sair
              </button>
            </>
          )}
        </div>

        <div className="space-y-2 mt-2">
          <p className="text-[7px] font-bold text-[#2d1b0d]/40 uppercase mb-1">Viajantes</p>
          <div className="grid grid-cols-1 gap-1">
            <div className={`flex justify-between p-1.5 rounded border ${isJoined ? 'bg-[#c5a059]/10' : 'opacity-40'}`}>
              <span className="text-[9px] font-bold uppercase medieval-font">Você</span>
              <span className="text-[7px] uppercase">{isMuted ? 'Mudo' : (isJoined ? 'Ativo' : '-')}</span>
            </div>
            {activePeers.map(peer => (
              <div key={peer} className="flex justify-between p-1.5 bg-[#2d1b0d]/5 rounded border">
                <span className="text-[9px] font-bold uppercase medieval-font truncate max-w-[80px]">{peer}</span>
                <span className="text-[7px] text-green-800 uppercase font-bold">Ouvindo</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartyVoice;
