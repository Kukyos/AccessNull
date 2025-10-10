import React, { useEffect, useState } from 'react';
import { ScreenReader } from '../utils/screenReader';

interface AccessibleInstructionsProps {
  onContinue: () => void;
  accessibilitySettings: {
    voiceAssistantEnabled: boolean;
    faceTrackingEnabled: boolean;
    accessibilityLevel: 'normal' | 'large' | 'extra-large';
  };
  onAccessibilityChange?: (settings: {
    voiceAssistantEnabled: boolean;
    faceTrackingEnabled: boolean;
    accessibilityLevel: 'normal' | 'large' | 'extra-large';
  }) => void;
}

export const AccessibleInstructions: React.FC<AccessibleInstructionsProps> = ({ 
  onContinue, 
  accessibilitySettings,
  onAccessibilityChange
}) => {
  const [hasSpokenIntro, setHasSpokenIntro] = useState(false);
  const [textToSpeechEnabled, setTextToSpeechEnabled] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(accessibilitySettings.voiceAssistantEnabled);
  const [faceTrackingEnabled, setFaceTrackingEnabled] = useState(accessibilitySettings.faceTrackingEnabled);
  const [isHoveringButton, setIsHoveringButton] = useState(false);
  
  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('accessibility_features', JSON.stringify({
      textToSpeechEnabled,
      voiceEnabled,
      faceTrackingEnabled
    }));
  }, [textToSpeechEnabled, voiceEnabled, faceTrackingEnabled]);

  // Immediate TTS announcement using screen reader
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasSpokenIntro) {
        const screenReader = ScreenReader.getInstance();
        screenReader.announceInstructionsPage();
        setHasSpokenIntro(true);
        setTextToSpeechEnabled(true);
      }
    }, 1000); // Slightly longer delay for better experience

    return () => clearTimeout(timer);
  }, [hasSpokenIntro]);

  // Voice commands are handled by the global Nullistant assistant

  const speak = (text: string, rate = 1.0) => {
    if (!textToSpeechEnabled) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.volume = 0.8;
    speechSynthesis.speak(utterance);
  };

  // Voice recognition is now handled by global Nullistant assistant

  const AccessibilityToggle: React.FC<{
    title: string;
    description: string;
    enabled: boolean;
    onToggle: (enabled: boolean) => void;
    icon: string;
  }> = ({ title, description, enabled, onToggle, icon }) => {
    
    const speakHoverInfo = () => {
      const screenReader = ScreenReader.getInstance();
      
      // Don't interrupt intro announcement
      if (screenReader.isIntroActive()) {
        console.log('🔊 Skipping hover TTS - intro still active');
        return;
      }

      // Create detailed TTS description based on the feature
      let detailedDescription = '';
      
      if (title.includes('Voice Assistant')) {
        detailedDescription = `Voice Assistant Nullistant. ${description}. Say commands like "start", "help", or "show academics". Currently ${enabled ? 'enabled' : 'disabled'}. Click to ${enabled ? 'disable' : 'enable'} voice commands.`;
      } else if (title.includes('Face Tracking')) {
        detailedDescription = `Face Tracking Cursor. ${description}. Move your head to control cursor, blink or open mouth to click. Currently ${enabled ? 'enabled' : 'disabled'}. Click to ${enabled ? 'disable' : 'enable'} face tracking.`;
      } else if (title.includes('Text-to-Speech')) {
        detailedDescription = `Text-to-Speech Narrator. ${description}. Automatically reads screen content aloud. Currently ${enabled ? 'enabled' : 'disabled'}. Click to ${enabled ? 'disable' : 'enable'} narrator.`;
      } else {
        detailedDescription = `${title}. ${description}. Currently ${enabled ? 'enabled' : 'disabled'}.`;
      }
      
      // Use screen reader for consistent speech management
      screenReader.speak(detailedDescription, { rate: 1.0, volume: 0.8, priority: 'low' });
      console.log('🔊 Accessibility Toggle TTS:', detailedDescription);
    };

    return (
      <div 
        data-hoverable
        onClick={(e) => {
          console.log('🖱️ AccessibilityToggle clicked:', title, 'current state:', enabled);
          
          const newState = !enabled;
          const screenReader = ScreenReader.getInstance();
          
          // Announce the action with high priority (will interrupt hover speech but not intro)
          const actionText = `${newState ? 'Enabled' : 'Disabled'} ${title}`;
          screenReader.speak(actionText, { rate: 1.2, volume: 0.9, priority: 'high' });
          
          console.log('🔄 Toggling to:', newState);
          onToggle(newState);
        }}
        onMouseEnter={speakHoverInfo}
        onFocus={speakHoverInfo} // Also trigger on keyboard focus for accessibility
        tabIndex={0} // Make it keyboard accessible
        style={{
          background: enabled 
            ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.1))'
            : 'rgba(255, 255, 255, 0.05)',
          border: `2px solid ${enabled ? '#22c55e' : 'rgba(255, 255, 255, 0.3)'}`,
          borderRadius: '16px',
          padding: '20px',
          margin: '8px 0',
          cursor: 'pointer',          
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          outline: 'none', // Remove default focus outline since we have border
          position: 'relative',
          zIndex: 10,
          userSelect: 'none'
        }}
        onPointerDown={(e) => {
          console.log('👆 Pointer down on toggle:', title);
          e.currentTarget.style.transform = 'scale(0.98)';
        }}
        onPointerUp={(e) => {
          console.log('👆 Pointer up on toggle:', title);
          e.currentTarget.style.transform = 'scale(1)';
        }}
        onTouchStart={(e) => {
          console.log('👆 Touch start on toggle:', title);
          e.currentTarget.style.transform = 'scale(0.98)';
        }}
        onTouchEnd={(e) => {
          console.log('👆 Touch end on toggle:', title);
          e.currentTarget.style.transform = 'scale(1)';
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const newState = !enabled;
            const screenReader = ScreenReader.getInstance();
            
            // Announce the action with high priority
            const actionText = `${newState ? 'Enabled' : 'Disabled'} ${title}`;
            screenReader.speak(actionText, { rate: 1.2, volume: 0.9, priority: 'high' });
            onToggle(newState);
          }
        }}
      >
      <div style={{ fontSize: '32px', pointerEvents: 'none' }}>{icon}</div>
      <div style={{ flex: 1, pointerEvents: 'none' }}>
        <h4 style={{ color: 'white', margin: '0 0 4px 0', fontSize: '18px', pointerEvents: 'none' }}>
          {title}
        </h4>
        <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0, fontSize: '14px', pointerEvents: 'none' }}>
          {description}
        </p>
      </div>
      <div style={{
        width: '50px',
        height: '26px',
        background: enabled ? '#22c55e' : 'rgba(255,255,255,0.2)',
        borderRadius: '13px',
        position: 'relative',
        transition: 'background 0.3s ease',
        pointerEvents: 'none'
      }}>
        <div style={{
          width: '22px',
          height: '22px',
          background: 'white',
          borderRadius: '50%',
          position: 'absolute',
          top: '2px',
          left: enabled ? '26px' : '2px',
          transition: 'left 0.3s ease',
          pointerEvents: 'none'
        }} />
      </div>
    </div>
    );
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      padding: '20px',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.95) 0%, rgba(45, 45, 45, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
        border: '2px solid rgba(59, 130, 246, 0.4)',
        borderRadius: '24px',
        padding: '40px',
        maxWidth: '1000px',
        maxHeight: '90vh',
        overflow: 'auto',
        color: 'white',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>♿</div>
          <h1 style={{ 
            fontSize: '36px', 
            fontWeight: 'bold', 
            margin: '0 0 8px 0',
            background: 'linear-gradient(135deg, #2563eb, #ea580c)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Karunya University AccessPoint
          </h1>
          <p style={{ fontSize: '18px', opacity: 0.8, margin: '0 0 16px 0' }}>
            Accessible Student Portal - Configure Your Experience
          </p>
          <p style={{ 
            color: '#22c55e', 
            fontSize: '16px', 
            fontWeight: '600',
            margin: 0 
          }}>
            🤖 Nullistant voice assistant is active in the top-right corner
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
          {/* Left Column - Accessibility Controls */}
          <div>
            <h2 style={{ 
              color: 'white', 
              fontSize: '24px', 
              margin: '0 0 20px 0',
              fontWeight: '600'
            }}>
              🎯 Accessibility Features
            </h2>
            
            <AccessibilityToggle
              title="Voice Assistant (Nullistant)"
              description="AI-powered voice commands for hands-free navigation"
              enabled={voiceEnabled}
              onToggle={(enabled) => {
                setVoiceEnabled(enabled);
                onAccessibilityChange?.({
                  voiceAssistantEnabled: enabled,
                  faceTrackingEnabled,
                  accessibilityLevel: accessibilitySettings.accessibilityLevel
                });
              }}
              icon="🎤"
            />
            
            <AccessibilityToggle
              title="Face Tracking Cursor"
              description="Control cursor with head movements"
              enabled={faceTrackingEnabled}
              onToggle={(enabled) => {
                setFaceTrackingEnabled(enabled);
                onAccessibilityChange?.({
                  voiceAssistantEnabled: voiceEnabled,
                  faceTrackingEnabled: enabled,
                  accessibilityLevel: accessibilitySettings.accessibilityLevel
                });
              }}
              icon="👁️"
            />
            
            <AccessibilityToggle
              title="Text-to-Speech Narrator"
              description="Screen reader with audio descriptions"
              enabled={textToSpeechEnabled}
              onToggle={(enabled) => {
                setTextToSpeechEnabled(enabled);
                // Note: TTS is internal to this screen only
              }}
              icon="🔊"
            />

            <div style={{
              background: 'rgba(34, 197, 94, 0.1)',
              border: '2px solid #22c55e',
              borderRadius: '12px',
              padding: '16px',
              margin: '16px 0'
            }}>
              <p style={{ 
                color: '#22c55e', 
                margin: 0, 
                fontSize: '14px',
                fontWeight: '600'
              }}>
                ♿ Mobility Support: Always Active
              </p>
              <p style={{ 
                color: 'rgba(255,255,255,0.8)', 
                margin: '4px 0 0 0', 
                fontSize: '12px' 
              }}>
                Larger buttons and enhanced touch targets are permanently enabled
              </p>
            </div>
          </div>

          {/* Right Column - Instructions */}
          <div>
            <h2 style={{ 
              color: 'white', 
              fontSize: '24px', 
              margin: '0 0 20px 0',
              fontWeight: '600'
            }}>
              📚 How to Use
            </h2>
            
            <div style={{
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              margin: '12px 0'
            }}>
              <h4 style={{ color: '#3b82f6', margin: '0 0 8px 0', fontSize: '16px' }}>
                🎤 Voice Commands
              </h4>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '14px', lineHeight: 1.4 }}>
                <li>Say <strong>"start"</strong> to enter the portal</li>
                <li>Say <strong>"disable narrator"</strong> to turn off voice</li>
                <li>Say <strong>"help"</strong> for assistance</li>
              </ul>
            </div>

            <div style={{
              background: 'rgba(234, 88, 12, 0.1)',
              border: '1px solid rgba(234, 88, 12, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              margin: '12px 0'
            }}>
              <h4 style={{ color: '#ea580c', margin: '0 0 8px 0', fontSize: '16px' }}>
                👁️ Face Tracking
              </h4>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '14px', lineHeight: 1.4 }}>
                <li>Move your head to control cursor</li>
                <li>Blink or open mouth to click</li>
                <li>Adjust sensitivity in settings</li>
              </ul>
            </div>

            <div style={{
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              margin: '12px 0'
            }}>
              <h4 style={{ color: '#22c55e', margin: '0 0 8px 0', fontSize: '16px' }}>
                🔊 Audio Navigation
              </h4>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '14px', lineHeight: 1.4 }}>
                <li>All interface elements are announced</li>
                <li>Hover over buttons for descriptions</li>
                <li>Voice feedback for all actions</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <button
            onClick={() => {
              speak('Entering Karunya University portal');
              onContinue();
            }}
            onMouseEnter={() => {
              const screenReader = ScreenReader.getInstance();
              if (!screenReader.isIntroActive()) {
                speak('Continue to university portal');
              }
            }}
            style={{
              background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
              color: 'white',
              border: 'none',
              borderRadius: '16px',
              padding: '16px 40px',
              fontSize: '20px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 8px 32px rgba(37, 99, 235, 0.4)'
            }}
          >
            🎓 Enter University Portal
          </button>
          
          <p style={{ 
            color: 'rgba(255,255,255,0.6)', 
            fontSize: '14px', 
            margin: '16px 0 0 0' 
          }}>
            Your settings will be remembered for future visits
          </p>
        </div>
      </div>
    </div>
  );
};