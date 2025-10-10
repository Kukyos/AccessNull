import { useState, useEffect, useCallback } from 'react';

export interface TTSSettings {
  enabled: boolean;
  rate: number;
  pitch: number;
  volume: number;
  voice: string;
}

export const useTTS = () => {
  const [settings, setSettings] = useState<TTSSettings>(() => {
    const saved = localStorage.getItem('tts_settings');
    return saved ? JSON.parse(saved) : {
      enabled: false,
      rate: 1.0,
      pitch: 1.0,
      volume: 0.8,
      voice: ''
    };
  });

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    localStorage.setItem('tts_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      setVoices(availableVoices);
      
      if (!settings.voice && availableVoices.length > 0) {
        const englishVoice = availableVoices.find(v => v.lang.startsWith('en-')) || availableVoices[0];
        setSettings(prev => ({ ...prev, voice: englishVoice.name }));
      }
    };

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
    return () => { speechSynthesis.onvoiceschanged = null; };
  }, []);

  const speak = useCallback((text: string) => {
    if (!settings.enabled || !text.trim()) return;

    speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = settings.rate;
    utterance.pitch = settings.pitch;
    utterance.volume = settings.volume;
    
    const voice = voices.find(v => v.name === settings.voice);
    if (voice) utterance.voice = voice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    speechSynthesis.speak(utterance);
    console.log('🔊 TTS:', text);
  }, [settings, voices]);

  const stop = useCallback(() => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  return {
    settings,
    setSettings,
    speak,
    stop,
    isSpeaking,
    voices
  };
};