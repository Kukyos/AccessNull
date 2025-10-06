import React, { useState, useRef, useEffect } from 'react';

export const SimpleVoiceBox: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [status, setStatus] = useState('Click mic to start');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setStatus('🎤 Listening...');
        setSpokenText('');
      };
      
      recognition.onresult = (event: any) => {
        let current = '';
        for (let i = 0; i < event.results.length; i++) {
          current += event.results[i][0].transcript;
        }
        setSpokenText(current);
      };
      
      recognition.onend = () => {
        setIsListening(false);
        if (spokenText) {
          setStatus(`Heard: "${spokenText}"`);
          executeCommand(spokenText);
        } else {
          setStatus('No speech detected');
        }
      };
      
      recognitionRef.current = recognition;
    }
  }, [spokenText]);

  const executeCommand = (text: string) => {
    const lower = text.toLowerCase().trim();
    console.log('🎯 Executing command:', lower);
    
    // Help command
    if (lower.includes('help') || lower === 'help') {
      setStatus('💡 Available: "click button", "scroll down", "emergency", "go back"');
      return;
    }
    
    // Click commands - look for specific buttons first
    if (lower.includes('click') || lower.includes('press')) {
      let button = null;
      
      // Look for specific button types
      if (lower.includes('emergency') || lower.includes('red')) {
        button = document.querySelector('[style*="red"], .emergency, #emergency') as HTMLElement;
      } else if (lower.includes('help') || lower.includes('assistant')) {
        button = document.querySelector('.ai-assistant, [class*="assistant"]') as HTMLElement;
      } else {
        // Find any clickable button
        button = document.querySelector('button, [role="button"], a') as HTMLElement;
      }
      
      if (button) {
        button.click();
        setStatus(`✅ Clicked: ${button.textContent?.slice(0, 20) || 'button'}`);
      } else {
        setStatus('❌ No button found');
      }
      return;
    }
    
    // Direct button clicks by name
    if (lower.includes('emergency')) {
      const emergencyBtn = document.querySelector('[style*="red"], .emergency, #emergency') as HTMLElement;
      if (emergencyBtn) {
        emergencyBtn.click();
        setStatus('🚨 Emergency activated');
      } else {
        setStatus('❌ Emergency button not found');
      }
      return;
    }
    
    // Scroll commands
    if (lower.includes('scroll')) {
      const direction = lower.includes('up') ? -300 : 300;
      window.scrollBy({ top: direction, behavior: 'smooth' });
      setStatus(`✅ Scrolled ${direction > 0 ? 'down' : 'up'}`);
      return;
    }
    
    // Navigation commands
    if (lower.includes('back') || lower.includes('previous')) {
      window.history.back();
      setStatus('⬅️ Going back');
      return;
    }
    
    if (lower.includes('refresh') || lower.includes('reload')) {
      window.location.reload();
      setStatus('🔄 Refreshing page');
      return;
    }
    
    // If no command matched
    setStatus(`❓ "${text}" not recognized. Say "help" for commands.`);
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setIsListening(true);
      recognitionRef.current?.start();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      width: '300px',
      background: '#1a1a1a',
      border: '2px solid #00ff00',
      borderRadius: '10px',
      padding: '15px',
      color: 'white',
      zIndex: 99999,
      fontFamily: 'Arial, sans-serif'
    }}>
      <h4 style={{ margin: '0 0 10px 0', color: '#00ff00' }}>Voice Command</h4>
      
      <button
        onClick={toggleListening}
        style={{
          width: '100%',
          padding: '10px',
          background: isListening ? '#ff4444' : '#00ff00',
          color: isListening ? 'white' : 'black',
          border: 'none',
          borderRadius: '5px',
          fontSize: '16px',
          cursor: 'pointer',
          marginBottom: '10px'
        }}
      >
        {isListening ? '🔴 Stop' : '🎤 Start Listening'}
      </button>
      
      <div style={{
        background: '#333',
        padding: '10px',
        borderRadius: '5px',
        minHeight: '40px',
        marginBottom: '10px'
      }}>
        {spokenText && (
          <div style={{ color: '#ffff00' }}>
            Speaking: "{spokenText}"
          </div>
        )}
      </div>
      
      <div style={{
        fontSize: '12px',
        color: '#ccc'
      }}>
        {status}
      </div>
      
      <div style={{
        fontSize: '10px',
        marginTop: '5px',
        opacity: 0.7
      }}>
        Try: "help", "emergency", "click button", "scroll down"
      </div>
    </div>
  );
};