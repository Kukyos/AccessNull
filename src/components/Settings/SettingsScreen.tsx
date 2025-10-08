import React, { useState, useEffect } from 'react';
import { Settings, Key, Save, ExternalLink, Info, CheckCircle, MousePointer, Eye } from 'lucide-react';

interface CalibrationSettings {
  sensitivity: number;
  smoothing: number;
  dwellTime: number;
  blinkEnabled: boolean;
  clickMethod: 'blink' | 'mouth' | 'eye-tracking' | 'voice' | 'switch';
}

interface SettingsScreenProps {
  onBack: () => void;
  calibration?: CalibrationSettings;
  onCalibrationChange?: (settings: CalibrationSettings) => void;
  faceTrackingEnabled?: boolean;
}

export default function SettingsScreen({ 
  onBack, 
  calibration, 
  onCalibrationChange, 
  faceTrackingEnabled = false 
}: SettingsScreenProps) {
  const [groqApiKey, setGroqApiKey] = useState('');
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [saved, setSaved] = useState(false);
  
  // Local calibration state if not provided
  const [localCalibration, setLocalCalibration] = useState<CalibrationSettings>({
    sensitivity: 1.8,
    smoothing: 0.1,
    dwellTime: 1500,
    blinkEnabled: false,
    clickMethod: 'mouth'
  });
  
  const currentCalibration = calibration || localCalibration;
  const setCalibration = onCalibrationChange || setLocalCalibration;

  useEffect(() => {
    // Load saved API keys from localStorage
    const savedGroqKey = localStorage.getItem('user_groq_api_key') || '';
    const savedGoogleKey = localStorage.getItem('user_google_api_key') || '';
    
    // Initialize with saved key or empty
    setGroqApiKey(savedGroqKey);
    
    setGoogleApiKey(savedGoogleKey);
  }, []);

  const handleSave = () => {
    // Save API keys to localStorage
    if (groqApiKey.trim()) {
      localStorage.setItem('user_groq_api_key', groqApiKey.trim());
    } else {
      localStorage.removeItem('user_groq_api_key');
    }

    if (googleApiKey.trim()) {
      localStorage.setItem('user_google_api_key', googleApiKey.trim());
    } else {
      localStorage.removeItem('user_google_api_key');
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const isGroqKeyValid = groqApiKey.trim().startsWith('gsk_');
  const isGoogleKeyValid = googleApiKey.trim().length > 20;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      padding: '1rem',
      overflow: 'auto'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        border: '2px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '1.5rem',
        padding: '2rem',
        maxWidth: '90vw',
        maxHeight: '90vh',
        width: '800px',
        overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        color: '#1f2937'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem' }}>
          <Settings style={{ width: '32px', height: '32px', color: '#2563eb' }} />
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>API Configuration</h1>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Info Banner */}
          <div style={{ 
            background: 'rgba(59, 130, 246, 0.1)', 
            border: '1px solid rgba(59, 130, 246, 0.3)', 
            borderRadius: '8px', 
            padding: '1rem' 
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <Info style={{ width: '20px', height: '20px', color: '#2563eb', marginTop: '2px' }} />
              <div style={{ fontSize: '0.875rem' }}>
                <p style={{ color: '#1e40af', fontWeight: '500', margin: '0 0 4px 0' }}>Privacy Notice</p>
                <p style={{ color: '#1d4ed8', margin: 0 }}>
                  API keys are stored locally in your browser only. They are never sent to our servers 
                  and are only used to communicate directly with the respective AI services.
                </p>
              </div>
            </div>
          </div>

          {/* Groq API Configuration */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Key style={{ width: '20px', height: '20px', color: '#4b5563' }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>Groq API Key</h2>
              <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>(Required for Chat)</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: '#4b5563' }}>
                <span>Get your free API key:</span>
                <a 
                  href="https://console.groq.com/keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    color: '#2563eb', 
                    fontWeight: '500',
                    textDecoration: 'none'
                  }}
                >
                  console.groq.com/keys
                  <ExternalLink style={{ width: '12px', height: '12px' }} />
                </a>
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  value={groqApiKey}
                  onChange={(e) => setGroqApiKey(e.target.value)}
                  placeholder="gsk_..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    outline: 'none',
                    paddingRight: isGroqKeyValid ? '40px' : '12px'
                  }}
                />
                {isGroqKeyValid && (
                  <CheckCircle style={{ 
                    position: 'absolute', 
                    right: '12px', 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    width: '20px', 
                    height: '20px', 
                    color: '#10b981' 
                  }} />
                )}
              </div>

              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                <p style={{ margin: '0 0 2px 0' }}>• Groq offers free tier with generous limits</p>
                <p style={{ margin: '0 0 2px 0' }}>• Keys start with "gsk_"</p>
                <p style={{ margin: 0 }}>• Used for AI chat responses and voice commands</p>
              </div>
            </div>
          </div>

          {/* Google Cloud API Configuration */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Key style={{ width: '20px', height: '20px', color: '#4b5563' }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>Google Cloud API Key</h2>
              <span style={{ color: '#d97706', fontSize: '0.875rem' }}>(Optional - for Voice & Translation)</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: '#4b5563' }}>
                <span>Get your API key:</span>
                <a 
                  href="https://console.cloud.google.com/apis/credentials" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    color: '#2563eb', 
                    fontWeight: '500',
                    textDecoration: 'none'
                  }}
                >
                  Google Cloud Console
                  <ExternalLink style={{ width: '12px', height: '12px' }} />
                </a>
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  value={googleApiKey}
                  onChange={(e) => setGoogleApiKey(e.target.value)}
                  placeholder="Your Google Cloud API key..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    outline: 'none',
                    paddingRight: isGoogleKeyValid ? '40px' : '12px'
                  }}
                />
                {isGoogleKeyValid && (
                  <CheckCircle style={{ 
                    position: 'absolute', 
                    right: '12px', 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    width: '20px', 
                    height: '20px', 
                    color: '#10b981' 
                  }} />
                )}
              </div>

              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                <p style={{ margin: '0 0 2px 0' }}>• Enable: Speech-to-Text, Text-to-Speech, Translation APIs</p>
                <p style={{ margin: '0 0 2px 0' }}>• Free tier: 60min STT, 1M chars TTS, 500K translation/month</p>
                <p style={{ margin: 0 }}>• Without this key, voice features use browser defaults</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '1rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
            <button
              onClick={onBack}
              style={{
                flex: 1,
                padding: '12px 24px',
                border: '1px solid #d1d5db',
                color: '#374151',
                borderRadius: '8px',
                background: 'white',
                cursor: 'pointer',
                fontSize: '1rem',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
            >
              Back to App
            </button>
            <button
              onClick={handleSave}
              style={{
                flex: 1,
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: '500',
                fontSize: '1rem',
                cursor: 'pointer',
                border: 'none',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: saved ? '#059669' : '#2563eb',
                color: 'white'
              }}
            >
              {saved ? (
                <>
                  <CheckCircle style={{ width: '20px', height: '20px' }} />
                  Saved!
                </>
              ) : (
                <>
                  <Save style={{ width: '20px', height: '20px' }} />
                  Save Configuration
                </>
              )}
            </button>
          </div>

          {/* Status Info */}
          <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '1rem', fontSize: '0.875rem' }}>
            <h3 style={{ fontWeight: '500', color: '#1f2937', margin: '0 0 8px 0' }}>Current Status:</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: isGroqKeyValid ? '#10b981' : '#ef4444' 
                }} />
                <span style={{ color: '#374151' }}>
                  Chat AI: {isGroqKeyValid ? 'Configured' : 'Not configured'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: isGoogleKeyValid ? '#10b981' : '#f59e0b' 
                }} />
                <span style={{ color: '#374151' }}>
                  Voice & Translation: {isGoogleKeyValid ? 'Configured' : 'Using browser defaults'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: faceTrackingEnabled ? '#10b981' : '#f59e0b' 
                }} />
                <span style={{ color: '#374151' }}>
                  Face Tracking: {faceTrackingEnabled ? 'Active' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}