/**
 * Accessibility Dashboard Component
 * Central control panel for all accessibility settings and features
 */

import React, { useState, useEffect } from 'react';
import type { AccessibilitySettings, UserCapabilities } from '../types';

// Import all accessibility services
import { capabilityDetectionService } from '../services/capabilityDetectionService';
import { visualAccessibilityService } from '../services/visualAccessibilityService';
import { motorAccessibilityService } from '../services/motorAccessibilityService';
import { hearingAccessibilityService } from '../services/hearingAccessibilityService';
import { cognitiveAccessibilityService } from '../services/cognitiveAccessibilityService';
import { eyeTrackingService } from '../services/eyeTrackingService';
import { enhancedVoiceCommandService } from '../services/enhancedVoiceCommandService';

interface DashboardSection {
  id: string;
  title: string;
  icon: string;
  description: string;
  settings: React.ReactNode;
}

export const AccessibilityDashboard: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [capabilities, setCapabilities] = useState<UserCapabilities | null>(null);
  const [settings, setSettings] = useState<Partial<AccessibilitySettings>>({
    fontSize: 'medium',
    highContrast: false,
    darkMode: false,
    reduceMotion: false,
    colorBlindMode: 'none',
    screenReader: false,
    voiceControl: false,
    eyeTracking: false,
    motorAssist: false,
    cognitiveAssist: false,
    hearingAssist: false,
    showCaptions: false,
    visualAlerts: false,
    vibrationEnabled: false,
    simplifiedInterface: false,
    dwellTime: 1500,
    clickConfirmation: true,
    tremorCompensation: false,
    stickyKeys: false,
    soundAmplification: 100,
    signLanguagePreference: 'none' as const,
    showHelp: true,
    confirmActions: true,
    stepByStep: false,
    voiceSpeed: 1,
    voicePitch: 1,
    voiceVolume: 80,
    speechLanguage: 'en' as const,
    primaryInput: 'face-tracking' as const,
    secondaryInput: 'voice-commands' as const,
    inputMethods: []
  });

  // Load initial settings and capabilities
  useEffect(() => {
    loadInitialData();
  }, []);

  /**
   * Load initial settings and detect capabilities
   */
  const loadInitialData = async () => {
    try {
      // Detect user capabilities
      const detectedCapabilities = await capabilityDetectionService.detectCapabilities();
      setCapabilities(detectedCapabilities);

      // Load current settings from services
      const visualSettings = visualAccessibilityService.getSettings();
      const motorSettings = motorAccessibilityService.getSettings();
      const hearingSettings = hearingAccessibilityService.getSettings();
      const cognitiveSettings = cognitiveAccessibilityService.getSettings();
      const eyeSettings = eyeTrackingService.getSettings();
      const voiceSettings = enhancedVoiceCommandService.getSettings();

      // Update only the relevant settings
      setSettings(prev => ({
        ...prev,
        fontSize: visualSettings.fontSize || 'medium',
        highContrast: visualSettings.highContrast || false,
        darkMode: visualSettings.darkMode || false,
        reduceMotion: visualSettings.reduceMotion || false,
        colorBlindMode: visualSettings.colorBlindMode || 'none',
        dwellTime: motorSettings.dwellTime || 1500,
        eyeTracking: eyeSettings.enabled || false,
        voiceControl: voiceSettings.enabled || false,
        motorAssist: motorSettings.enableDwellClick || false,
        hearingAssist: hearingSettings.enableVisualNotifications || false,
        cognitiveAssist: cognitiveSettings.enableSimplifiedUI || false
      }));
    } catch (error) {
      console.error('Failed to load accessibility data:', error);
    }
  };

  /**
   * Update setting and apply to services
   */
  const updateSetting = (key: keyof AccessibilitySettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    applySettingToServices(key, value);
  };

  /**
   * Apply setting to appropriate service
   */
  const applySettingToServices = (key: keyof AccessibilitySettings, value: any) => {
    switch (key) {
      case 'fontSize':
        visualAccessibilityService.updateFontSize(value);
        break;
      case 'highContrast':
        visualAccessibilityService.updateHighContrast(value);
        break;
      case 'darkMode':
        visualAccessibilityService.updateDarkMode(value);
        break;
      case 'reduceMotion':
        visualAccessibilityService.updateReduceMotion(value);
        break;
      case 'colorBlindMode':
        visualAccessibilityService.updateColorBlindMode(value);
        break;
      case 'voiceControl':
        enhancedVoiceCommandService.setEnabled(value);
        break;
      case 'eyeTracking':
        eyeTrackingService.setEnabled(value);
        break;
      case 'motorAssist':
        motorAccessibilityService.enableDwellClick(value);
        break;
      case 'cognitiveAssist':
        cognitiveAccessibilityService.enableSimplifiedUI(value);
        break;
      case 'hearingAssist':
        hearingAccessibilityService.applySettings({ enableVisualNotifications: value });
        break;
    }
  };

  /**
   * Dashboard sections configuration
   */
  const sections: DashboardSection[] = [
    {
      id: 'overview',
      title: 'Overview',
      icon: '📊',
      description: 'Accessibility status and quick actions',
      settings: <OverviewSection capabilities={capabilities} settings={settings} />
    },
    {
      id: 'vision',
      title: 'Vision',
      icon: '👁️',
      description: 'Visual accessibility settings',
      settings: (
        <VisionSection 
          settings={settings} 
          updateSetting={updateSetting}
        />
      )
    },
    {
      id: 'motor',
      title: 'Motor',
      icon: '♿',
      description: 'Mobility and motor accessibility',
      settings: (
        <MotorSection 
          settings={settings} 
          updateSetting={updateSetting}
        />
      )
    },
    {
      id: 'hearing',
      title: 'Hearing',
      icon: '🦻',
      description: 'Audio and hearing accessibility',
      settings: (
        <HearingSection 
          settings={settings} 
          updateSetting={updateSetting}
        />
      )
    },
    {
      id: 'cognitive',
      title: 'Cognitive',
      icon: '🧠',
      description: 'Cognitive accessibility features',
      settings: (
        <CognitiveSection 
          settings={settings} 
          updateSetting={updateSetting}
        />
      )
    },
    {
      id: 'advanced',
      title: 'Advanced',
      icon: '⚙️',
      description: 'Advanced settings and customization',
      settings: (
        <AdvancedSection 
          settings={settings} 
          updateSetting={updateSetting}
        />
      )
    }
  ];

  return (
    <>
      {/* Dashboard Toggle Button */}
      <button
        className="accessibility-dashboard-toggle"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: '#2196f3',
          color: 'white',
          border: 'none',
          fontSize: '24px',
          cursor: 'pointer',
          zIndex: 10000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          transition: 'all 0.3s ease'
        }}
        aria-label="Open Accessibility Dashboard"
      >
        ♿
      </button>

      {/* Dashboard Overlay */}
      {isOpen && (
        <div
          className="accessibility-dashboard-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.8)',
            zIndex: 10010,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          {/* Dashboard Panel */}
          <div
            className="accessibility-dashboard-panel"
            style={{
              background: 'white',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '1200px',
              height: '80%',
              display: 'flex',
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
            }}
          >
            {/* Sidebar */}
            <div
              className="dashboard-sidebar"
              style={{
                width: '300px',
                background: '#f8f9fa',
                borderRight: '1px solid #e0e0e0',
                padding: '20px',
                overflowY: 'auto'
              }}
            >
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ margin: '0 0 8px 0', color: '#333' }}>
                  Accessibility Dashboard
                </h2>
                <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                  Configure your accessibility preferences
                </p>
              </div>

              <nav>
                {sections.map((section) => (
                  <button
                    key={section.id}
                    className={`dashboard-nav-item ${activeSection === section.id ? 'active' : ''}`}
                    onClick={() => setActiveSection(section.id)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      margin: '4px 0',
                      border: 'none',
                      borderRadius: '8px',
                      background: activeSection === section.id ? '#2196f3' : 'transparent',
                      color: activeSection === section.id ? 'white' : '#333',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>{section.icon}</span>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                        {section.title}
                      </div>
                      <div style={{ fontSize: '12px', opacity: 0.8 }}>
                        {section.description}
                      </div>
                    </div>
                  </button>
                ))}
              </nav>

              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e0e0e0' }}>
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    background: 'white',
                    color: '#333',
                    cursor: 'pointer'
                  }}
                >
                  Close Dashboard
                </button>
              </div>
            </div>

            {/* Main Content */}
            <div
              className="dashboard-content"
              style={{
                flex: 1,
                padding: '20px',
                overflowY: 'auto'
              }}
            >
              {sections.find(s => s.id === activeSection)?.settings}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * Overview Section Component
 */
