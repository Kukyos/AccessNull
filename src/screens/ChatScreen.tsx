import { useState, useRef, useEffect } from 'react';
import { sendChatMessage } from '../services/chatService';
import { detectLanguage } from '../services/translationService';
import { SpeechRecognizer, textToSpeech } from '../services/voiceService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatScreenProps {
  onClose: () => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m NullChat, your Karunya University AI assistant. I can help you with courses, faculty, admissions, facilities, and campus services. How can I assist you today? The microphone is ready - just start speaking!',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false); // Start with recording disabled
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const speechRecognizerRef = useRef<SpeechRecognizer>(new SpeechRecognizer());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-start recording when chat opens and announce instructions
  useEffect(() => {
    // First, announce the chat instructions with TTS
    const announceInstructions = () => {
      const instructions = `
        Welcome to NullChat, your university AI assistant. 
        Nullistant voice assistant has been temporarily disabled to avoid microphone conflicts.
        
        You can now speak directly to the chat assistant. Your voice will be automatically transcribed and sent.
        After each response, the microphone will reactivate for your next question.
        
        To exit the chat and return to the main portal, say "exit", "close", or click the close button.
        This will re-enable Nullistant voice assistant for general navigation.
        
        The microphone is now ready - start speaking your question!
      `;
      
      // Use browser speech synthesis for the announcement
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(instructions);
      utterance.rate = 0.9;
      utterance.volume = 0.8;
      utterance.pitch = 1.0;
      
      utterance.onend = () => {
        console.log('📢 Chat instructions announced, recording ready for manual activation');
        // Don't auto-start recording - let user click the mic button
      };
      
      speechSynthesis.speak(utterance);
    };

    const startAutoRecording = () => {
      if (!speechRecognizerRef.current.isSupported()) {
        setIsRecording(false);
        return;
      }

      // Set up callbacks for auto-recording
      speechRecognizerRef.current.setOnTranscript((text: string) => {
        console.log('✅ Auto-transcription:', text);
        setInput(text);
        
        // Auto-send the transcribed text after a brief pause
        setTimeout(() => {
          if (text.trim() && !isLoading) {
            // Trigger send automatically
            handleAutoSend(text.trim());
          }
        }, 2000);
      });

      speechRecognizerRef.current.setOnError((error: string) => {
        console.error('❌ Auto speech recognition error:', error);
        setIsRecording(false);
        
        // Try to restart after error (like Nullistant)
        if (error !== 'not-allowed') {
          setTimeout(() => {
            if (!isLoading) {
              startAutoRecording();
            }
          }, 2000);
        }
      });

      // Start recording
      try {
        speechRecognizerRef.current.startRecording(language);
        setIsRecording(true);
        console.log('🎤 NullChat auto-recording started (Always Awake mode)');
      } catch (error) {
        console.error('Failed to start auto-recording:', error);
        setIsRecording(false);
      }
    };

    // Start with TTS announcement, then auto-recording
    const timer = setTimeout(() => {
      announceInstructions();
    }, 1000);

    return () => {
      clearTimeout(timer);
      // Stop recording when component unmounts
      if (speechRecognizerRef.current) {
        speechRecognizerRef.current.stopRecording();
      }
    };
  }, []); // Empty dependency array - only run on mount

  const handleAutoSend = async (text: string) => {
    if (!text.trim() || isLoading) return;
    
    // Check for exit commands
    const exitCommands = ['exit', 'close', 'quit', 'go back', 'back', 'return'];
    if (exitCommands.some(cmd => text.toLowerCase().includes(cmd))) {
      onClose();
      return;
    }

    await processChatMessage(text.trim());
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    await processChatMessage(input.trim());
  };

  const processChatMessage = async (messageText: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsRecording(false); // Stop recording while processing

    try {
      // Detect language from user input
      const detectedLang = detectLanguage(messageText);
      setLanguage(detectedLang);

      // Get AI response
      const response = await sendChatMessage(messageText, detectedLang);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.answer,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Speak the response using browser TTS
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(response.answer);
      utterance.rate = 0.9;
      utterance.volume = 0.8;
      utterance.lang = detectedLang === 'hi' ? 'hi-IN' : 'en-IN';
      
      utterance.onend = () => {
        console.log('📢 Response TTS complete, restarting recording');
        // Restart recording after TTS is complete
        setTimeout(() => {
          if (!isLoading) {
            restartAutoRecording();
          }
        }, 1000);
      };
      
      speechSynthesis.speak(utterance);

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      
      // Restart recording even after error
      setTimeout(() => {
        restartAutoRecording();
      }, 2000);
    } finally {
      setIsLoading(false);
    }
  };

  const restartAutoRecording = () => {
    if (speechRecognizerRef.current.isSupported() && !isRecording) {
      try {
        speechRecognizerRef.current.startRecording(language);
        setIsRecording(true);
        console.log('🎤 NullChat recording restarted after response');
      } catch (error) {
        console.error('Failed to restart recording:', error);
        setIsRecording(false);
      }
    }
  };

  const handleVoiceInput = () => {
    if (isRecording) {
      // Stop recording
      speechRecognizerRef.current.stopRecording();
      setIsRecording(false);
    } else {
      // Check if browser supports speech recognition
      if (!speechRecognizerRef.current.isSupported()) {
        const errorMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: '❌ Voice input is not supported in this browser. Please use Chrome or Edge.',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
        return;
      }

      // Set up callbacks
      speechRecognizerRef.current.setOnTranscript((text: string) => {
        console.log('✅ Transcription:', text);
        setInput(text);
        setIsRecording(false);
        // Focus the textarea so user can see the text and manually send
        textareaRef.current?.focus();
      });

      speechRecognizerRef.current.setOnError((error: string) => {
        console.error('❌ Speech recognition error:', error);
        setIsRecording(false);
        
        let errorMsg = '❌ Voice input failed. ';
        if (error === 'not-allowed') {
          errorMsg += 'Microphone access denied. Please enable microphone permissions.';
        } else if (error === 'no-speech') {
          errorMsg += 'No speech detected. Please try again.';
        } else {
          errorMsg += `Error: ${error}`;
        }
        
        const errorMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: errorMsg,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      });

      // Start recording
      try {
        speechRecognizerRef.current.startRecording(language);
        setIsRecording(true);
        console.log('🎤 Speech recognition started');
      } catch (error) {
        console.error('Failed to start recording:', error);
        const errorMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: '❌ Failed to start voice input. Please use Chrome or Edge browser.',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(10px)',
      zIndex: 10,
    }}>
      {/* Header */}
      <div style={{
        padding: '1.5rem',
        background: 'linear-gradient(135deg, #2563eb, #ea580c)',
        color: 'white',
        borderBottom: '2px solid rgba(255, 255, 255, 0.2)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
            💬 NullChat - University Assistant
          </h2>
          <p style={{ fontSize: '0.875rem', opacity: 0.9, margin: '0.25rem 0 0 0' }}>
            Ask about courses, faculty, admissions, facilities, events, and university services
          </p>
        </div>
        
        {/* Large, easy-to-hit close button */}
        <button
          data-hoverable
          onClick={onClose}
          style={{
            background: 'rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(10px)',
            border: '3px solid white',
            borderRadius: '1rem',
            padding: '1.25rem 3rem',
            color: 'white',
            fontSize: '1.5rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginTop: '1rem',
            width: '100%',
            maxWidth: '400px',
            marginLeft: 'auto',
            marginRight: 'auto',
            display: 'block',
            transition: 'all 0.2s',
          }}
          title="Close chat and return to menu"
        >
          ✕ Close Chat
        </button>
      </div>

      {/* Language Toggle */}
      <div style={{
        padding: '0.75rem 1.5rem',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        borderBottom: '1px solid rgba(37, 99, 235, 0.2)',
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Language:</span>
        <button
          onClick={() => setLanguage('en')}
          style={{
            padding: '0.25rem 0.75rem',
            borderRadius: '4px',
            border: 'none',
            backgroundColor: language === 'en' ? '#2563eb' : 'white',
            color: language === 'en' ? 'white' : '#2563eb',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
          }}
        >
          English
        </button>
        <button
          onClick={() => setLanguage('hi')}
          style={{
            padding: '0.25rem 0.75rem',
            borderRadius: '4px',
            border: 'none',
            backgroundColor: language === 'hi' ? '#2563eb' : 'white',
            color: language === 'hi' ? 'white' : '#2563eb',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
          }}
        >
          हिंदी
        </button>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}>
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              display: 'flex',
              justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '70%',
                padding: '1rem',
                borderRadius: '12px',
                backgroundColor: message.role === 'user' ? '#2563eb' : '#F8F9FA',
                color: message.role === 'user' ? 'white' : '#2C3E50',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              }}
            >
              <p style={{ 
                margin: 0, 
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
              }}>{message.content}</p>
              <span style={{
                fontSize: '0.75rem',
                opacity: 0.7,
                marginTop: '0.5rem',
                display: 'block',
              }}>
                {message.timestamp.toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '1rem',
              borderRadius: '12px',
              backgroundColor: '#F8F9FA',
              color: '#6C757D',
            }}>
              <span>Thinking...</span>
              <span className="loading-dots">...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: '1.5rem',
        backgroundColor: 'white',
        borderTop: '2px solid rgba(37, 99, 235, 0.2)',
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'flex-end',
      }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={language === 'hi' ? 'अपना सवाल लिखें...' : 'Type your question...'}
          disabled={isLoading || isRecording}
          style={{
            flex: 1,
            padding: '0.75rem',
            borderRadius: '8px',
            border: '2px solid #E0E0E0',
            fontSize: '1rem',
            resize: 'none',
            minHeight: '50px',
            maxHeight: '120px',
            fontFamily: 'inherit',
            color: '#2C3E50', // Dark text color so it's visible
            backgroundColor: 'white', // White background
          }}
          rows={2}
        />
        
        {/* Voice Button - Always Awake Mode */}
        <button
          data-hoverable
          onClick={handleVoiceInput}
          disabled={isLoading}
          style={{
            padding: '1.5rem 2rem',
            borderRadius: '12px',
            border: '3px solid',
            borderColor: isRecording ? '#22c55e' : '#ea580c',
            backgroundColor: isRecording ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 88, 12, 0.1)',
            color: isRecording ? '#22c55e' : '#ea580c',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '2.5rem',
            transition: 'all 0.2s',
            animation: isRecording ? 'pulse 1.5s infinite' : 'none',
            minWidth: '80px',
            minHeight: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
          title={isRecording ? 'Voice Always Awake - Click to pause' : 'Click to resume voice input'}
        >
          🎤
          {isRecording && (
            <div style={{
              position: 'absolute',
              bottom: '4px',
              right: '4px',
              width: '12px',
              height: '12px',
              backgroundColor: '#22c55e',
              borderRadius: '50%',
              animation: 'pulse 1s infinite'
            }} />
          )}
        </button>

        {/* Send Button */}
        <button
          data-hoverable
          onClick={handleSend}
          disabled={isLoading || !input.trim() || isRecording}
          style={{
            padding: '1.5rem 2.5rem',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: '#2563eb',
            color: 'white',
            cursor: (isLoading || !input.trim() || isRecording) ? 'not-allowed' : 'pointer',
            fontSize: '1.5rem',
            fontWeight: 'bold',
            opacity: (isLoading || !input.trim() || isRecording) ? 0.5 : 1,
            transition: 'all 0.2s',
            minWidth: '120px',
            minHeight: '80px',
          }}
        >
          {isLoading ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
};
