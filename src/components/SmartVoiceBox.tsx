import React, { useState, useEffect, useRef } from 'react';

interface SpeechAnalyzer {
  analyzeCommand(text: string): Promise<{
    action: string;
    target?: string;
    confidence: number;
    explanation: string;
  }>;
}

class AICommandAnalyzer implements SpeechAnalyzer {
  async analyzeCommand(text: string) {
    const lowerText = text.toLowerCase().trim();
    
    // Click commands
    if (lowerText.includes('click')) {
      const target = lowerText.replace(/.*click\s+/g, '').replace(/button|on|the/g, '').trim();
      return {
        action: 'click',
        target: target || 'button',
        confidence: 0.9,
        explanation: `I'll click on "${target || 'the first button I find'}"`
      };
    }

    // Type commands
    if (lowerText.includes('type') || lowerText.includes('write') || lowerText.includes('enter')) {
      const textToType = lowerText.replace(/^(type|write|enter)\s*/g, '').trim();
      return {
        action: 'type',
        target: textToType,
        confidence: 0.95,
        explanation: `I'll type: "${textToType}"`
      };
    }

    // Scroll commands
    if (lowerText.includes('scroll')) {
      const direction = lowerText.includes('up') ? 'up' : 'down';
      return {
        action: 'scroll',
        target: direction,
        confidence: 0.9,
        explanation: `I'll scroll ${direction}`
      };
    }

    // Navigation commands
    if (lowerText.includes('go back') || lowerText.includes('back')) {
      return {
        action: 'navigate',
        target: 'back',
        confidence: 0.9,
        explanation: "I'll go back to the previous page"
      };
    }

    if (lowerText.includes('refresh') || lowerText.includes('reload')) {
      return {
        action: 'navigate',
        target: 'refresh',
        confidence: 0.9,
        explanation: "I'll refresh the page"
      };
    }

    // Key presses
    if (lowerText.includes('press') || lowerText.includes('hit')) {
      let key = 'Enter';
      if (lowerText.includes('enter')) key = 'Enter';
      else if (lowerText.includes('escape')) key = 'Escape';
      else if (lowerText.includes('tab')) key = 'Tab';
      else if (lowerText.includes('space')) key = ' ';
      
      return {
        action: 'keypress',
        target: key,
        confidence: 0.85,
        explanation: `I'll press the ${key} key`
      };
    }

    // Search/find commands
    if (lowerText.includes('search') || lowerText.includes('find')) {
      const searchTerm = lowerText.replace(/^(search|find)\s*(for\s*)?/g, '').trim();
      return {
        action: 'search',
        target: searchTerm,
        confidence: 0.8,
        explanation: `I'll search for "${searchTerm}"`
      };
    }

    // Default fallback
    return {
      action: 'unknown',
      target: text,
      confidence: 0.1,
      explanation: `I'm not sure what to do with: "${text}"`
    };
  }
}

interface SmartVoiceBoxProps {
  onClose?: () => void;
}

