import { useState, useRef, useEffect, useCallback } from 'react';
import type { CameraError } from '../types';

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  error: CameraError | null;
  isLoading: boolean;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
}

export const useCamera = (): UseCameraReturn => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<CameraError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });

      // Wait for videoRef to be ready with retry mechanism
      let retries = 0;
      const maxRetries = 20; // 2 seconds max
      while (!videoRef.current && retries < maxRetries) {
        console.log(`⏳ Waiting for video element... (attempt ${retries + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
      }

      if (videoRef.current) {
        console.log('📹 Setting video srcObject');
        videoRef.current.srcObject = mediaStream;
        
        // Wait for video to be ready before playing
        await new Promise<void>((resolve, reject) => {
          const video = videoRef.current!;
          const timeout = setTimeout(() => reject(new Error('Video load timeout')), 5000);
          
          const onCanPlay = () => {
            clearTimeout(timeout);
            video.removeEventListener('canplay', onCanPlay);
            video.removeEventListener('error', onError);
            resolve();
          };
          
          const onError = () => {
            clearTimeout(timeout);
            video.removeEventListener('canplay', onCanPlay);
            video.removeEventListener('error', onError);
            reject(new Error('Video load error'));
          };
          
          video.addEventListener('canplay', onCanPlay);
          video.addEventListener('error', onError);
          
          // If already can play, resolve immediately
          if (video.readyState >= 3) {
            clearTimeout(timeout);
            resolve();
          }
        });
        
        // Now play the video (won't be interrupted)
        try {
          await videoRef.current.play();
          console.log('▶️ Video playing');
        } catch (playError) {
          console.warn('Play error (ignoring):', playError);
          // Ignore play errors as video might auto-play
        }
      } else {
        console.error('❌ videoRef.current is still null after waiting!');
        throw new Error('Video element not available after waiting 2 seconds');
      }

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setIsLoading(false);
      console.log('✅ Camera started successfully');
    } catch (err) {
      console.error('Camera Error:', err);
      
      let cameraError: CameraError;
      const errorDetails = err instanceof Error ? `\n\nDetails: ${err.message}\n\nStack: ${err.stack}` : `\n\nRaw error: ${JSON.stringify(err, null, 2)}`;
      
      if (err instanceof DOMException) {
        switch (err.name) {
          case 'NotAllowedError':
          case 'PermissionDeniedError':
            cameraError = {
              code: 'PERMISSION_DENIED',
              message: `Camera permission denied. Please allow camera access in your browser settings.${errorDetails}`,
            };
            break;
          case 'NotFoundError':
          case 'DevicesNotFoundError':
            cameraError = {
              code: 'NOT_FOUND',
              message: `No camera found. Please connect a webcam and try again.${errorDetails}`,
            };
            break;
          case 'NotReadableError':
          case 'TrackStartError':
            cameraError = {
              code: 'NOT_READABLE',
              message: `Camera is already in use by another application.${errorDetails}`,
            };
            break;
          default:
            cameraError = {
              code: 'UNKNOWN',
              message: `Camera error (${err.name}): ${err.message}${errorDetails}`,
            };
        }
      } else {
        cameraError = {
          code: 'UNKNOWN',
          message: `Unknown camera error occurred.${errorDetails}`,
        };
      }

      setError(cameraError);
      setIsLoading(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    console.log('Stopping camera');
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  // Cleanup only on unmount
  useEffect(() => {
    return () => {
      console.log('Component unmounting, cleaning up camera');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          console.log('Stopping track:', track.kind);
          track.stop();
        });
      }
    };
  }, []); // Empty array = only run on mount/unmount

  return {
    videoRef,
    stream,
    error,
    isLoading,
    startCamera,
    stopCamera,
  };
};
