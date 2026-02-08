
import React, { useState, useEffect, useRef } from 'react';
import { Icons } from '../constants';

interface PartyVoiceProps {
  currentUser: string;
  tableId: string;
}

interface PeerConnection {
  pc: RTCPeerConnection;
  stream?: MediaStream;
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
  const [activePeers, setActivePeers] = useState<Record<string, { isSpeaking: boolean }>>({});

  const localStreamRef = useRef<MediaStream | null>(null);
  const pcsRef = useRef<Record<string, PeerConnection>>({});
  const audioElementsRef = useRef<Record<string, HTMLAudioElement>>({});
  const processedSignalsRef = useRef<Set<string>>(new Set());
  const analysersRef = useRef<Record<string, { analyser: AnalyserNode; dataArray: Uint8Array }>>({});
  const animationFrameRef = useRef<number | null>(null);

  const signalKey = `rpg_voice_signals_${tableId}`;
  const presenceKey = `rpg_voice_presence_${tableId}`;

  // Loop de detecção de voz
  const checkVoiceActivity = () => {
    const newPeerStatus: Record<string, { isSpeaking: boolean }> = {};
    
    // Checar meu próprio volume
    if (analysersRef.current['local'] && !isMuted) {
      const { analyser, dataArray } = analysersRef.current['local'];
      analyser.getByteFrequencyData(dataArray);
      const volume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      newPeerStatus['me'] = { isSpeaking: volume > 15 };
    }

    // Checar volume dos outros
    Object.keys(analysersRef.current).forEach(user => {
      if (user === 'local') return;
      const { analyser, dataArray } = analysersRef.current[user];
      analyser.getByteFrequencyData(dataArray);
      const volume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      newPeerStatus[user] = { isSpeaking: volume > 10 };
    });

    setActivePeers(prev => {
      const updated = { ...prev };
      Object.keys(newPeerStatus).forEach(user => {
        if (!updated[user] || updated[user].isSpeaking !== newPeerStatus[user].isSpeaking) {
          updated[user] = newPeerStatus[user];
        }
      });
      return updated;
    });

    animationFrameRef.current = requestAnimationFrame(checkVoiceActivity);
  };

