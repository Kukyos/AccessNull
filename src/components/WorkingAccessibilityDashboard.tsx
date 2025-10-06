/**
 * Working Accessibility Dashboard Component
 * Includes all working accessibility services (except hearing service which has infinite loop)
 */

import React, { useState, useEffect } from 'react';
import type { AccessibilitySettings, UserCapabilities } from '../types';

// Import working accessibility services
import { capabilityDetectionService } from '../services/capabilityDetectionService';
import { visualAccessibilityService } from '../services/visualAccessibilityService';
import { motorAccessibilityService } from '../services/motorAccessibilityService';
import { cognitiveAccessibilityService } from '../services/cognitiveAccessibilityService';
import { eyeTrackingService } from '../services/eyeTrackingService';
import { enhancedVoiceCommandService } from '../services/enhancedVoiceCommandService';

interface WorkingDashboardProps {
  onClose: () => void;
}

export const WorkingAccessibilityDashboard: React.FC<WorkingDashboardProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'visual' | 'motor' | 'cognitive' | 'voice' | 'eye'>('overview');
  const [capabilities, setCapabilities] = useState<UserCapabilities | null>(null);
  const [settings, setSettings] = useState<Partial<AccessibilitySettings>>({
    screenReader: false,
    highContrast: false,
    darkMode: true, // Default enabled
    fontSize: 'medium',
    reduceMotion: false,
    motorAssist: false,
    eyeTracking: false,
    voiceControl: false,
    cognitiveAssist: false,
    dwellTime: 1500
  });

  // Initialize capabilities on mount
  useEffect(() => {
    const initCapabilities = async () => {
      try {
        const detected = await capabilityDetectionService.detectCapabilities();
        setCapabilities(detected);
      } catch (error) {
        console.warn('Failed to detect capabilities:', error);
        // Set default capabilities
        setCapabilities({
          motor: 'full',
          vision: 'full',
          hearing: 'full',
          cognitive: 'standard',
          confidence: { motor: 0.8, vision: 0.8, hearing: 0.8, cognitive: 0.8 },
          detectedAt: new Date(),
          userConfirmed: false
        });
      }
    };
    
    initCapabilities();
  }, []);

  // Apply settings when they change
  useEffect(() => {
    if (settings.highContrast !== undefined) {
      visualAccessibilityService.updateHighContrast(settings.highContrast);
    }
    if (settings.darkMode !== undefined) {
      visualAccessibilityService.updateDarkMode(settings.darkMode);
    }
    if (settings.fontSize) {
      visualAccessibilityService.updateFontSize(settings.fontSize);
    }
    if (settings.motorAssist) {
      motorAccessibilityService.enableDwellClick(true);
      if (settings.dwellTime) {
        motorAccessibilityService.setDwellTime(settings.dwellTime);
      }
    }
    if (settings.voiceControl) {
      enhancedVoiceCommandService.setEnabled(true);
    }
  }, [settings]);

  const updateSetting = (key: keyof AccessibilitySettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'visual', label: 'Visual', icon: '👁️' },
    { id: 'motor', label: 'Motor', icon: '♿' },
    { id: 'cognitive', label: 'Cognitive', icon: '🧠' },
    { id: 'voice', label: 'Voice', icon: '🗣️' },
    { id: 'eye', label: 'Eye Tracking', icon: '👀' }
  ];

  return (
    <div style={{
      color: 'white',
      fontFamily: 'system-ui, sans-serif',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '2rem',
      background: 'rgba(0,0,0,0.9)',
      borderRadius: '1rem',
      maxHeight: '90vh',
      overflow: 'auto'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '2rem' 
      }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          margin: 0, 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          ♿ Universal Accessibility Control Panel
        </h1>
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
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ×
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '0.25rem',
        marginBottom: '2rem',
        background: 'rgba(255, 255, 255, 0.05)',
        padding: '0.5rem',
        borderRadius: '2.5rem',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        flexWrap: 'wrap'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              background: activeTab === tab.id 
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                : 'transparent',
              border: 'none',
              borderRadius: '2rem',
              padding: '0.75rem 1.5rem',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: activeTab === tab.id ? '600' : '400',
              transition: 'all 0.3s ease',
              transform: activeTab === tab.id ? 'scale(1.02)' : 'scale(1)',
              boxShadow: activeTab === tab.id ? '0 4px 15px rgba(102, 126, 234, 0.4)' : 'none',
              opacity: activeTab === tab.id ? 1 : 0.7
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) {
                const target = e.target as HTMLButtonElement;
                target.style.opacity = '0.9';
                target.style.background = 'rgba(255, 255, 255, 0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                const target = e.target as HTMLButtonElement;
                target.style.opacity = '0.7';
                target.style.background = 'transparent';
              }
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ minHeight: '400px' }}>
        
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            <h2 style={{ color: '#4CAF50', marginBottom: '1.5rem' }}>🎯 Accessibility Overview</h2>
            
            {/* How Detection Works */}
            <div style={{ 
              background: 'rgba(33, 150, 243, 0.1)', 
              padding: '1.5rem', 
              borderRadius: '0.75rem',
              marginBottom: '2rem',
              border: '1px solid rgba(33, 150, 243, 0.3)'
            }}>
              <h3 style={{ color: '#2196F3', marginBottom: '1rem' }}>🔍 How Disability Detection Works</h3>
              <div style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>
                <p><strong>🤖 Automatic Detection Methods:</strong></p>
                <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                  <li><strong>Vision:</strong> Screen reader detection, high contrast preferences, color scheme settings</li>
                  <li><strong>Motor:</strong> Mouse movement patterns, click precision, interaction timing, assistive device detection</li>
                  <li><strong>Hearing:</strong> Audio API availability, reduced motion preferences (vestibular disorders)</li>
                  <li><strong>Cognitive:</strong> Response time analysis, reduced motion preferences, interaction patterns</li>
                </ul>
                <p style={{ marginTop: '1rem' }}><strong>📊 Confidence Scoring:</strong> Uses multiple data points and browser APIs to estimate needs with confidence levels.</p>
              </div>
            </div>
            
            {capabilities && (
              <div style={{ marginBottom: '2rem' }}>
                <h3>Detected Capabilities:</h3>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                  gap: '1rem',
                  marginTop: '1rem'
                }}>
                  <div style={{ 
                    background: capabilities.vision === 'full' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 152, 0, 0.2)', 
                    padding: '1.5rem', 
                    borderRadius: '0.75rem',
                    border: `2px solid ${capabilities.vision === 'full' ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 152, 0, 0.3)'}`
                  }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👁️</div>
                    <div><strong>Vision:</strong> {capabilities.vision}</div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '0.5rem' }}>
                      Confidence: {Math.round(capabilities.confidence.vision * 100)}%
                    </div>
                    {capabilities.vision !== 'full' && (
                      <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: '#FF9800' }}>
                        🎯 Recommends: High contrast, screen reader, large fonts
                      </div>
                    )}
                  </div>
                  
                  <div style={{ 
                    background: capabilities.motor === 'full' ? 'rgba(33, 150, 243, 0.2)' : 'rgba(255, 152, 0, 0.2)', 
                    padding: '1.5rem', 
                    borderRadius: '0.75rem',
                    border: `2px solid ${capabilities.motor === 'full' ? 'rgba(33, 150, 243, 0.3)' : 'rgba(255, 152, 0, 0.3)'}`
                  }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>♿</div>
                    <div><strong>Motor:</strong> {capabilities.motor}</div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '0.5rem' }}>
                      Confidence: {Math.round(capabilities.confidence.motor * 100)}%
                    </div>
                    {capabilities.motor !== 'full' && (
                      <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: '#FF9800' }}>
                        🎯 Recommends: {capabilities.motor === 'voice-only' ? 'Voice control, eye tracking' : 'Dwell clicking, larger targets'}
                      </div>
                    )}
                  </div>
                  
                  <div style={{ 
                    background: capabilities.cognitive === 'standard' ? 'rgba(156, 39, 176, 0.2)' : 'rgba(255, 152, 0, 0.2)', 
                    padding: '1.5rem', 
                    borderRadius: '0.75rem',
                    border: `2px solid ${capabilities.cognitive === 'standard' ? 'rgba(156, 39, 176, 0.3)' : 'rgba(255, 152, 0, 0.3)'}`
                  }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🧠</div>
                    <div><strong>Cognitive:</strong> {capabilities.cognitive}</div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '0.5rem' }}>
                      Confidence: {Math.round(capabilities.confidence.cognitive * 100)}%
                    </div>
                    {capabilities.cognitive !== 'standard' && (
                      <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: '#FF9800' }}>
                        🎯 Recommends: Simplified UI, step guidance, memory aids
                      </div>
                    )}
                  </div>
                  
                  <div style={{ 
                    background: capabilities.hearing === 'full' ? 'rgba(255, 193, 7, 0.2)' : 'rgba(255, 152, 0, 0.2)', 
                    padding: '1.5rem', 
                    borderRadius: '0.75rem',
                    border: `2px solid ${capabilities.hearing === 'full' ? 'rgba(255, 193, 7, 0.3)' : 'rgba(255, 152, 0, 0.3)'}`
                  }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👂</div>
                    <div><strong>Hearing:</strong> {capabilities.hearing}</div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '0.5rem' }}>
                      Confidence: {Math.round(capabilities.confidence.hearing * 100)}%
                    </div>
                    {capabilities.hearing !== 'full' && (
                      <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: '#FF9800' }}>
                        🎯 Recommends: Visual notifications, captions, vibration
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div>
              <h3>Currently Active Features:</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem' }}>
                {Object.entries(settings).filter(([, value]) => value).length === 0 ? (
                  <div style={{ 
                    padding: '1rem', 
                    background: 'rgba(255, 255, 255, 0.05)', 
                    borderRadius: '0.5rem',
                    fontSize: '0.9rem',
                    opacity: 0.7
                  }}>
                    No accessibility features currently active. Enable features in the tabs above.
                  </div>
                ) : (
                  Object.entries(settings).map(([key, value]) => 
                    value && (
                      <div key={key} style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        padding: '0.75rem 1.25rem',
                        borderRadius: '1.5rem',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                      }}>
                        ✓ {key.replace(/([A-Z])/g, ' $1').trim()}
                        {key === 'fontSize' && ` (${value})`}
                        {key === 'dwellTime' && ` (${value}ms)`}
                      </div>
                    )
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* Visual Tab */}
        {activeTab === 'visual' && (
          <div>
            <h2 style={{ color: '#2196F3', marginBottom: '1.5rem' }}>👁️ Visual Accessibility</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.highContrast || false}
                    onChange={(e) => updateSetting('highContrast', e.target.checked)}
                    style={{ transform: 'scale(1.5)' }}
                  />
                  <div>
                    <strong>High Contrast Mode</strong>
                    <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                      Increases contrast for better visibility
                    </div>
                  </div>
                </label>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.darkMode || false}
                    onChange={(e) => updateSetting('darkMode', e.target.checked)}
                    style={{ transform: 'scale(1.5)' }}
                  />
                  <div>
                    <strong>Dark Mode</strong>
                    <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                      Reduces eye strain in low light
                    </div>
                  </div>
                </label>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '0.75rem' }}>
                <label style={{ display: 'block', marginBottom: '1rem' }}>
                  <strong>Font Size</strong>
                </label>
                <select
                  value={settings.fontSize || 'medium'}
                  onChange={(e) => updateSetting('fontSize', e.target.value)}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '0.5rem',
                    padding: '0.75rem',
                    color: 'white',
                    fontSize: '1rem',
                    width: '200px'
                  }}
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                  <option value="extra-large">Extra Large</option>
                </select>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.reduceMotion || false}
                    onChange={(e) => updateSetting('reduceMotion', e.target.checked)}
                    style={{ transform: 'scale(1.5)' }}
                  />
                  <div>
                    <strong>Reduce Motion</strong>
                    <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                      Minimizes animations and transitions
                    </div>
                  </div>
                </label>
              </div>

            </div>
          </div>
        )}

        {/* Motor Tab */}
        {activeTab === 'motor' && (
          <div>
            <h2 style={{ color: '#FF9800', marginBottom: '1.5rem' }}>♿ Motor Accessibility</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.motorAssist || false}
                    onChange={(e) => updateSetting('motorAssist', e.target.checked)}
                    style={{ transform: 'scale(1.5)' }}
                  />
                  <div>
                    <strong>Motor Assistance</strong>
                    <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                      Enables dwell clicking and motor aids
                    </div>
                  </div>
                </label>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '0.75rem' }}>
                <label style={{ display: 'block', marginBottom: '1rem' }}>
                  <strong>Dwell Time: {settings.dwellTime}ms</strong>
                </label>
                <input
                  type="range"
                  min="500"
                  max="3000"
                  step="100"
                  value={settings.dwellTime || 1500}
                  onChange={(e) => updateSetting('dwellTime', parseInt(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
                <div style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '0.5rem' }}>
                  Time to hover before clicking automatically
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Other tabs with similar structure... */}
        {activeTab === 'cognitive' && (
          <div>
            <h2 style={{ color: '#9C27B0', marginBottom: '1.5rem' }}>🧠 Cognitive Support</h2>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.cognitiveAssist || false}
                  onChange={(e) => updateSetting('cognitiveAssist', e.target.checked)}
                  style={{ transform: 'scale(1.5)' }}
                />
                <div>
                  <strong>Cognitive Assistance</strong>
                  <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                    Simplifies interface and provides memory aids
                  </div>
                </div>
              </label>
            </div>
          </div>
        )}

        {activeTab === 'voice' && (
          <div>
            <h2 style={{ color: '#4CAF50', marginBottom: '1.5rem' }}>🗣️ Voice Control</h2>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.voiceControl || false}
                  onChange={(e) => updateSetting('voiceControl', e.target.checked)}
                  style={{ transform: 'scale(1.5)' }}
                />
                <div>
                  <strong>Voice Commands</strong>
                  <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                    Control the interface with voice commands
                  </div>
                </div>
              </label>
            </div>
            {settings.voiceControl && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(76, 175, 80, 0.1)', borderRadius: '0.5rem' }}>
                <strong>Available Commands:</strong>
                <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
                  <li>"scroll down" / "scroll up"</li>
                  <li>"click [button name]"</li>
                  <li>"go back" / "go home"</li>
                  <li>"enable high contrast"</li>
                  <li>"help" / "what can I say"</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'eye' && (
          <div>
            <h2 style={{ color: '#00BCD4', marginBottom: '1.5rem' }}>👀 Eye Tracking</h2>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.eyeTracking || false}
                  onChange={(e) => updateSetting('eyeTracking', e.target.checked)}
                  style={{ transform: 'scale(1.5)' }}
                />
                <div>
                  <strong>Eye Tracking Control</strong>
                  <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                    Control cursor with eye movements (requires webcam)
                  </div>
                </div>
              </label>
            </div>
          </div>
        )}

      </div>

      {/* Footer */}
      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '0.75rem',
        fontSize: '0.9rem',
        opacity: 0.8
      }}>
        <p>✅ <strong>Status:</strong> Universal accessibility system active with {Object.values(settings).filter(Boolean).length} features enabled</p>
        <p>⚠️ <strong>Note:</strong> Hearing accessibility service temporarily disabled due to technical issues</p>
      </div>
    </div>
  );
};