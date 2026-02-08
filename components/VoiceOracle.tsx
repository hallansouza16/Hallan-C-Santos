import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

interface VoiceOracleProps {
  currentUser: string;
  tableId: string;
}

const VoiceOracle: React.FC<VoiceOracleProps> = ({ currentUser, tableId }) => {
  const [isActive, setIsActive] = useState(false);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Verifica se a API KEY está disponível
  const isApiKeyAvailable = process.env.API_KEY && process.env.API_KEY !== 'insira_sua_chave_aqui' && process.env.API_KEY.trim() !== '';

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.setValueAtTime(isMuted ? 0 : 1, audioContextRef.current?.currentTime || 0);
    }
  }, [isMuted]);

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const createBlob = (data: Float32Array) => {
    const int16 = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  const stopOracle = () => {
    setIsActive(false);
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();
  };

  const startOracle = async () => {
    if (!isApiKeyAvailable) {
      setError("A magia de voz requer uma Chave de API configurada no .env.");
      return;
    }

    try {
      setError(null);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;
      
      const gainNode = outputCtx.createGain();
      gainNode.gain.setValueAtTime(isMuted ? 0 : 1, outputCtx.currentTime);
      gainNode.connect(outputCtx.destination);
      gainNodeRef.current = gainNode;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } }
          },
          systemInstruction: `Você é o Oráculo do Destino em um RPG de Dark Fantasy. O jogador atual é ${currentUser}. Sua voz deve ser profunda, misteriosa e autoritária. Ouça as ações e responda de forma épica e curta.`,
        },
        callbacks: {
          onopen: () => {
            setIsActive(true);
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: createBlob(inputData) });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              setIsModelSpeaking(true);
              const ctx = audioContextRef.current!;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(gainNodeRef.current!);
              source.onended = () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setIsModelSpeaking(false);
              };
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsModelSpeaking(false);
            }
          },
          onclose: () => setIsActive(false),
          onerror: (e) => {
            console.error(e);
            setError("O Oráculo silenciou-se inesperadamente.");
            setIsActive(false);
          }
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
      setError("Falha ao invocar o Oráculo.");
    }
  };

  return (
    <div className="parchment-bg p-4 rounded-lg border-2 border-[#c5a059] shadow-xl space-y-4 animate-fade-in relative overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#2d1b0d]/10 pb-2">
        <h3 className="uncial-font text-[10px] text-[#7a1212] flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-600 animate-pulse' : 'bg-gray-400'}`}></span>
          Narrador Místico
        </h3>
        <div className="flex items-center gap-2">
          {isActive && (
            <button 
              onClick={() => setIsMuted(!isMuted)} 
              className={`p-1 rounded transition-colors ${isMuted ? 'text-red-600' : 'text-[#c5a059] hover:text-[#7a1212]'}`}
              title={isMuted ? "Desmutar Oráculo" : "Mutar Oráculo"}
            >
              {isMuted ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m11 5-7 7 7 7"/><path d="M22 9l-6 6"/><path d="M16 9l6 6"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m11 5-7 7 7 7"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
              )}
            </button>
          )}
          {isActive && (
            <button onClick={stopOracle} className="text-[8px] uppercase font-bold text-red-800 hover:underline">Banir</button>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 py-2">
        {!isActive ? (
          <button 
            onClick={startOracle}
            className={`w-16 h-16 rounded-full bg-[#1a0f0a] border-4 border-[#c5a059] flex items-center justify-center text-[#c5a059] transition-transform shadow-lg group relative ${!isApiKeyAvailable ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:scale-105'}`}
          >
            {isApiKeyAvailable && <div className="group-hover:animate-ping absolute inset-0 bg-[#c5a059]/20 rounded-full"></div>}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
          </button>
        ) : (
          <div className="relative w-20 h-20 flex items-center justify-center">
             <div className={`absolute inset-0 rounded-full border-2 border-[#7a1212]/30 ${isModelSpeaking && !isMuted ? 'animate-[ping_1.5s_infinite]' : 'animate-pulse'}`}></div>
             <div className={`absolute inset-2 rounded-full border-2 border-[#7a1212]/50 ${isActive ? 'animate-[spin_8s_linear_infinite]' : ''}`}></div>
             <div className="z-10 text-[#7a1212]">
                {isModelSpeaking && !isMuted ? (
                  <svg className="animate-bounce" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10v4"/><path d="M8 6v12"/><path d="M13 8v8"/><path d="M18 10v4"/><path d="M21 12v0"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M4.93 19.07l1.41-1.41"/><path d="M17.66 6.34l1.41-1.41"/></svg>
                )}
             </div>
          </div>
        )}

        <p className="text-[8px] medieval-font uppercase text-center text-[#2d1b0d]/60 leading-tight">
          {!isApiKeyAvailable 
            ? "Narrador Offline (Sem API Key)" 
            : (!isActive ? "Fale com o Narrador" : (isModelSpeaking ? (isMuted ? "O Oráculo fala em silêncio..." : "O Oráculo profetiza...") : "O Destino escuta sua voz..."))}
        </p>

        {error && <p className="text-[7px] text-red-600 font-bold uppercase text-center px-2">{error}</p>}
      </div>
    </div>
  );
};

export default VoiceOracle;