  useEffect(() => {
    if (isJoined) {
      animationFrameRef.current = requestAnimationFrame(checkVoiceActivity);
    } else {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isJoined, isMuted]);

  // Limpa sinais antigos ao montar
  useEffect(() => {
    const signals: SignalData[] = JSON.parse(localStorage.getItem(signalKey) || '[]');
    const filtered = signals.filter(s => s.timestamp > Date.now() - 30000);
    localStorage.setItem(signalKey, JSON.stringify(filtered));
  }, [tableId]);

  useEffect(() => {
    if (!isJoined) return;

    const interval = setInterval(() => {
      const presence = JSON.parse(localStorage.getItem(presenceKey) || '{}');
      presence[currentUser] = Date.now();
      localStorage.setItem(presenceKey, JSON.stringify(presence));

      const now = Date.now();
      const online = Object.keys(presence).filter(u => u !== currentUser && now - presence[u] < 6000);
      
      // Fechar conexões de quem saiu
      Object.keys(pcsRef.current).forEach(user => {
        if (!online.includes(user)) {
          pcsRef.current[user].pc.close();
          delete pcsRef.current[user];
          audioElementsRef.current[user]?.remove();
          delete audioElementsRef.current[user];
          delete analysersRef.current[user];
          setActivePeers(prev => {
            const next = { ...prev };
            delete next[user];
            return next;
          });
        }
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [isJoined, currentUser, tableId]);

  useEffect(() => {
    const handleStorage = async (e: StorageEvent) => {
      if (!isJoined) return;
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
  }, [isJoined, currentUser, tableId]);

  const setupAnalyser = (stream: MediaStream, userId: string) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analysersRef.current[userId] = { analyser, dataArray };
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
        audio.srcObject = e.streams[0];
        audioElementsRef.current[targetUser] = audio;
        setupAnalyser(e.streams[0], targetUser);
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

  const sendSignal = (to: string, type: SignalData['type'], payload: any) => {
    const signals: SignalData[] = JSON.parse(localStorage.getItem(signalKey) || '[]');
    const newSignal: SignalData = { 
      id: Math.random().toString(36).substr(2, 9),
      from: currentUser, to, type, payload, timestamp: Date.now() 
    };
    localStorage.setItem(signalKey, JSON.stringify([...signals, newSignal]));
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
      pc.addIceCandidate(new RTCIceCandidate(signal.payload)).catch(e => console.warn(e));
    }
  };

  const startVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setupAnalyser(stream, 'local');
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
      alert("Acesso ao microfone negado. A taverna exige sua voz para entrar.");
    }
  };

  const stopVoice = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    Object.values(pcsRef.current).forEach(p => p.pc.close());
    Object.values(audioElementsRef.current).forEach(a => { a.pause(); a.remove(); });
    pcsRef.current = {};
    audioElementsRef.current = {};
    analysersRef.current = {};
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
        <span className={`text-[7px] font-bold px-2 py-0.5 rounded-full transition-all duration-500 ${isJoined ? 'bg-green-800 text-white shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-black/10 text-[#2d1b0d]/40'}`}>
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
              <button 
                onClick={toggleMute} 
                className={`p-2 rounded border transition-all duration-300 ${isMuted ? 'bg-red-800 text-white border-red-900' : 'bg-[#c5a059]/10 text-[#c5a059] border-[#c5a059]'}`}
                title={isMuted ? "Desmutar" : "Mutar"}
              >
                {isMuted ? '🔇' : '🎙️'}
              </button>
              <button onClick={stopVoice} className="flex-1 bg-red-900/10 hover:bg-red-900/20 text-red-900 border border-red-900/30 py-2 text-[8px] uppercase font-bold transition-colors">
                Sair
              </button>
            </>
          )}
        </div>

        <div className="space-y-2 mt-2">
          <p className="text-[7px] font-bold text-[#2d1b0d]/40 uppercase mb-1">Viajantes Presentes</p>
          <div className="grid grid-cols-1 gap-1.5">
            {/* Meu Status */}
            <div className={`flex justify-between items-center p-2 rounded border transition-all duration-300 ${isJoined ? 'bg-[#c5a059]/10 border-[#c5a059]/20' : 'opacity-40 border-black/5'}`}>
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${isJoined ? (isMuted ? 'bg-red-500' : 'bg-green-500') : 'bg-gray-400'}`}></div>
                <span className="text-[9px] font-bold uppercase medieval-font">Você</span>
              </div>
              <div className="flex items-center gap-2">
                {activePeers['me']?.isSpeaking && !isMuted && (
                  <div className="flex gap-0.5">
                    <div className="w-1 h-3 bg-[#c5a059] animate-[bounce_0.8s_infinite]"></div>
                    <div className="w-1 h-2 bg-[#c5a059] animate-[bounce_1s_infinite]"></div>
                    <div className="w-1 h-3 bg-[#c5a059] animate-[bounce_1.2s_infinite]"></div>
                  </div>
                )}
                <span className="text-[7px] uppercase font-bold opacity-60">
                  {isMuted ? 'Silenciado' : (isJoined ? (activePeers['me']?.isSpeaking ? 'Falando...' : 'Ouvindo') : '-')}
                </span>
              </div>
            </div>

            {/* Outros Viajantes */}
            {Object.keys(activePeers).filter(u => u !== 'me').map(peer => (
              <div key={peer} className="flex justify-between items-center p-2 bg-[#2d1b0d]/5 rounded border border-black/5 animate-fade-in">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${activePeers[peer]?.isSpeaking ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,1)]' : 'bg-green-800'}`}></div>
                  <span className="text-[9px] font-bold uppercase medieval-font truncate max-w-[90px]">{peer}</span>
                </div>
                <div className="flex items-center gap-2">
                  {activePeers[peer]?.isSpeaking && (
                    <div className="flex gap-0.5">
                      <div className="w-0.5 h-2 bg-green-600 animate-[bounce_0.6s_infinite]"></div>
                      <div className="w-0.5 h-3 bg-green-600 animate-[bounce_0.9s_infinite]"></div>
                      <div className="w-0.5 h-2 bg-green-600 animate-[bounce_0.7s_infinite]"></div>
                    </div>
                  )}
                  <span className="text-[7px] text-green-800 uppercase font-bold opacity-80">
                    {activePeers[peer]?.isSpeaking ? 'Falando' : 'Na Taverna'}
                  </span>
                </div>
              </div>
            ))}

            {isJoined && Object.keys(activePeers).length === 1 && (
              <p className="text-[8px] italic opacity-40 text-center py-2">Você está sozinho nesta mesa...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartyVoice;