const OverviewSection: React.FC<{
  capabilities: UserCapabilities | null;
  settings: Partial<AccessibilitySettings>;
}> = ({ capabilities, settings }) => {
  const testFeature = (feature: string) => {
    switch (feature) {
      case 'voice':
        console.log('Testing voice commands...');
        enhancedVoiceCommandService.setEnabled(true);
        break;
      case 'visual':
        visualAccessibilityService.resetToDefaults?.();
        setTimeout(() => visualAccessibilityService.updateHighContrast?.(true), 500);
        setTimeout(() => visualAccessibilityService.updateHighContrast?.(false), 2000);
        break;
      case 'hearing':
        hearingAccessibilityService.testNotifications?.();
        break;
      case 'eye':
        eyeTrackingService.showGazePointer?.(true);
        break;
    }
  };

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Accessibility Overview</h3>
      
      {capabilities && (
        <div style={{ marginBottom: '30px' }}>
          <h4>Detected Capabilities</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="capability-card" style={{ padding: '16px', border: '1px solid #ddd', borderRadius: '8px' }}>
              <div style={{ fontSize: '20px', marginBottom: '8px' }}>👁️ Vision</div>
              <div>Status: {capabilities.vision === 'full' ? '✅ Good' : '⚠️ Limited'}</div>
            </div>
            <div className="capability-card" style={{ padding: '16px', border: '1px solid #ddd', borderRadius: '8px' }}>
              <div style={{ fontSize: '20px', marginBottom: '8px' }}>🦻 Hearing</div>
              <div>Status: {capabilities.hearing === 'full' ? '✅ Good' : '⚠️ Limited'}</div>
            </div>
            <div className="capability-card" style={{ padding: '16px', border: '1px solid #ddd', borderRadius: '8px' }}>
              <div style={{ fontSize: '20px', marginBottom: '8px' }}>♿ Motor</div>
              <div>Status: {capabilities.motor === 'full' ? '✅ Good' : '⚠️ Limited'}</div>
            </div>
            <div className="capability-card" style={{ padding: '16px', border: '1px solid #ddd', borderRadius: '8px' }}>
              <div style={{ fontSize: '20px', marginBottom: '8px' }}>🧠 Cognitive</div>
              <div>Status: {capabilities.cognitive === 'standard' ? '✅ Good' : '⚠️ Assisted'}</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '30px' }}>
        <h4>Quick Tests</h4>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={() => testFeature('voice')} className="btn btn-primary">Test Voice Commands</button>
          <button onClick={() => testFeature('visual')} className="btn btn-primary">Test Visual Features</button>
          <button onClick={() => testFeature('hearing')} className="btn btn-primary">Test Hearing Features</button>
          <button onClick={() => testFeature('eye')} className="btn btn-primary">Test Eye Tracking</button>
        </div>
      </div>

      <div>
        <h4>Active Features</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
          {Object.entries(settings).map(([key, value]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: value ? '#4caf50' : '#ccc' }}>
                {value ? '✅' : '⭕'}
              </span>
              <span style={{ fontSize: '14px', textTransform: 'capitalize' }}>
                {key.replace(/([A-Z])/g, ' $1')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Vision Section Component
 */
const VisionSection: React.FC<{
  settings: Partial<AccessibilitySettings>;
  updateSetting: (key: keyof AccessibilitySettings, value: any) => void;
}> = ({ settings, updateSetting }) => {
  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Vision Accessibility</h3>
      
      <div className="setting-group" style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Font Size
        </label>
        <select
          value={settings.fontSize || 'medium'}
          onChange={(e) => updateSetting('fontSize', e.target.value)}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', minWidth: '200px' }}
        >
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
          <option value="extra-large">Extra Large</option>
        </select>
      </div>

      <div className="setting-group" style={{ marginBottom: '24px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={settings.highContrast || false}
            onChange={(e) => updateSetting('highContrast', e.target.checked)}
          />
          <span>High Contrast Mode</span>
        </label>
        <p style={{ margin: '4px 0 0 24px', fontSize: '14px', color: '#666' }}>
          Increases contrast between text and background colors
        </p>
      </div>

      <div className="setting-group" style={{ marginBottom: '24px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={settings.darkMode || false}
            onChange={(e) => updateSetting('darkMode', e.target.checked)}
          />
          <span>Dark Mode</span>
        </label>
        <p style={{ margin: '4px 0 0 24px', fontSize: '14px', color: '#666' }}>
          Uses dark colors to reduce eye strain
        </p>
      </div>

      <div className="setting-group" style={{ marginBottom: '24px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={settings.reduceMotion || false}
            onChange={(e) => updateSetting('reduceMotion', e.target.checked)}
          />
          <span>Reduce Motion</span>
        </label>
        <p style={{ margin: '4px 0 0 24px', fontSize: '14px', color: '#666' }}>
          Minimizes animations and transitions
        </p>
      </div>

      <div className="setting-group" style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Color Blind Support
        </label>
        <select
          value={settings.colorBlindMode || 'none'}
          onChange={(e) => updateSetting('colorBlindMode', e.target.value)}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', minWidth: '200px' }}
        >
          <option value="none">None</option>
          <option value="protanopia">Protanopia (Red-blind)</option>
          <option value="deuteranopia">Deuteranopia (Green-blind)</option>
          <option value="tritanopia">Tritanopia (Blue-blind)</option>
        </select>
      </div>

      <div className="setting-group" style={{ marginBottom: '24px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={settings.screenReader || false}
            onChange={(e) => updateSetting('screenReader', e.target.checked)}
          />
          <span>Screen Reader Support</span>
        </label>
        <p style={{ margin: '4px 0 0 24px', fontSize: '14px', color: '#666' }}>
          Enhanced support for screen reading software
        </p>
      </div>
    </div>
  );
};

/**
 * Motor Section Component
 */
const MotorSection: React.FC<{
  settings: Partial<AccessibilitySettings>;
  updateSetting: (key: keyof AccessibilitySettings, value: any) => void;
}> = ({ settings, updateSetting }) => {
  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Motor Accessibility</h3>
      
      <div className="setting-group" style={{ marginBottom: '24px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={settings.motorAssist || false}
            onChange={(e) => updateSetting('motorAssist', e.target.checked)}
          />
          <span>Dwell Clicking</span>
        </label>
        <p style={{ margin: '4px 0 0 24px', fontSize: '14px', color: '#666' }}>
          Click by hovering over elements for a set time
        </p>
      </div>

      <div className="setting-group" style={{ marginBottom: '24px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={settings.voiceControl || false}
            onChange={(e) => updateSetting('voiceControl', e.target.checked)}
          />
          <span>Voice Control</span>
        </label>
        <p style={{ margin: '4px 0 0 24px', fontSize: '14px', color: '#666' }}>
          Navigate and interact using voice commands
        </p>
      </div>

      <div className="setting-group" style={{ marginBottom: '24px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={settings.eyeTracking || false}
            onChange={(e) => updateSetting('eyeTracking', e.target.checked)}
          />
          <span>Eye Tracking</span>
        </label>
        <p style={{ margin: '4px 0 0 24px', fontSize: '14px', color: '#666' }}>
          Control interface with eye movements
        </p>
      </div>

      <div style={{ padding: '16px', background: '#f0f8ff', borderRadius: '8px', marginTop: '20px' }}>
        <h4 style={{ margin: '0 0 12px 0' }}>🎯 Motor Assistance Tips</h4>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li>Use large targets for easier clicking</li>
          <li>Enable voice commands for hands-free navigation</li>
          <li>Try eye tracking if mouse control is difficult</li>
          <li>Use keyboard shortcuts for faster navigation</li>
        </ul>
      </div>
    </div>
  );
};

/**
 * Hearing Section Component
 */
const HearingSection: React.FC<{
  settings: Partial<AccessibilitySettings>;
  updateSetting: (key: keyof AccessibilitySettings, value: any) => void;
}> = ({ settings, updateSetting }) => {
  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Hearing Accessibility</h3>
      
      <div className="setting-group" style={{ marginBottom: '24px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={settings.hearingAssist || false}
            onChange={(e) => updateSetting('hearingAssist', e.target.checked)}
          />
          <span>Visual Notifications</span>
        </label>
        <p style={{ margin: '4px 0 0 24px', fontSize: '14px', color: '#666' }}>
          Show visual alerts instead of audio notifications
        </p>
      </div>

      <div style={{ padding: '16px', background: '#f8f0ff', borderRadius: '8px', marginTop: '20px' }}>
        <h4 style={{ margin: '0 0 12px 0' }}>🦻 Hearing Features</h4>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li>Visual notifications replace sound alerts</li>
          <li>Screen flashing for important notifications</li>  
          <li>Vibration alerts (on supported devices)</li>
          <li>Captions for video content</li>
        </ul>
      </div>
    </div>
  );
};

/**
 * Cognitive Section Component
 */
const CognitiveSection: React.FC<{
  settings: Partial<AccessibilitySettings>;
  updateSetting: (key: keyof AccessibilitySettings, value: any) => void;
}> = ({ settings, updateSetting }) => {
  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Cognitive Accessibility</h3>
      
      <div className="setting-group" style={{ marginBottom: '24px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={settings.cognitiveAssist || false}
            onChange={(e) => updateSetting('cognitiveAssist', e.target.checked)}
          />
          <span>Simplified Interface</span>
        </label>
        <p style={{ margin: '4px 0 0 24px', fontSize: '14px', color: '#666' }}>
          Simplify the interface to reduce cognitive load
        </p>
      </div>

      <div style={{ padding: '16px', background: '#fff8f0', borderRadius: '8px', marginTop: '20px' }}>
        <h4 style={{ margin: '0 0 12px 0' }}>🧠 Cognitive Features</h4>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li>Step-by-step guidance</li>
          <li>Memory aids and auto-save</li>
          <li>Reading assistance</li>
          <li>Focus mode to reduce distractions</li>
        </ul>
      </div>
    </div>
  );
};

/**
 * Advanced Section Component
 */
const AdvancedSection: React.FC<{
  settings: Partial<AccessibilitySettings>;
  updateSetting: (key: keyof AccessibilitySettings, value: any) => void;
}> = ({ settings, updateSetting }) => {
  const exportSettings = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'accessibility-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedSettings = JSON.parse(e.target?.result as string);
        Object.entries(importedSettings).forEach(([key, value]) => {
          updateSetting(key as keyof AccessibilitySettings, value);
        });
      } catch (error) {
        alert('Invalid settings file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Advanced Settings</h3>
      
      <div className="setting-group" style={{ marginBottom: '24px' }}>
        <h4>Export/Import Settings</h4>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <button onClick={exportSettings} className="btn btn-secondary">
            Export Settings
          </button>
          <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
            Import Settings
            <input
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importSettings(file);
              }}
            />
          </label>
        </div>
      </div>

      <div className="setting-group" style={{ marginBottom: '24px' }}>
        <h4>Reset Options</h4>
        <button 
          onClick={() => {
            if (confirm('Reset all accessibility settings to defaults?')) {
              // Reset all settings
              Object.keys(settings).forEach(key => {
                const defaultValue = key === 'fontSize' ? 'medium' : 
                                   key === 'colorBlindMode' ? 'none' : false;
                updateSetting(key as keyof AccessibilitySettings, defaultValue);
              });
            }
          }}
          className="btn btn-danger"
        >
          Reset All Settings
        </button>
      </div>

      <div style={{ padding: '16px', background: '#f0f0f0', borderRadius: '8px', marginTop: '20px' }}>
        <h4 style={{ margin: '0 0 12px 0' }}>⚙️ Advanced Tips</h4>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li>Export settings to share with others or backup</li>
          <li>Use browser zoom for additional text scaling</li>
          <li>Check browser accessibility settings for additional options</li>
          <li>Contact support for custom accessibility needs</li>
        </ul>
      </div>
    </div>
  );
};

export default AccessibilityDashboard;