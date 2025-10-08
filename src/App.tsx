import { useState, useCallback, useRef, useEffect } from 'react';
import { CameraFeed } from './components/Camera/CameraFeed';
import { ForeheadCursor } from './components/Cursor/ForeheadCursor';
import { WorkingAccessibilityDashboard } from './components/WorkingAccessibilityDashboard';
import { IntelligentVoiceBox } from './components/IntelligentVoiceBox';
import { UniversitySidebar } from './components/University/UniversitySidebar';
import { UniversityHero } from './components/University/UniversityHero';
import { UniversityMainContent } from './components/University/UniversityMainContent';
import { useFaceTracking } from './hooks/useFaceTracking';
import { ChatScreen } from './screens/ChatScreen';
import SettingsScreen from './components/Settings/SettingsScreen';
import type { CalibrationSettings, AppScreen } from './types';

function App() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('instructions');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  // University interface state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentSection, setCurrentSection] = useState('home');
  const [accessibilityLevel, setAccessibilityLevel] = useState<'normal' | 'large' | 'extra-large'>('normal');
  
  // Add console log to track app initialization
  console.log('🚀 App component initialized, current screen:', currentScreen);

  // Simplified state for testing
  const [faceTrackingEnabled, setFaceTrackingEnabled] = useState(true); // Enabled by default

  // Default calibration settings - matching ForeHeadDetector
  const [calibration, setCalibration] = useState<CalibrationSettings>({
    sensitivity: 1.8, // Match ForeHeadDetector's HEAD_CONTROL_SENSITIVITY
    smoothing: 0.1,   // Lower = more responsive (using 5-frame buffer in cursor)
    dwellTime: 1500,
    blinkEnabled: false,
    clickMethod: 'mouth', // Default to mouth open for clicking
  });

  // Face tracking
  const { landmarks, blinkData, error: trackingError, isLoading: isTrackingLoading } = useFaceTracking(
    videoRef.current,
    stream
  );

  // Handle stream ready from camera
  const handleStreamReady = useCallback((mediaStream: MediaStream) => {
    setStream(mediaStream);
    const video = document.querySelector('video');
    if (video) {
      videoRef.current = video;
    }
  }, []);

  // Handle blink click
  const handleDwellComplete = useCallback((element: HTMLElement) => {
    console.log('👁️ Blink click on:', element.textContent?.trim() || element.tagName);
    
    // Direct click - simple and effective
    try {
      element.click();
      console.log('✅ Click executed successfully');
    } catch (error) {
      console.error('❌ Click failed:', error);
    }
  }, []);

  // Update screen state when tracking is ready
  useEffect(() => {
    console.log('🔍 Loading check:', { 
      hasStream: !!stream, 
      isTrackingLoading, 
      hasLandmarks: !!landmarks, 
      currentScreen 
    });
    
    // Move to menu when camera is ready, even if no landmarks yet
    if (stream && !isTrackingLoading && currentScreen === 'loading') {
      console.log('✅ Ready to show menu!');
      const timer = setTimeout(() => {
        console.log('🎯 Switching to menu screen');
        setCurrentScreen('menu');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [stream, isTrackingLoading, landmarks, currentScreen]);

  // Failsafe: Force menu after 2 seconds regardless (faster for testing)
  useEffect(() => {
    const failsafeTimer = setTimeout(() => {
      if (currentScreen === 'loading') {
        console.log('⚠️ FAILSAFE: Forcing menu screen after 2 seconds');
        setCurrentScreen('menu');
      }
    }, 2000); // Reduced from 5 seconds to 2 seconds
    return () => clearTimeout(failsafeTimer);
  }, [currentScreen]);

  // Simple initialization for testing
  useEffect(() => {
    console.log('🚀 App initialized successfully');
  }, []);

  return (
    <div>
      {/* Camera background */}
      <CameraFeed onStreamReady={handleStreamReady} />

      {/* Loading screen */}
      {(currentScreen === 'loading' || isTrackingLoading) && (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
        }}>
          <div style={{ textAlign: 'center', color: 'white' }}>
            <div className="spinner" style={{ width: '64px', height: '64px', margin: '0 auto 1rem' }}></div>
            <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>AccessPoint</h2>
            <p style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Initializing forehead tracking...</p>
            {stream && <p style={{ fontSize: '0.875rem', opacity: 0.8 }}>Camera ready, loading face detection...</p>}
            {trackingError && (
              <div className="error-message" style={{ 
                marginTop: '1rem', 
                marginLeft: 'auto', 
                marginRight: 'auto', 
                maxWidth: '50rem',
                maxHeight: '20rem',
                overflow: 'auto',
                textAlign: 'left',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Error Code: {trackingError.code}</div>
                {trackingError.message}
              </div>
            )}
            <button
              onClick={() => setCurrentScreen('menu')}
              style={{
                marginTop: '2rem',
                background: 'rgba(76, 175, 80, 0.8)',
                border: '1px solid rgba(76, 175, 80, 1)',
                borderRadius: '0.5rem',
                padding: '0.75rem 1.5rem',
                color: 'white',
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              Skip to Menu (Test Mode)
            </button>
          </div>
        </div>
      )}

      {/* Instructions/Disclaimer Screen */}
      {currentScreen === 'instructions' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          padding: '2rem',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.95) 0%, rgba(45, 45, 45, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            border: '2px solid rgba(59, 130, 246, 0.4)',
            borderRadius: '2rem',
            padding: '3rem',
            maxWidth: '900px',
            maxHeight: '90vh',
            overflow: 'auto',
            color: 'white',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)'
          }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>�️</div>
              <h1 style={{ 
                fontSize: '2.5rem', 
                fontWeight: 'bold', 
                margin: '0 0 0.5rem 0',
                background: 'linear-gradient(135deg, #2563eb, #ea580c)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Karunya University Portal
              </h1>
              <p style={{ fontSize: '1.125rem', opacity: 0.8, margin: 0 }}>
                Accessible University Interface - How It Works
              </p>
            </div>

            {/* Instructions Content */}
            <div style={{ display: 'grid', gap: '2rem' }}>
              
              {/* Voice Control Section */}
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '2px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '1rem',
                padding: '2rem'
              }}>
                <h2 style={{ 
                  fontSize: '1.5rem', 
                  margin: '0 0 1rem 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  🎤 Voice Control (Nullistant)
                </h2>
                <ul style={{ margin: 0, paddingLeft: '1.5rem', lineHeight: 1.6 }}>
                  <li><strong>Location:</strong> Red panel in top-right corner</li>
                  <li><strong>How to use:</strong> Click the header to expand, then click "Listen"</li>
                  <li><strong>What to say:</strong> Speak naturally - "Help", "Emergency", "Go back", "Call doctor"</li>
                  <li><strong>Smart AI:</strong> Understands context and finds the right buttons automatically</li>
                  <li><strong>Navigation:</strong> Say "exit", "back", "close" to return to previous screens</li>
                </ul>
              </div>

              {/* Face Tracking Section */}
              <div style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '2px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '1rem',
                padding: '2rem'
              }}>
                <h2 style={{ 
                  fontSize: '1.5rem', 
                  margin: '0 0 1rem 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  👁️ Face Tracking
                </h2>
                <ul style={{ margin: 0, paddingLeft: '1.5rem', lineHeight: 1.6 }}>
                  <li><strong>Enable:</strong> Click "Face Track: OFF" button at bottom of main menu</li>
                  <li><strong>Control:</strong> Move your head to control a cursor on screen</li>
                  <li><strong>Click:</strong> Blink both eyes or open mouth wide (configurable in Settings)</li>
                  <li><strong>Cursor:</strong> Small circle that highlights clickable elements</li>
                  <li><strong>Dwell time:</strong> Adjust in Settings - how long to hover before clicking</li>
                </ul>
              </div>

              {/* Chat Assistant Section */}
              <div style={{
                background: 'rgba(34, 197, 94, 0.1)',
                border: '2px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '1rem',
                padding: '2rem'
              }}>
                <h2 style={{ 
                  fontSize: '1.5rem', 
                  margin: '0 0 1rem 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  💬 NullChat (University Assistant)
                </h2>
                <ul style={{ margin: 0, paddingLeft: '1.5rem', lineHeight: 1.6 }}>
                  <li><strong>Access:</strong> Click on the chat icon in sidebar or say "Open chat"</li>
                  <li><strong>Ask about:</strong> Courses, faculty, admissions, facilities, circulars, events</li>
                  <li><strong>Languages:</strong> Supports English and Hindi</li>
                  <li><strong>Voice input:</strong> Click microphone button to speak your question</li>
                  <li><strong>Smart responses:</strong> Get information about university services and support</li>
                </ul>
              </div>

              {/* Navigation & Features */}
              <div style={{
                background: 'rgba(168, 85, 247, 0.1)',
                border: '2px solid rgba(168, 85, 247, 0.3)',
                borderRadius: '1rem',
                padding: '2rem'
              }}>
                <h2 style={{ 
                  fontSize: '1.5rem', 
                  margin: '0 0 1rem 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  �️ University Features
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <strong>� Academics:</strong><br />
                    Course catalog, schedules, and grades
                  </div>
                  <div>
                    <strong>� Circulars:</strong><br />
                    Latest university announcements
                  </div>
                  <div>
                    <strong>🏢 Facilities:</strong><br />
                    Library, labs, and campus resources
                  </div>
                  <div>
                    <strong>🆘 Support:</strong><br />
                    Health center, counseling, and emergency
                  </div>
                </div>
              </div>

              {/* Important Notes */}
              <div style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '2px solid rgba(245, 158, 11, 0.4)',
                borderRadius: '1rem',
                padding: '2rem'
              }}>
                <h2 style={{ 
                  fontSize: '1.5rem', 
                  margin: '0 0 1rem 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  ⚠️ Important Notes
                </h2>
                <ul style={{ margin: 0, paddingLeft: '1.5rem', lineHeight: 1.6 }}>
                  <li><strong>Camera Permission:</strong> Required for face tracking to work</li>
                  <li><strong>Microphone Permission:</strong> Required for voice control and chat</li>
                  <li><strong>Browser Support:</strong> Works best in Chrome, Edge, or Firefox</li>
                  <li><strong>Lighting:</strong> Good lighting improves face tracking accuracy</li>
                  <li><strong>Emergency Use:</strong> Voice control works even without face tracking</li>
                </ul>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ 
              display: 'flex', 
              gap: '1rem', 
              marginTop: '2rem',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                data-hoverable
                onClick={() => setCurrentScreen('loading')}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  border: 'none',
                  borderRadius: '1rem',
                  padding: '1rem 2rem',
                  color: 'white',
                  fontSize: '1.125rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  minWidth: '200px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                🚀 Start AccessPoint
              </button>
              <button
                data-hoverable
                onClick={() => setCurrentScreen('menu')}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '2px solid rgba(255, 255, 255, 0.4)',
                  borderRadius: '1rem',
                  padding: '1rem 2rem',
                  color: 'white',
                  fontSize: '1.125rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  minWidth: '200px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                ⏭️ Skip to Main Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* University Interface */}
      {currentScreen === 'menu' && (
        <>
          {/* University Sidebar */}
          <UniversitySidebar
            isCollapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            currentSection={currentSection}
            onSectionChange={(section) => {
              setCurrentSection(section);
              // Handle special sections
              if (section === 'chat') {
                setCurrentScreen('chat');
              } else if (section === 'emergency') {
                setCurrentScreen('emergency');
              } else if (section === 'technical') {
                setCurrentScreen('settings');
              }
            }}
            faceTrackingEnabled={faceTrackingEnabled}
            accessibilityLevel={accessibilityLevel}
          />

          {/* University Hero Section */}
          <UniversityHero
            sidebarCollapsed={sidebarCollapsed}
            faceTrackingEnabled={faceTrackingEnabled}
            accessibilityLevel={accessibilityLevel}
          />

          {/* Main Content Area */}
          <UniversityMainContent
            currentSection={currentSection}
            sidebarCollapsed={sidebarCollapsed}
            faceTrackingEnabled={faceTrackingEnabled}
            accessibilityLevel={accessibilityLevel}
            onSectionChange={setCurrentSection}
          />

          {/* Quick Access Toolbar */}
          <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            display: 'flex',
            gap: '0.5rem',
            zIndex: 1100
          }}>
            <button
              data-hoverable
              onClick={() => setFaceTrackingEnabled(!faceTrackingEnabled)}
              style={{
                background: faceTrackingEnabled ? 'rgba(76, 175, 80, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                border: `2px solid ${faceTrackingEnabled ? '#4CAF50' : '#ccc'}`,
                borderRadius: '12px',
                padding: '0.75rem',
                color: faceTrackingEnabled ? 'white' : '#333',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>👁️</span>
              {faceTrackingEnabled ? 'Face Tracking ON' : 'Face Tracking OFF'}
            </button>
            
            <button
              data-hoverable
              onClick={() => setCurrentScreen('accessibility-settings')}
              style={{
                background: 'rgba(59, 130, 246, 0.9)',
                backdropFilter: 'blur(10px)',
                border: '2px solid #3B82F6',
                borderRadius: '12px',
                padding: '0.75rem',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>♿</span>
              Accessibility
            </button>
          </div>
        </>
      )}

      {/* Chat Screen */}
      {currentScreen === 'chat' && <ChatScreen onClose={() => setCurrentScreen('menu')} />}

      {/* Settings Screen */}
      {currentScreen === 'settings' && (
        <SettingsScreen 
          onBack={() => setCurrentScreen('menu')} 
          calibration={calibration}
          onCalibrationChange={setCalibration}
          faceTrackingEnabled={faceTrackingEnabled}
        />
      )}

      {/* Emergency Screen */}
      {currentScreen === 'emergency' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
        }}>
          <div style={{
            background: 'rgba(231, 76, 60, 0.2)',
            backdropFilter: 'blur(20px)',
            border: '2px solid rgba(231, 76, 60, 0.5)',
            borderRadius: '1.5rem',
            padding: '3rem',
            maxWidth: '600px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>🚨</div>
            <h2 style={{ color: 'white', fontSize: '2.5rem', margin: '0 0 1rem 0' }}>
              Emergency Contact
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '1.25rem', margin: '0 0 2rem 0' }}>
              Choose how you'd like to reach medical assistance
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button
                data-hoverable
                onClick={() => alert('Calling Dr. Smith...')}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  border: '2px solid rgba(255, 255, 255, 0.4)',
                  borderRadius: '0.75rem',
                  padding: '1.5rem',
                  color: 'white',
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                📞 Call My Doctor
              </button>
              <button
                data-hoverable
                onClick={() => alert('Calling 911...')}
                style={{
                  background: 'rgba(231, 76, 60, 0.4)',
                  backdropFilter: 'blur(10px)',
                  border: '2px solid rgba(231, 76, 60, 0.6)',
                  borderRadius: '0.75rem',
                  padding: '1.5rem',
                  color: 'white',
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                🚑 Emergency Services (911)
              </button>
              <button
                data-hoverable
                onClick={() => alert('Sending message to emergency contact...')}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  border: '2px solid rgba(255, 255, 255, 0.4)',
                  borderRadius: '0.75rem',
                  padding: '1.5rem',
                  color: 'white',
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                💬 Alert Emergency Contact
              </button>
              <button
                data-hoverable
                onClick={() => setCurrentScreen('menu')}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '0.75rem',
                  padding: '1rem',
                  color: 'white',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  marginTop: '1rem',
                }}
              >
                ← Back to Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prescriptions Screen */}
      {currentScreen === 'prescriptions' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(20px)',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '1.5rem',
            padding: '3rem',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
          }}>
            <h2 style={{ color: 'white', fontSize: '2.5rem', margin: '0 0 2rem 0' }}>
              📋 Medical Records
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Sample prescription cards */}
              {['Amoxicillin 500mg', 'Lisinopril 10mg', 'Metformin 850mg'].map((med, i) => (
                <div
                  key={i}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '0.75rem',
                    padding: '1.5rem',
                    color: 'white',
                  }}
                >
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>{med}</h3>
                  <p style={{ margin: 0, opacity: 0.8 }}>Take 2 times daily with food</p>
                  <p style={{ margin: '0.5rem 0 0 0', opacity: 0.6, fontSize: '0.875rem' }}>
                    Prescribed: {new Date().toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
            <button
              data-hoverable
              onClick={() => setCurrentScreen('menu')}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '0.75rem',
                padding: '1rem 2rem',
                color: 'white',
                fontSize: '1rem',
                cursor: 'pointer',
                marginTop: '2rem',
                width: '100%',
              }}
            >
              ← Back to Menu
            </button>
          </div>
        </div>
      )}

      {/* Campus Accessibility Screen */}
      {currentScreen === 'campus-info' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(20px)',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '1.5rem',
            padding: '3rem',
            maxWidth: '800px',
            width: '90%',
          }}>
            <h2 style={{ color: 'white', fontSize: '2.5rem', margin: '0 0 2rem 0' }}>
              ♿ Campus Accessibility
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '0.75rem',
                padding: '1.5rem',
                color: 'white',
              }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>🅿️ Accessible Parking</h3>
                <p style={{ margin: 0, opacity: 0.8 }}>Building A - Levels 1 & 2</p>
              </div>
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '0.75rem',
                padding: '1.5rem',
                color: 'white',
              }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>🛗 Elevators</h3>
                <p style={{ margin: 0, opacity: 0.8 }}>All buildings equipped with accessible elevators</p>
              </div>
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '0.75rem',
                padding: '1.5rem',
                color: 'white',
              }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>🚻 Accessible Restrooms</h3>
                <p style={{ margin: 0, opacity: 0.8 }}>Located on every floor</p>
              </div>
            </div>
            <button
              data-hoverable
              onClick={() => setCurrentScreen('menu')}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '0.75rem',
                padding: '1rem 2rem',
                color: 'white',
                fontSize: '1rem',
                cursor: 'pointer',
                marginTop: '2rem',
                width: '100%',
              }}
            >
              ← Back to Menu
            </button>
          </div>
        </div>
      )}



      {/* Accessibility Settings Screen */}
      {currentScreen === 'accessibility-settings' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          overflow: 'auto',
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '1.5rem',
            padding: '2rem',
            maxWidth: '95vw',
            maxHeight: '95vh',
            width: '1200px',
            overflow: 'auto',
          }}>
            <WorkingAccessibilityDashboard onClose={() => setCurrentScreen('menu')} />
          </div>
        </div>
      )}

      {/* Forehead cursor - only show when face tracking is enabled */}
      {faceTrackingEnabled && landmarks && currentScreen !== 'loading' && (
        <ForeheadCursor
          landmarks={landmarks}
          blinkData={blinkData}
          calibration={calibration}
          onDwellComplete={handleDwellComplete}
        />
      )}



      {/* Intelligent Voice Box - Always available */}
      <IntelligentVoiceBox />
    </div>
  );
}

export default App;
