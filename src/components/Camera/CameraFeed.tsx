import { useEffect } from 'react';
import { useCamera } from '../../hooks/useCamera';

interface CameraFeedProps {
  onStreamReady?: (stream: MediaStream) => void;
}

export const CameraFeed: React.FC<CameraFeedProps> = ({ onStreamReady }) => {
  const { videoRef, stream, error, isLoading, startCamera } = useCamera();

  useEffect(() => {
    startCamera();
  }, [startCamera]);

  useEffect(() => {
    if (stream && onStreamReady) {
      onStreamReady(stream);
    }
  }, [stream, onStreamReady]);

  useEffect(() => {
    console.log('Camera state:', { stream: !!stream, error, isLoading });
  }, [stream, error, isLoading]);

  return (
    <>
      {/* Video background - always rendered, full screen, mirrored */}
      <video
        ref={videoRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          objectFit: 'cover',
          zIndex: -1,
          transform: 'scaleX(-1)',
          display: 'block',
          visibility: 'visible',
        }}
        autoPlay
        playsInline
        muted
        onLoadedMetadata={() => console.log('📹 Video metadata loaded')}
        onLoadedData={() => console.log('📹 Video data loaded')}
        onPlay={() => console.log('▶️ Video playing')}
        onPause={() => console.log('⏸️ Video paused')}
        onError={(e) => console.error('❌ Video error:', e)}
      />
      
      {/* Subtle overlay to improve UI visibility */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        zIndex: 1,
        pointerEvents: 'none',
      }} />

      {/* Error overlay */}
      {error && (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          zIndex: 10,
        }}>
          <div className="error-message" style={{ maxWidth: '28rem', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Camera Error</h2>
            <p style={{ marginBottom: '1rem' }}>{error.message}</p>
            <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
              <p style={{ marginBottom: '0.5rem' }}>Error Code: {error.code}</p>
              <p>Please refresh the page and grant camera permissions.</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F8F9FA',
          zIndex: 10,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div className="spinner" style={{ width: '64px', height: '64px', margin: '0 auto 1rem' }}></div>
            <p style={{ color: '#6C757D', fontSize: '1.125rem', fontWeight: 500 }}>
              Initializing camera...
            </p>
          </div>
        </div>
      )}
    </>
  );
};