export const SmartVoiceBox: React.FC<SmartVoiceBoxProps> = ({ onClose }) => {
  const [isListening, setIsListening] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<string>('');
  
  const recognitionRef = useRef<any>(null);
  const analyzerRef = useRef(new AICommandAnalyzer());
  const silenceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event: any) => {
        let interimText = '';
        let finalText = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalText += transcript;
          } else {
            interimText += transcript;
          }
        }
        
        setCurrentText(interimText);
        
        if (finalText) {
          setFinalText(finalText);
          processCommand(finalText);
        }

        // Reset silence timer
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
        
        // Stop listening after 2 seconds of silence
        silenceTimerRef.current = setTimeout(() => {
          if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
          }
        }, 2000);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        setCurrentText('');
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setExecutionStatus(`Error: ${event.error}`);
      };
    }

    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, [isListening]);

  const processCommand = async (text: string) => {
    setIsAnalyzing(true);
    setExecutionStatus('Analyzing command...');
    
    try {
      const result = await analyzerRef.current.analyzeCommand(text);
      setAnalysisResult(result);
      
      if (result.confidence > 0.5) {
        setExecutionStatus('Executing command...');
        await executeCommand(result);
        setExecutionStatus('✅ Command executed!');
      } else {
        setExecutionStatus('❓ Command unclear, please try again');
      }
    } catch (error) {
      setExecutionStatus('❌ Execution failed');
      console.error('Command processing error:', error);
    } finally {
      setIsAnalyzing(false);
      
      // Clear status after 3 seconds
      setTimeout(() => {
        setExecutionStatus('');
        setAnalysisResult(null);
        setFinalText('');
      }, 3000);
    }
  };

  const executeCommand = async (command: any) => {
    switch (command.action) {
      case 'click':
        await handleClick(command.target);
        break;
      case 'type':
        await handleType(command.target);
        break;
      case 'scroll':
        await handleScroll(command.target);
        break;
      case 'navigate':
        await handleNavigation(command.target);
        break;
      case 'keypress':
        await handleKeyPress(command.target);
        break;
      case 'search':
        await handleSearch(command.target);
        break;
      default:
        throw new Error('Unknown command');
    }
  };

  const handleClick = async (target: string) => {
    // Find element by text content, role, or type
    let element = document.querySelector(`[aria-label*="${target}"]`) ||
                  document.querySelector(`[title*="${target}"]`) ||
                  Array.from(document.querySelectorAll('button, a, [role="button"]'))
                    .find(el => el.textContent?.toLowerCase().includes(target.toLowerCase()));

    if (!element && target === 'button') {
      element = document.querySelector('button') as Element;
    }

    if (element) {
      (element as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        (element as HTMLElement).click();
      }, 500);
    } else {
      throw new Error(`Could not find "${target}" to click`);
    }
  };

  const handleType = async (text: string) => {
    const activeElement = document.activeElement as HTMLInputElement | HTMLTextAreaElement;
    let targetElement = activeElement;

    if (!targetElement || !['INPUT', 'TEXTAREA'].includes(targetElement.tagName)) {
      targetElement = document.querySelector('input[type="text"], input[type="search"], textarea') as HTMLInputElement;
    }

    if (targetElement) {
      targetElement.focus();
      targetElement.value = text;
      targetElement.dispatchEvent(new Event('input', { bubbles: true }));
      targetElement.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      throw new Error('No text input found');
    }
  };

  const handleScroll = async (direction: string) => {
    const scrollAmount = direction === 'up' ? -400 : 400;
    window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
  };

  const handleNavigation = async (action: string) => {
    if (action === 'back') {
      window.history.back();
    } else if (action === 'refresh') {
      window.location.reload();
    }
  };

  const handleKeyPress = async (key: string) => {
    const event = new KeyboardEvent('keydown', {
      key: key,
      bubbles: true,
      cancelable: true
    });
    document.dispatchEvent(event);
  };

  const handleSearch = async (searchTerm: string) => {
    const searchInput = document.querySelector('input[type="search"], [placeholder*="search"]') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
      searchInput.value = searchTerm;
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Try to submit the search
      const searchButton = document.querySelector('button[type="submit"], [aria-label*="search"]') as HTMLElement;
      if (searchButton) {
        setTimeout(() => searchButton.click(), 500);
      }
    } else {
      throw new Error('No search input found');
    }
  };

  const startListening = () => {
    if (recognitionRef.current) {
      setIsListening(true);
      setCurrentText('');
      setFinalText('');
      setAnalysisResult(null);
      setExecutionStatus('');
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      width: '400px',
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
      border: '2px solid #4CAF50',
      borderRadius: '15px',
      padding: '1.5rem',
      color: 'white',
      zIndex: 9999,
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1rem'
      }}>
        <h3 style={{ margin: 0, color: '#4CAF50' }}>🎤 Smart Voice AI</h3>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '18px'
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Voice Control Button */}
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <button
          onClick={isListening ? stopListening : startListening}
          style={{
            background: isListening 
              ? 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)'
              : 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
            border: 'none',
            borderRadius: '50%',
            width: '60px',
            height: '60px',
            color: 'white',
            fontSize: '24px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            transform: isListening ? 'scale(1.1)' : 'scale(1)',
            boxShadow: isListening ? '0 0 20px rgba(244, 67, 54, 0.5)' : '0 4px 15px rgba(76, 175, 80, 0.3)'
          }}
        >
          {isListening ? '🔴' : '🎤'}
        </button>
      </div>

      {/* Speech Text Box */}
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '10px',
        padding: '1rem',
        minHeight: '60px',
        marginBottom: '1rem',
        border: isListening ? '2px solid #4CAF50' : '1px solid rgba(255,255,255,0.2)'
      }}>
        {isListening && (
          <div style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '0.5rem' }}>
            🎯 Listening...
          </div>
        )}
        
        {currentText && (
          <div style={{ fontSize: '1rem', opacity: 0.7, fontStyle: 'italic' }}>
            "{currentText}"
          </div>
        )}
        
        {finalText && (
          <div style={{ 
            fontSize: '1rem', 
            fontWeight: 'bold',
            color: '#4CAF50',
            marginTop: '0.5rem'
          }}>
            Final: "{finalText}"
          </div>
        )}

        {!isListening && !currentText && !finalText && (
          <div style={{ 
            fontSize: '0.9rem', 
            opacity: 0.6, 
            textAlign: 'center',
            padding: '1rem 0'
          }}>
            Click the microphone and speak your command
          </div>
        )}
      </div>

      {/* Analysis Result */}
      {analysisResult && (
        <div style={{
          background: 'rgba(76, 175, 80, 0.2)',
          borderRadius: '8px',
          padding: '0.75rem',
          marginBottom: '1rem',
          border: '1px solid rgba(76, 175, 80, 0.4)'
        }}>
          <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            <strong>🤖 AI Analysis:</strong>
          </div>
          <div style={{ fontSize: '0.8rem' }}>
            {analysisResult.explanation}
          </div>
          <div style={{ 
            fontSize: '0.7rem', 
            opacity: 0.8, 
            marginTop: '0.25rem' 
          }}>
            Confidence: {Math.round(analysisResult.confidence * 100)}%
          </div>
        </div>
      )}

      {/* Execution Status */}
      {executionStatus && (
        <div style={{
          background: executionStatus.includes('✅') 
            ? 'rgba(76, 175, 80, 0.2)' 
            : executionStatus.includes('❌') 
            ? 'rgba(244, 67, 54, 0.2)'
            : 'rgba(255, 193, 7, 0.2)',
          borderRadius: '8px',
          padding: '0.75rem',
          fontSize: '0.9rem',
          textAlign: 'center',
          border: `1px solid ${
            executionStatus.includes('✅') 
              ? 'rgba(76, 175, 80, 0.4)' 
              : executionStatus.includes('❌') 
              ? 'rgba(244, 67, 54, 0.4)'
              : 'rgba(255, 193, 7, 0.4)'
          }`
        }}>
          {executionStatus}
        </div>
      )}

      {/* Quick Commands */}
      <div style={{ 
        fontSize: '0.8rem', 
        opacity: 0.7,
        marginTop: '1rem',
        lineHeight: 1.4
      }}>
        <strong>Try saying:</strong><br />
        "Click login" • "Type hello world" • "Scroll down" • "Go back" • "Press enter"
      </div>
    </div>
  );
};