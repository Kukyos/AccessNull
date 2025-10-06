import React, { useState, useEffect } from 'react';
import { voiceAI } from '../services/voiceAI';

interface VoiceAIControlProps {
  onClose?: () => void;
}

export const VoiceAIControl: React.FC<VoiceAIControlProps> = ({ onClose }) => {
  const [isListening, setIsListening] = useState(false);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  const [lastAction, setLastAction] = useState<string>('');

  useEffect(() => {
    // Set up command callback
    voiceAI.onCommand((command, action) => {
      setLastAction(`"${command}" → ${action}`);
      setRecentCommands(voiceAI.getRecentCommands());
    });

    return () => {
      voiceAI.stopListening();
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      voiceAI.stopListening();
      setIsListening(false);
    } else {
      const started = voiceAI.startListening();
      if (started) {
        setIsListening(true);
      }
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
      border: '2px solid #4CAF50',
      borderRadius: '20px',
      padding: '2rem',
      color: 'white',
      minWidth: '500px',
      maxWidth: '90vw',
      zIndex: 10000,
      boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem' 
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '2rem',
          background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          🎤 Voice AI Control
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '50%',
              width: '3rem',
              height: '3rem',
              color: 'white',
              fontSize: '1.5rem',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Main Control */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <button
          onClick={toggleListening}
          style={{
            background: isListening 
              ? 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)'
              : 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
            border: 'none',
            borderRadius: '50%',
            width: '120px',
            height: '120px',
            color: 'white',
            fontSize: '3rem',
            cursor: 'pointer',
            boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
            transition: 'all 0.3s ease',
            transform: isListening ? 'scale(1.1)' : 'scale(1)'
          }}
        >
          {isListening ? '🔴' : '🎤'}
        </button>
        
        <div style={{ 
          marginTop: '1rem', 
          fontSize: '1.2rem',
          fontWeight: 'bold',
          color: isListening ? '#f44336' : '#4CAF50'
        }}>
          {isListening ? 'LISTENING...' : 'Click to Start'}
        </div>
      </div>

      {/* Commands Guide */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '10px',
        padding: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#4CAF50' }}>
          🗣️ Say These Commands:
        </h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          fontSize: '0.9rem'
        }}>
          <div>
            <strong>🖱️ Clicking:</strong>
            <ul style={{ margin: '0.5rem 0', paddingLeft: '1rem' }}>
              <li>"Click button"</li>
              <li>"Click login"</li>
              <li>"Click submit"</li>
            </ul>
          </div>
          <div>
            <strong>⌨️ Typing:</strong>
            <ul style={{ margin: '0.5rem 0', paddingLeft: '1rem' }}>
              <li>"Type hello world"</li>
              <li>"Write my name"</li>
              <li>"Type password"</li>
            </ul>
          </div>
          <div>
            <strong>🧭 Navigation:</strong>
            <ul style={{ margin: '0.5rem 0', paddingLeft: '1rem' }}>
              <li>"Scroll down"</li>
              <li>"Go back"</li>
              <li>"Refresh"</li>
            </ul>
          </div>
          <div>
            <strong>⌨️ Keys:</strong>
            <ul style={{ margin: '0.5rem 0', paddingLeft: '1rem' }}>
              <li>"Press enter"</li>
              <li>"Press escape"</li>
              <li>"Press tab"</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {(lastAction || recentCommands.length > 0) && (
        <div style={{
          background: 'rgba(76, 175, 80, 0.1)',
          borderRadius: '10px',
          padding: '1rem',
          border: '1px solid rgba(76, 175, 80, 0.3)'
        }}>
          <h4 style={{ margin: '0 0 1rem 0', color: '#4CAF50' }}>
            📋 Recent Activity:
          </h4>
          
          {lastAction && (
            <div style={{ 
              marginBottom: '1rem',
              padding: '0.5rem',
              background: 'rgba(76, 175, 80, 0.2)',
              borderRadius: '5px',
              fontSize: '0.9rem'
            }}>
              <strong>Last Action:</strong> {lastAction}
            </div>
          )}
          
          {recentCommands.length > 0 && (
            <div>
              <strong>Recent Commands:</strong>
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '0.5rem',
                marginTop: '0.5rem'
              }}>
                {recentCommands.slice(-5).map((command, index) => (
                  <span key={index} style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '15px',
                    fontSize: '0.8rem'
                  }}>
                    "{command}"
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status */}
      <div style={{ 
        textAlign: 'center',
        marginTop: '1rem',
        fontSize: '0.9rem',
        opacity: 0.8
      }}>
        {isListening ? (
          <span style={{ color: '#4CAF50' }}>
            ✅ Ready to receive voice commands
          </span>
        ) : (
          <span>
            🔇 Voice AI is offline
          </span>
        )}
      </div>
    </div>
  );
};