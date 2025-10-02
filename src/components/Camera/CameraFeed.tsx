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

  if (error) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        zIndex: 0,
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
    );
  }

  if (isLoading) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8F9FA',
        zIndex: 0,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: '64px', height: '64px', margin: '0 auto 1rem' }}></div>
          <p style={{ color: '#6C757D', fontSize: '1.125rem', fontWeight: 500 }}>
            Initializing camera...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Video background - full screen, mirrored */}
      <video
        ref={videoRef}
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0,
          transform: 'scaleX(-1)',
        }}
        autoPlay
        playsInline
        muted
        onLoadedMetadata={() => console.log('Video metadata loaded')}
        onLoadedData={() => console.log('Video data loaded')}
        onPlay={() => console.log('Video playing')}
        onPause={() => console.log('Video paused')}
        onError={(e) => console.error('Video error:', e)}
      />
      
      {/* Subtle overlay to improve UI visibility */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        zIndex: 0,
        pointerEvents: 'none',
      }} />
    </>
  );
};
