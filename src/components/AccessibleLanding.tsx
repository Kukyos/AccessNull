import React, { useEffect, useState } from 'react';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { KarunyaTheme } from '../theme/colors';

interface AccessibleLandingProps {
  onComplete: (settings: {
    voiceAssistantEnabled: boolean;
    faceTrackingEnabled: boolean;
    textToSpeechEnabled: boolean;
  }) => void;
}

export const AccessibleLanding: React.FC<AccessibleLandingProps> = ({ onComplete }) => {
  const { settings, updateSettings, speak, stopSpeaking, announceAction } = useAccessibility();
  const [hasSpokenIntro, setHasSpokenIntro] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isListening, setIsListening] = useState(false);

  // Immediate accessibility check and announcement
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasSpokenIntro) {
        // Always speak intro - assume blind user needs full guidance
        const utterance = new SpeechSynthesisUtterance(
          "Welcome to Karunya University AccessPoint. This system is optimized for blind users with voice assistant and text-to-speech enabled by default. " +
          "Say 'start' to access the accessibility menu where you can enable additional features like face tracking. " +
          "Say 'help' for available commands. All buttons are also keyboard accessible using Tab and Enter."
        );
        utterance.rate = 0.9;
        utterance.volume = 0.9;
        speechSynthesis.speak(utterance);
        setHasSpokenIntro(true);
        
        // Start listening for voice commands
        startVoiceRecognition();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [hasSpokenIntro]);

  // Start appropriate voice recognition based on current step
  useEffect(() => {
    if (currentStep === 1) {
      // Announce menu and start menu voice recognition
      const timer = setTimeout(() => {
        speak("Accessibility menu opened. You can toggle features using voice commands or buttons. Say 'help' for available commands.");
        setTimeout(() => startMenuVoiceRecognition(), 1000);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  const startVoiceRecognition = () => {
    // Check for both Chrome and Firefox speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser');
      speak("Voice recognition is not supported in this browser. Please use the buttons to navigate.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false; // Chrome works better with continuous=false
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        console.log('🎤 Listening for accessibility commands...');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
        console.log('🎯 Voice command detected:', transcript);
        
        let commandExecuted = false;
        
        if (transcript.includes('start') || transcript.includes('begin') || transcript.includes('menu')) {
          console.log('✅ Executing: Opening accessibility menu');
          announceAction('Opening accessibility menu');
          setTimeout(() => setCurrentStep(1), 500); // Small delay to ensure announcement plays
          commandExecuted = true;
        } else if (transcript.includes('disable') && transcript.includes('narrator')) {
          console.log('✅ Executing: Disabling narrator');
          announceAction('Disabling narrator');
          setTimeout(() => updateSettings({ textToSpeechEnabled: false }), 500);
          commandExecuted = true;
        } else if (transcript.includes('help')) {
          console.log('✅ Executing: Showing help');
          speak("Available commands: Say 'start' to open menu, 'disable narrator' to turn off voice, or use buttons on screen.");
          commandExecuted = true;
        } else {
          console.log('❓ Unknown command:', transcript);
          speak("I didn't understand that command. Say 'help' for available commands.");
        }
        
        // Restart recognition after command execution (only if still on landing)
        if (!commandExecuted || currentStep === 0) {
          setTimeout(() => {
            if (currentStep === 0) {
              console.log('🔄 Restarting voice recognition...');
              startVoiceRecognition();
            }
          }, commandExecuted ? 2000 : 1000);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Voice recognition error:', event.error);
        setIsListening(false);
        
        // Handle specific Chrome errors
        if (event.error === 'not-allowed') {
          speak("Microphone access denied. Please allow microphone access and refresh the page.");
        } else if (event.error === 'no-speech') {
          // Restart automatically for no-speech errors
          setTimeout(() => {
            if (currentStep === 0) {
              startVoiceRecognition();
            }
          }, 2000);
        } else {
          speak("Voice recognition error. You can still use the buttons to navigate.");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        // Restart recognition if still on landing (with delay to prevent rapid restarts)
        if (currentStep === 0) {
          setTimeout(() => startVoiceRecognition(), 2000);
        }
      };

      recognition.start();
    } catch (error) {
      console.error('Failed to start voice recognition:', error);
      speak("Voice recognition is not available. Please use the buttons to navigate.");
    }
  };

  const handleAccessibilityToggle = (feature: 'voice' | 'faceTracking' | 'textToSpeech', enabled: boolean) => {
    console.log(`🔧 Toggling ${feature} to ${enabled}`);
    announceAction(`${enabled ? 'Enabling' : 'Disabling'} ${feature}`);
    
    switch (feature) {
      case 'voice':
        updateSettings({ voiceAssistantEnabled: enabled });
        break;
      case 'faceTracking':
        updateSettings({ faceTrackingEnabled: enabled });
        break;
      case 'textToSpeech':
        updateSettings({ textToSpeechEnabled: enabled });
        break;
    }
  };

  // Voice recognition for accessibility menu
  const startMenuVoiceRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
        console.log('🎯 Menu voice command:', transcript);
        
        let commandExecuted = false;
        
        if (transcript.includes('enable') && (transcript.includes('voice') || transcript.includes('assistant'))) {
          console.log('✅ Enabling voice assistant');
          handleAccessibilityToggle('voice', true);
          commandExecuted = true;
        } else if (transcript.includes('disable') && (transcript.includes('voice') || transcript.includes('assistant'))) {
          console.log('✅ Disabling voice assistant');
          handleAccessibilityToggle('voice', false);
          commandExecuted = true;
        } else if (transcript.includes('enable') && (transcript.includes('face') || transcript.includes('tracking'))) {
          console.log('✅ Enabling face tracking');
          handleAccessibilityToggle('faceTracking', true);
          commandExecuted = true;
        } else if (transcript.includes('disable') && (transcript.includes('face') || transcript.includes('tracking'))) {
          console.log('✅ Disabling face tracking');
          handleAccessibilityToggle('faceTracking', false);
          commandExecuted = true;
        } else if (transcript.includes('enable') && (transcript.includes('speech') || transcript.includes('narrator'))) {
          console.log('✅ Enabling text-to-speech');
          handleAccessibilityToggle('textToSpeech', true);
          commandExecuted = true;
        } else if (transcript.includes('disable') && (transcript.includes('speech') || transcript.includes('narrator'))) {
          console.log('✅ Disabling text-to-speech');
          handleAccessibilityToggle('textToSpeech', false);
          commandExecuted = true;
        } else if (transcript.includes('continue') || transcript.includes('enter') || transcript.includes('portal')) {
          console.log('✅ Continuing to portal');
          handleComplete();
          commandExecuted = true;
        } else if (transcript.includes('help')) {
          speak("Available commands: Say 'enable voice assistant', 'disable face tracking', 'enable narrator', or 'continue to portal'.");
          commandExecuted = true;
        } else {
          console.log('❓ Unknown menu command:', transcript);
          speak("I didn't understand. Say 'help' for available commands, or 'continue to portal' to proceed.");
        }
        
        // Restart recognition if still in menu
        if (currentStep === 1) {
          setTimeout(() => {
            startMenuVoiceRecognition();
          }, commandExecuted ? 2000 : 1000);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Menu voice recognition error:', event.error);
        if (currentStep === 1) {
          setTimeout(() => startMenuVoiceRecognition(), 2000);
        }
      };

      recognition.onend = () => {
        if (currentStep === 1) {
          setTimeout(() => startMenuVoiceRecognition(), 1000);
        }
      };

      recognition.start();
    } catch (error) {
      console.error('Failed to start menu voice recognition:', error);
    }
  };

  const handleComplete = () => {
    announceAction('Accessibility settings saved. Entering Karunya University portal.');
    onComplete({
      voiceAssistantEnabled: settings.voiceAssistantEnabled,
      faceTrackingEnabled: settings.faceTrackingEnabled,
      textToSpeechEnabled: settings.textToSpeechEnabled
    });
  };

  const AccessibilityButton: React.FC<{
    title: string;
    description: string;
    enabled: boolean;
    onToggle: (enabled: boolean) => void;
    icon: string;
  }> = ({ title, description, enabled, onToggle, icon }) => (
    <div style={{
      background: enabled 
        ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.1))'
        : 'rgba(255, 255, 255, 0.05)',
      border: `2px solid ${enabled ? '#22c55e' : 'rgba(255, 255, 255, 0.2)'}`,
      borderRadius: '16px',
      padding: '24px',
      margin: '12px 0',
      transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
      cursor: 'pointer',
      transform: enabled ? 'scale(1.02)' : 'scale(1)',
      boxShadow: enabled 
        ? '0 8px 32px rgba(34, 197, 94, 0.3)'
        : '0 4px 20px rgba(0, 0, 0, 0.1)',
      pointerEvents: 'auto',
      zIndex: 10
    }}
    onClick={(e) => {
      console.log('AccessibilityButton clicked:', title, e);
      onToggle(!enabled);
    }}
    onMouseDown={(e) => {
      console.log('Mouse down on:', title, e);
    }}
    onMouseUp={(e) => {
      console.log('Mouse up on:', title, e);
    }}
    onPointerDown={(e) => {
      console.log('Pointer down on:', title, e);
    }}
    onMouseEnter={() => {
      console.log('Mouse enter on:', title);
      speak(`${title}. ${description}. Currently ${enabled ? 'enabled' : 'disabled'}. Click to toggle.`);
    }}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onToggle(!enabled);
      }
    }}
    role="button"
    tabIndex={0}
    aria-label={`${title}: ${enabled ? 'enabled' : 'disabled'}`}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <div style={{
          fontSize: '48px',
          filter: enabled ? 'grayscale(0%)' : 'grayscale(100%)',
          transition: 'filter 0.3s ease'
        }}>
          {icon}
        </div>
        
        <div style={{ flex: 1 }}>
          <h3 style={{
            color: 'white',
            fontSize: '24px',
            fontWeight: '600',
            margin: '0 0 8px 0'
          }}>
            {title}
          </h3>
          <p style={{
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '16px',
            margin: 0,
            lineHeight: 1.4
          }}>
            {description}
          </p>
        </div>
        
        <div style={{
          width: '60px',
          height: '32px',
          background: enabled ? '#22c55e' : 'rgba(255, 255, 255, 0.2)',
          borderRadius: '16px',
          position: 'relative',
          transition: 'background 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          padding: '2px'
        }}>
          <div style={{
            width: '28px',
            height: '28px',
            background: 'white',
            borderRadius: '50%',
            position: 'absolute',
            left: enabled ? '30px' : '2px',
            transition: 'left 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
          }} />
        </div>
      </div>
    </div>
  );

  if (currentStep === 0) {
    return (
      <div style={{
        minHeight: '100vh',
        background: KarunyaTheme.gradients.hero,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          maxWidth: '800px',
          width: '100%',
          textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          padding: '48px',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div style={{
            fontSize: '120px',
            marginBottom: '24px',
            animation: 'pulse 2s infinite'
          }}>
            ♿
          </div>
          
          <h1 style={{
            color: 'white',
            fontSize: '48px',
            fontWeight: '700',
            margin: '0 0 16px 0',
            background: `linear-gradient(135deg, ${KarunyaTheme.colors.primary.blue[400]}, ${KarunyaTheme.colors.primary.orange[400]})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            AccessPoint
          </h1>
          
          <p style={{
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '24px',
            margin: '0 0 32px 0',
            lineHeight: 1.4
          }}>
            Karunya University - Accessible Student Portal
          </p>
          
          <p style={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '18px',
            margin: '0 0 48px 0',
            lineHeight: 1.6
          }}>
            <strong>Optimized for blind users</strong><br />
            Voice assistant and narrator are enabled by default<br />
            Say <strong>"start"</strong> to configure additional features<br />
            Or press Tab and Enter to navigate with keyboard
            {isListening && (
              <span style={{
                display: 'block',
                marginTop: '16px',
                color: KarunyaTheme.colors.primary.orange[400],
                fontWeight: '600'
              }}>
                🎤 Listening for your voice...
              </span>
            )}
          </p>
          
          <button
            onClick={() => setCurrentStep(1)}
            onMouseEnter={() => speak("Open accessibility menu button")}
            style={{
              background: `linear-gradient(135deg, ${KarunyaTheme.colors.primary.blue[500]}, ${KarunyaTheme.colors.primary.blue[600]})`,
              color: 'white',
              border: 'none',
              borderRadius: '16px',
              padding: '20px 48px',
              fontSize: '24px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 8px 32px rgba(37, 99, 235, 0.4)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            🚀 Open Accessibility Menu
          </button>
          
          <style>
            {`
              @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
              }
            `}
          </style>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: KarunyaTheme.gradients.hero,
      padding: '40px 20px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '48px'
        }}>
          <h1 style={{
            color: 'white',
            fontSize: '42px',
            fontWeight: '700',
            margin: '0 0 16px 0'
          }}>
            Accessibility Settings
          </h1>
          <p style={{
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '20px',
            margin: 0
          }}>
            Configure your accessibility preferences
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '24px',
          marginBottom: '48px'
        }}>
          <div>
            <h2 style={{
              color: 'white',
              fontSize: '28px',
              fontWeight: '600',
              margin: '0 0 24px 0'
            }}>
              🎯 Core Features
            </h2>
            
            <AccessibilityButton
              title="Voice Assistant (Nullistant)"
              description="AI-powered voice commands and responses for hands-free navigation"
              enabled={settings.voiceAssistantEnabled}
              onToggle={(enabled) => handleAccessibilityToggle('voice', enabled)}
              icon="🎤"
            />
            
            <AccessibilityButton
              title="Face Tracking Cursor"
              description="Control cursor with head movements for hands-free interaction"
              enabled={settings.faceTrackingEnabled}
              onToggle={(enabled) => handleAccessibilityToggle('faceTracking', enabled)}
              icon="👁️"
            />
            
            <AccessibilityButton
              title="Text-to-Speech Narrator"
              description="Screen reader functionality with audio descriptions of all interface elements"
              enabled={settings.textToSpeechEnabled}
              onToggle={(enabled) => handleAccessibilityToggle('textToSpeech', enabled)}
              icon="🔊"
            />
          </div>
          
          <div>
            <h2 style={{
              color: 'white',
              fontSize: '28px',
              fontWeight: '600',
              margin: '0 0 24px 0'
            }}>
              ♿ Accessibility Modes
            </h2>
            
            <div style={{
              background: 'rgba(34, 197, 94, 0.1)',
              border: '2px solid #22c55e',
              borderRadius: '16px',
              padding: '24px',
              margin: '12px 0'
            }}>
              <h3 style={{
                color: '#22c55e',
                fontSize: '20px',
                fontWeight: '600',
                margin: '0 0 12px 0'
              }}>
                ✅ Mobility Support (Always Active)
              </h3>
              <p style={{
                color: 'rgba(255, 255, 255, 0.8)',
                margin: 0,
                lineHeight: 1.4
              }}>
                Larger buttons, enhanced touch targets, and face tracking support are permanently enabled for users with mobility limitations.
              </p>
            </div>
            
            <div style={{
              background: 'rgba(59, 130, 246, 0.1)',
              border: '2px solid #3b82f6',
              borderRadius: '16px',
              padding: '24px',
              margin: '12px 0'
            }}>
              <h3 style={{
                color: '#3b82f6',
                fontSize: '20px',
                fontWeight: '600',
                margin: '0 0 12px 0'
              }}>
                👁️ Visual Impairment Support
              </h3>
              <p style={{
                color: 'rgba(255, 255, 255, 0.8)',
                margin: 0,
                lineHeight: 1.4
              }}>
                Enable Text-to-Speech for full audio navigation and screen reading capabilities.
              </p>
            </div>
            
            <div style={{
              background: 'rgba(234, 88, 12, 0.1)',
              border: '2px solid #ea580c',
              borderRadius: '16px',
              padding: '24px',
              margin: '12px 0'
            }}>
              <h3 style={{
                color: '#ea580c',
                fontSize: '20px',
                fontWeight: '600',
                margin: '0 0 12px 0'
              }}>
                👂 Hearing Impairment Support
              </h3>
              <p style={{
                color: 'rgba(255, 255, 255, 0.8)',
                margin: 0,
                lineHeight: 1.4
              }}>
                Visual indicators and text-based feedback replace audio cues.
              </p>
            </div>
          </div>
        </div>

        <div style={{
          textAlign: 'center'
        }}>
          <button
            onClick={handleComplete}
            onMouseEnter={() => speak("Continue to university portal")}
            style={{
              background: `linear-gradient(135deg, ${KarunyaTheme.colors.primary.orange[500]}, ${KarunyaTheme.colors.primary.orange[600]})`,
              color: 'white',
              border: 'none',
              borderRadius: '16px',
              padding: '20px 48px',
              fontSize: '24px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 8px 32px rgba(234, 88, 12, 0.4)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            🎓 Enter University Portal
          </button>
        </div>
      </div>
    </div>
  );
};