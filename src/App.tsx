import { useState, useCallback, useRef, useEffect } from 'react';
import { CameraFeed } from './components/Camera/CameraFeed';
import { ForeheadCursor } from './components/Cursor/ForeheadCursor';
import { useFaceTracking } from './hooks/useFaceTracking';
import { ChatScreen } from './screens/ChatScreen';
import type { CalibrationSettings, AppScreen } from './types';

function App() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('loading');
  const [showDebug, setShowDebug] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Default calibration settings - matching ForeHeadDetector
  const [calibration, setCalibration] = useState<CalibrationSettings>({
    sensitivity: 1.8, // Match ForeHeadDetector's HEAD_CONTROL_SENSITIVITY
    smoothing: 0.1,   // Lower = more responsive (using 5-frame buffer in cursor)
    dwellTime: 1500,
    blinkEnabled: false,
    clickMethod: 'blink', // Default to blink, can switch to mouth
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

  // Failsafe: Force menu after 5 seconds regardless
  useEffect(() => {
    const failsafeTimer = setTimeout(() => {
      if (currentScreen === 'loading') {
        console.log('⚠️ FAILSAFE: Forcing menu screen after 5 seconds');
        setCurrentScreen('menu');
      }
    }, 5000);
    return () => clearTimeout(failsafeTimer);
  }, [currentScreen]);

  return (
    <div className="cursor-hidden">
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
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
          </div>
        </div>
      )}

      {/* Main Menu */}
      {currentScreen === 'menu' && (
        <>
          {/* Header */}
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%)',
            padding: '2rem',
            zIndex: 10,
          }}>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: 'bold',
              color: 'white',
              textShadow: '0 2px 10px rgba(0,0,0,0.5)',
              margin: 0,
            }}>
              🏥 AccessPoint
            </h1>
            <p style={{
              fontSize: '1.125rem',
              color: 'rgba(255,255,255,0.9)',
              textShadow: '0 1px 5px rgba(0,0,0,0.5)',
              margin: '0.5rem 0 0 0',
            }}>
              Hands-Free Medical Interface
            </p>
          </div>

          {/* Main Menu Cards */}
          <div style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            zIndex: 10,
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '1.5rem',
              maxWidth: '1000px',
              width: '100%',
            }}>
              {/* Medical Records */}
              <button
                data-hoverable
                onClick={() => setCurrentScreen('prescriptions')}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '1rem',
                  padding: '2.5rem',
                  color: 'white',
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  textAlign: 'left',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(231, 76, 60, 0.3)';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                <div>Medical Records</div>
                <div style={{ fontSize: '0.875rem', opacity: 0.8, marginTop: '0.5rem' }}>
                  View prescriptions & history
                </div>
              </button>

              {/* Emergency Contact */}
              <button
                data-hoverable
                onClick={() => setCurrentScreen('emergency')}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '1rem',
                  padding: '2.5rem',
                  color: 'white',
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  textAlign: 'left',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(231, 76, 60, 0.3)';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚨</div>
                <div>Emergency</div>
                <div style={{ fontSize: '0.875rem', opacity: 0.8, marginTop: '0.5rem' }}>
                  Contact doctor immediately
                </div>
              </button>

              {/* Campus Accessibility */}
              <button
                data-hoverable
                onClick={() => setCurrentScreen('campus-info')}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '1rem',
                  padding: '2.5rem',
                  color: 'white',
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  textAlign: 'left',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(231, 76, 60, 0.3)';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>♿</div>
                <div>Accessibility</div>
                <div style={{ fontSize: '0.875rem', opacity: 0.8, marginTop: '0.5rem' }}>
                  Campus navigation & info
                </div>
              </button>

              {/* AI Assistant */}
              <button
                data-hoverable
                onClick={() => setCurrentScreen('chat')}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '1rem',
                  padding: '2.5rem',
                  color: 'white',
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  textAlign: 'left',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(231, 76, 60, 0.3)';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤖</div>
                <div>AI Assistant</div>
                <div style={{ fontSize: '0.875rem', opacity: 0.8, marginTop: '0.5rem' }}>
                  Multilingual medical help
                </div>
              </button>
            </div>
          </div>

          {/* Bottom Sidebar */}
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(0deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%)',
            padding: '1.5rem 2rem',
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            zIndex: 10,
          }}>
            <button
              data-hoverable
              onClick={() => setCurrentScreen('settings')}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '0.75rem',
                padding: '1rem 2rem',
                color: 'white',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>⚙️</span>
              Settings
            </button>
            <button
              data-hoverable
              onClick={() => alert('Help & Tutorial')}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '0.75rem',
                padding: '1rem 2rem',
                color: 'white',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>❓</span>
              Help
            </button>
            <button
              data-hoverable
              onClick={() => alert('Signing out...')}
              style={{
                background: 'rgba(231, 76, 60, 0.3)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(231, 76, 60, 0.5)',
                borderRadius: '0.75rem',
                padding: '1rem 2rem',
                color: 'white',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>🚪</span>
              Sign Out
            </button>
          </div>
        </>
      )}

      {/* Chat Screen */}
      {currentScreen === 'chat' && <ChatScreen onClose={() => setCurrentScreen('menu')} />}

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

      {/* Settings Screen */}
      {currentScreen === 'settings' && (
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
            maxWidth: '600px',
            width: '90%',
          }}>
            <h2 style={{ color: 'white', fontSize: '2.5rem', margin: '0 0 2rem 0' }}>
              ⚙️ Settings
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Sensitivity Setting */}
              <div>
                <label style={{ color: 'white', display: 'block', marginBottom: '0.5rem', fontSize: '1.125rem' }}>
                  Cursor Sensitivity: {calibration.sensitivity.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={calibration.sensitivity}
                  onChange={(e) => setCalibration(prev => ({ ...prev, sensitivity: parseFloat(e.target.value) }))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>
              {/* Smoothing Setting */}
              <div>
                <label style={{ color: 'white', display: 'block', marginBottom: '0.5rem', fontSize: '1.125rem' }}>
                  Smoothing: {calibration.smoothing.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.1"
                  value={calibration.smoothing}
                  onChange={(e) => setCalibration(prev => ({ ...prev, smoothing: parseFloat(e.target.value) }))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>
              {/* Dwell Time Setting */}
              <div>
                <label style={{ color: 'white', display: 'block', marginBottom: '0.5rem', fontSize: '1.125rem' }}>
                  Click Dwell Time: {calibration.dwellTime}ms
                </label>
                <input
                  type="range"
                  min="500"
                  max="3000"
                  step="100"
                  value={calibration.dwellTime}
                  onChange={(e) => setCalibration(prev => ({ ...prev, dwellTime: parseInt(e.target.value) }))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>
              
              {/* Click Method Setting */}
              <div>
                <label style={{ color: 'white', display: 'block', marginBottom: '0.75rem', fontSize: '1.125rem' }}>
                  Click Method
                </label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button
                    data-hoverable
                    onClick={() => setCalibration(prev => ({ ...prev, clickMethod: 'blink' }))}
                    style={{
                      flex: 1,
                      padding: '1rem',
                      borderRadius: '0.75rem',
                      border: calibration.clickMethod === 'blink' ? '3px solid #27AE60' : '2px solid rgba(255, 255, 255, 0.3)',
                      background: calibration.clickMethod === 'blink' ? 'rgba(39, 174, 96, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      fontSize: '1rem',
                      cursor: 'pointer',
                      fontWeight: calibration.clickMethod === 'blink' ? 'bold' : 'normal',
                    }}
                  >
                    👁️ Blink
                  </button>
                  <button
                    data-hoverable
                    onClick={() => setCalibration(prev => ({ ...prev, clickMethod: 'mouth' }))}
                    style={{
                      flex: 1,
                      padding: '1rem',
                      borderRadius: '0.75rem',
                      border: calibration.clickMethod === 'mouth' ? '3px solid #27AE60' : '2px solid rgba(255, 255, 255, 0.3)',
                      background: calibration.clickMethod === 'mouth' ? 'rgba(39, 174, 96, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      fontSize: '1rem',
                      cursor: 'pointer',
                      fontWeight: calibration.clickMethod === 'mouth' ? 'bold' : 'normal',
                    }}
                  >
                    👄 Mouth Open
                  </button>
                </div>
                <p style={{ fontSize: '0.875rem', opacity: 0.8, margin: '0.5rem 0 0 0', color: 'white' }}>
                  {calibration.clickMethod === 'blink' 
                    ? 'Blink both eyes to click buttons' 
                    : 'Open your mouth wide to click buttons'}
                </p>
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

      {/* Forehead cursor - only show when tracking is active */}
      {landmarks && currentScreen !== 'loading' && (
        <ForeheadCursor
          landmarks={landmarks}
          blinkData={blinkData}
          calibration={calibration}
          onDwellComplete={handleDwellComplete}
        />
      )}

      {/* Debug info toggle button */}
      {landmarks && (
        <button
          onClick={() => setShowDebug(!showDebug)}
          style={{
            position: 'fixed',
            bottom: '1rem',
            right: '1rem',
            background: 'rgba(0, 0, 0, 0.6)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            fontSize: '1.2rem',
            cursor: 'pointer',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={showDebug ? 'Hide debug info' : 'Show debug info'}
        >
          {showDebug ? '✕' : 'ℹ️'}
        </button>
      )}

      {/* Debug info panel (collapsible) */}
      {landmarks && showDebug && (
        <div style={{
          position: 'fixed',
          bottom: '4rem',
          right: '1rem',
          background: 'rgba(0, 0, 0, 0.85)',
          color: 'white',
          padding: '0.75rem',
          borderRadius: '0.5rem',
          fontSize: '0.75rem',
          zIndex: 50,
          fontFamily: 'monospace',
          maxWidth: '200px',
        }}>
          <div style={{ marginBottom: '0.25rem' }}>✓ {currentScreen}</div>
          {blinkData && (
            <>
              <div style={{ marginTop: '0.25rem' }}>
                👁️ {blinkData.isBlinking ? '🟢' : '⚪'} L:{(blinkData.leftEyeClosed * 100).toFixed(0)}% R:{(blinkData.rightEyeClosed * 100).toFixed(0)}%
              </div>
              <div style={{ marginTop: '0.25rem' }}>
                👄 {blinkData.isMouthOpen ? '🟢' : '⚪'} {(blinkData.mouthOpen * 100).toFixed(0)}%
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', opacity: 0.7, borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '0.25rem' }}>
                {calibration.clickMethod === 'blink' ? '👁️ Blink' : '👄 Mouth'}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
