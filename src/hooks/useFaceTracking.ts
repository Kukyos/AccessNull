import { useState, useEffect, useCallback, useRef } from 'react';
import { FaceLandmarker, FilesetResolver, type FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import type { FaceLandmarks, MediaPipeError, BlinkData } from '../types';

interface UseFaceTrackingReturn {
  landmarks: FaceLandmarks | null;
  blinkData: BlinkData | null;
  error: MediaPipeError | null;
  isLoading: boolean;
  isTracking: boolean;
}

export const useFaceTracking = (
  videoElement: HTMLVideoElement | null,
  stream: MediaStream | null
): UseFaceTrackingReturn => {
  const [landmarks, setLandmarks] = useState<FaceLandmarks | null>(null);
  const [blinkData, setBlinkData] = useState<BlinkData | null>(null);
  const [error, setError] = useState<MediaPipeError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTracking, setIsTracking] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize MediaPipe Face Landmarker
  useEffect(() => {
    let isMounted = true;

    const initializeFaceLandmarker = async () => {
      try {
        console.log('Initializing MediaPipe Face Landmarker...');
        
        const filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        const faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          outputFaceBlendshapes: true, // Enable blendshapes for blink detection
          runningMode: 'VIDEO',
          numFaces: 1,
          minFaceDetectionConfidence: 0.5, // Lower threshold for better detection
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        if (isMounted) {
          faceLandmarkerRef.current = faceLandmarker;
          console.log('✅ MediaPipe initialized successfully');
          console.log('🔄 Setting isLoading to false');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('MediaPipe initialization error:', err);
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          const errorStack = err instanceof Error ? err.stack : '';
          setError({
            code: 'LOAD_FAILED',
            message: `Failed to load MediaPipe: ${errorMessage}\n\nFull error: ${JSON.stringify(err, null, 2)}${errorStack ? '\n\nStack: ' + errorStack : ''}`,
          });
          setIsLoading(false);
        }
      }
    };

    initializeFaceLandmarker();

    return () => {
      isMounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      faceLandmarkerRef.current?.close();
    };
  }, []);

  // Wait for video to be ready
  useEffect(() => {
    if (!videoElement) {
      setVideoReady(false);
      return;
    }

    const checkVideoReady = () => {
      if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
        console.log(`Video ready: ${videoElement.videoWidth}x${videoElement.videoHeight}`);
        setVideoReady(true);
      }
    };

    // Check immediately
    checkVideoReady();

    // Also listen for loadedmetadata event
    videoElement.addEventListener('loadedmetadata', checkVideoReady);
    videoElement.addEventListener('loadeddata', checkVideoReady);

    return () => {
      videoElement.removeEventListener('loadedmetadata', checkVideoReady);
      videoElement.removeEventListener('loadeddata', checkVideoReady);
    };
  }, [videoElement]);

  // Extract forehead and eye landmarks from result
  const extractLandmarks = useCallback((result: FaceLandmarkerResult): FaceLandmarks | null => {
    if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
      return null;
    }

    const face = result.faceLandmarks[0];

    // Use EXACTLY the same method as ForeHeadDetector
    // They simply use nose_tip directly: nose_tip.y is already normalized 0-1
    const noseTip = face[1]; // Nose tip - this is the tracking point
    
    return {
      forehead: { x: face[10].x, y: face[10].y },
      leftEye: { x: face[468].x, y: face[468].y },
      rightEye: { x: face[473].x, y: face[473].y },
      nose: { x: noseTip.x, y: noseTip.y }, // Direct nose tip, no averaging
    };
  }, []);

  // Detection loop
  useEffect(() => {
    if (!faceLandmarkerRef.current || !videoElement || !stream || isLoading || !videoReady) {
      return;
    }

    setIsTracking(true);
    let lastVideoTime = -1;
    let frameCount = 0;

    const detectFace = async () => {
      if (!videoElement || !faceLandmarkerRef.current) return;

      // Check video dimensions are valid before processing
      if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
        animationFrameRef.current = requestAnimationFrame(detectFace);
        return;
      }

      const currentTime = videoElement.currentTime;
      if (currentTime === lastVideoTime) {
        animationFrameRef.current = requestAnimationFrame(detectFace);
        return;
      }
      lastVideoTime = currentTime;

      // Process every frame for maximum responsiveness
      frameCount++;

      try {
        const startTime = performance.now();
        const result = faceLandmarkerRef.current.detectForVideo(videoElement, Date.now());
        const extractedLandmarks = extractLandmarks(result);
        
        if (extractedLandmarks) {
          setLandmarks(extractedLandmarks);
          setError(null);
        }

        // Extract blink and mouth data from blendshapes
        if (result.faceBlendshapes && result.faceBlendshapes.length > 0) {
          const blendshapes = result.faceBlendshapes[0];
          
          // Find eye blink blendshapes
          const leftEyeBlink = blendshapes.categories.find(c => c.categoryName === 'eyeBlinkLeft');
          const rightEyeBlink = blendshapes.categories.find(c => c.categoryName === 'eyeBlinkRight');
          
          const leftClosed = leftEyeBlink?.score || 0;
          const rightClosed = rightEyeBlink?.score || 0;
          
          // Higher threshold to prevent false positives (0.5 = 50% closed)
          const BLINK_THRESHOLD = 0.5;
          const isBlinking = leftClosed > BLINK_THRESHOLD && rightClosed > BLINK_THRESHOLD;
          
          // Find mouth open blendshape (jawOpen is the most reliable)
          const jawOpen = blendshapes.categories.find(c => c.categoryName === 'jawOpen');
          const mouthOpenValue = jawOpen?.score || 0;
          
          // Threshold for mouth open detection (0.4 = 40% open)
          const MOUTH_THRESHOLD = 0.4;
          const isMouthOpen = mouthOpenValue > MOUTH_THRESHOLD;
          
          // Log raw values every 120 frames for debugging (less spam)
          if (frameCount % 120 === 0) {
            console.log(`👁️ Blink: L=${(leftClosed * 100).toFixed(1)}%, R=${(rightClosed * 100).toFixed(1)}% | 👄 Mouth: ${(mouthOpenValue * 100).toFixed(1)}%`);
          }
          
          setBlinkData({
            leftEyeClosed: leftClosed,
            rightEyeClosed: rightClosed,
            isBlinking,
            mouthOpen: mouthOpenValue,
            isMouthOpen,
          });
        } else {
          console.warn('⚠️ No blendshapes data available');
        }

        // Log performance every 60 frames
        if (frameCount % 60 === 0) {
          const processingTime = performance.now() - startTime;
          console.log(`Face detection: ${processingTime.toFixed(2)}ms per frame`);
        }
      } catch (err) {
        console.error('Detection error:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        const errorStack = err instanceof Error ? err.stack : '';
        setError({
          code: 'DETECTION_FAILED',
          message: `Face detection failed: ${errorMessage}${errorStack ? '\n\nStack: ' + errorStack : ''}`,
        });
      }

      animationFrameRef.current = requestAnimationFrame(detectFace);
    };

    detectFace();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setIsTracking(false);
    };
  }, [videoElement, stream, isLoading, videoReady, extractLandmarks]);

  return {
    landmarks,
    blinkData,
    error,
    isLoading,
    isTracking,
  };
};
