import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface AccessibilitySettings {
  // Core accessibility modes
  isBlindMode: boolean;        // Full TTS, audio navigation
  isDeafMode: boolean;         // Visual indicators, no audio
  isAmputatedMode: boolean;    // Always on - larger buttons, face tracking

  // Feature toggles (can be controlled independently)
  voiceAssistantEnabled: boolean;  // Nullistant
  faceTrackingEnabled: boolean;    // Face cursor
  textToSpeechEnabled: boolean;    // TTS narration

  // TTS settings
  speechRate: number;          // 0.5 to 2.0
  speechPitch: number;         // 0 to 2
  speechVolume: number;        // 0 to 1
  selectedVoice: string;       // Voice name

  // UI scaling
  uiScale: 'normal' | 'large' | 'extra-large';
}

export interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSettings: (updates: Partial<AccessibilitySettings>) => void;
  
  // TTS functions
  speak: (text: string, options?: SpeechSynthesisUtteranceOptions) => void;
  stopSpeaking: () => void;
  
  // Announcement functions
  announceNavigation: (section: string) => void;
  announceAction: (action: string) => void;
  announceError: (error: string) => void;
  announceSuccess: (message: string) => void;
  
  // Mode helpers
  isFullyAccessible: () => boolean;
  shouldUseAudio: () => boolean;
  shouldUseVisualIndicators: () => boolean;
}

const defaultSettings: AccessibilitySettings = {
  isBlindMode: true, // Assume blindness by default - worst case scenario
  isDeafMode: false,
  isAmputatedMode: true, // Always enabled as requested
  
  voiceAssistantEnabled: true, // Essential for blind users
  faceTrackingEnabled: false, // DISABLED by default - causes Chrome issues and user request
  textToSpeechEnabled: true, // Essential for blind users
  
  speechRate: 0.9, // Slightly slower for better comprehension
  speechPitch: 1.0,
  speechVolume: 0.9, // Louder for better audibility
  selectedVoice: '',
  
  uiScale: 'extra-large' // Maximum size for any visual elements
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

interface AccessibilityProviderProps {
  children: ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [currentUtterance, setCurrentUtterance] = useState<SpeechSynthesisUtterance | null>(null);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('accessibility_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (error) {
        console.error('Failed to parse accessibility settings:', error);
      }
    }

    // Load available voices
    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      setVoices(availableVoices);
      
      // Set default voice if none selected
      if (!settings.selectedVoice && availableVoices.length > 0) {
        const englishVoice = availableVoices.find(voice => 
          voice.lang.startsWith('en-') && voice.name.toLowerCase().includes('female')
        ) || availableVoices.find(voice => 
          voice.lang.startsWith('en-')
        ) || availableVoices[0];
        
        if (englishVoice) {
          updateSettings({ selectedVoice: englishVoice.name });
        }
      }
    };

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('accessibility_settings', JSON.stringify(settings));
  }, [settings]);

  // Auto-enable TTS when blind mode is enabled
  useEffect(() => {
    if (settings.isBlindMode && !settings.textToSpeechEnabled) {
      setSettings(prev => ({ ...prev, textToSpeechEnabled: true }));
    }
  }, [settings.isBlindMode]);

  const updateSettings = (updates: Partial<AccessibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const speak = (text: string, options: Partial<SpeechSynthesisUtteranceOptions> = {}) => {
    if (!settings.textToSpeechEnabled || !text.trim()) return;

    // Stop any current speech
    stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Apply settings
    utterance.rate = options.rate || settings.speechRate;
    utterance.pitch = options.pitch || settings.speechPitch;
    utterance.volume = options.volume || settings.speechVolume;
    
    // Set voice
    if (settings.selectedVoice) {
      const selectedVoice = voices.find(voice => voice.name === settings.selectedVoice);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }

    // Set event handlers
    utterance.onstart = () => setCurrentUtterance(utterance);
    utterance.onend = () => setCurrentUtterance(null);
    utterance.onerror = () => setCurrentUtterance(null);

    setCurrentUtterance(utterance);
    speechSynthesis.speak(utterance);

    console.log('🔊 TTS:', text);
  };

  const stopSpeaking = () => {
    speechSynthesis.cancel();
    setCurrentUtterance(null);
  };

  const announceNavigation = (section: string) => {
    if (settings.isBlindMode) {
      speak(`Navigated to ${section}`, { rate: settings.speechRate + 0.1 });
    }
  };

  const announceAction = (action: string) => {
    if (settings.isBlindMode) {
      speak(action, { rate: settings.speechRate + 0.2 });
    }
  };

  const announceError = (error: string) => {
    if (settings.isBlindMode) {
      speak(`Error: ${error}`, { 
        rate: settings.speechRate - 0.1,
        pitch: settings.speechPitch - 0.2 
      });
    }
  };

  const announceSuccess = (message: string) => {
    if (settings.isBlindMode) {
      speak(`Success: ${message}`, { 
        pitch: settings.speechPitch + 0.3 
      });
    }
  };

  const isFullyAccessible = () => {
    return settings.isBlindMode || settings.isDeafMode || settings.isAmputatedMode;
  };

  const shouldUseAudio = () => {
    return settings.textToSpeechEnabled && !settings.isDeafMode;
  };

  const shouldUseVisualIndicators = () => {
    return settings.isDeafMode || settings.isBlindMode;
  };

  const contextValue: AccessibilityContextType = {
    settings,
    updateSettings,
    speak,
    stopSpeaking,
    announceNavigation,
    announceAction,
    announceError,
    announceSuccess,
    isFullyAccessible,
    shouldUseAudio,
    shouldUseVisualIndicators
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
    </AccessibilityContext.Provider>
  );
};