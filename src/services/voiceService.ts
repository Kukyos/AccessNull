/**
 * Voice Service - Google Cloud Speech API integration
 * Speech-to-Text and Text-to-Speech for English and Hindi
 */

const GOOGLE_CLOUD_TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';
const GOOGLE_CLOUD_STT_URL = 'https://speech.googleapis.com/v1/speech:recognize';

interface VoiceConfig {
  language: 'en-IN' | 'hi-IN';
  sampleRate?: number;
}

interface TranscriptionResult {
  text: string;
  language: string;
  confidence: number;
  error?: string;
}

interface SpeechResult {
  audioUrl: string;
  duration: number;
  error?: string;
}

/**
 * Convert speech to text using Google Cloud Speech-to-Text API
 * Supports English and Hindi
 */
export async function speechToText(
  audioBlob: Blob,
  config: VoiceConfig = { language: 'en-IN' }
): Promise<TranscriptionResult> {
  try {
    const apiKey = import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY;
    
    if (!apiKey || apiKey === 'your_api_key_here') {
      return {
        text: '',
        language: config.language,
        confidence: 0,
        error: 'Google Cloud API key not configured'
      };
    }

    // Convert blob to base64
    const base64Audio = await blobToBase64(audioBlob);

    const requestBody = {
      config: {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: config.sampleRate || 16000,
        languageCode: config.language,
        enableAutomaticPunctuation: true,
      },
      audio: {
        content: base64Audio,
      },
    };

    const response = await fetch(`${GOOGLE_CLOUD_STT_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Cloud STT error:', response.status, errorText);
      return {
        text: '',
        language: config.language,
        confidence: 0,
        error: `STT API error: ${response.status}`
      };
    }

    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      const alternative = result.alternatives[0];
      
      return {
        text: alternative.transcript || '',
        language: config.language,
        confidence: alternative.confidence || 0.9,
      };
    }

    return {
      text: '',
      language: config.language,
      confidence: 0,
      error: 'No transcription results'
    };
  } catch (error) {
    console.error('Speech-to-text error:', error);
    return {
      text: '',
      language: config.language,
      confidence: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Convert text to speech using Google Cloud Text-to-Speech API
 * Returns audio URL for playback
 */
export async function textToSpeech(
  text: string,
  config: VoiceConfig = { language: 'en-IN' }
): Promise<SpeechResult> {
  try {
    const apiKey = import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY;
    
    if (!apiKey || apiKey === 'your_api_key_here') {
      return {
        audioUrl: '',
        duration: 0,
        error: 'Google Cloud API key not configured'
      };
    }

    // Map language codes to Google Cloud voice names
    const voiceMap: Record<string, string> = {
      'en-IN': 'en-IN-Wavenet-D',  // Female voice
      'hi-IN': 'hi-IN-Wavenet-D',  // Female voice
    };

    const requestBody = {
      input: { text },
      voice: {
        languageCode: config.language,
        name: voiceMap[config.language] || 'en-IN-Wavenet-D',
        ssmlGender: 'FEMALE',
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 1.0,
        pitch: 0.0,
        volumeGainDb: 0.0,
      },
    };

    const response = await fetch(`${GOOGLE_CLOUD_TTS_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Cloud TTS error:', response.status, errorText);
      return {
        audioUrl: '',
        duration: 0,
        error: `TTS API error: ${response.status}`
      };
    }

    const data = await response.json();
    
    if (data.audioContent) {
      const audioBlob = base64ToBlob(data.audioContent, 'audio/mp3');
      const audioUrl = URL.createObjectURL(audioBlob);
      
      return {
        audioUrl,
        duration: estimateAudioDuration(text),
      };
    }

    return {
      audioUrl: '',
      duration: 0,
      error: 'No audio generated'
    };
  } catch (error) {
    console.error('Text-to-speech error:', error);
    return {
      audioUrl: '',
      duration: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Browser-based Speech Recognition using Web Speech API
 * Works in Chrome/Edge without API keys!
 */
export class SpeechRecognizer {
  private recognition: any = null;
  private onTranscript: ((text: string) => void) | null = null;
  private onError: ((error: string) => void) | null = null;

  constructor() {
    // Check if browser supports Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
    }
  }

  isSupported(): boolean {
    return this.recognition !== null;
  }

  startRecording(language: 'en' | 'hi' = 'en'): void {
    if (!this.recognition) {
      throw new Error('Speech recognition not supported in this browser');
    }

    // Set language
    this.recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';

    this.recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      console.log('🎤 Transcription:', transcript);
      if (this.onTranscript) {
        this.onTranscript(transcript);
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('🎤 Recognition error:', event.error);
      if (this.onError) {
        this.onError(event.error);
      }
    };

    this.recognition.start();
    console.log('🎤 Speech recognition started');
  }

  stopRecording(): void {
    if (this.recognition) {
      this.recognition.stop();
      console.log('🎤 Speech recognition stopped');
    }
  }

  setOnTranscript(callback: (text: string) => void): void {
    this.onTranscript = callback;
  }

  setOnError(callback: (error: string) => void): void {
    this.onError = callback;
  }

  isRecording(): boolean {
    return false; // Web Speech API doesn't expose recording state easily
  }
}

/**
 * Legacy AudioRecorder for backward compatibility
 * Use SpeechRecognizer instead for better results
 */
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  async startRecording(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      
      this.mediaRecorder = new MediaRecorder(this.stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
      console.log('🎤 Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No recording in progress'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        this.cleanup();
        console.log('🎤 Recording stopped, blob size:', audioBlob.size);
        resolve(audioBlob);
      };

      this.mediaRecorder.onerror = (error) => {
        this.cleanup();
        reject(error);
      };

      this.mediaRecorder.stop();
    });
  }

  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }
}

// Helper functions
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Remove data URL prefix (e.g., "data:audio/wav;base64,")
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function estimateAudioDuration(text: string): number {
  // Rough estimate: ~150 words per minute, ~5 characters per word
  const wordCount = text.length / 5;
  const minutes = wordCount / 150;
  return minutes * 60; // Return seconds
}
