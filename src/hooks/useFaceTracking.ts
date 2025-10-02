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
          setIsLoading(false);
          console.log('MediaPipe initialized successfully');
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

    // MediaPipe Face Mesh landmark indices (478 total landmarks):
    // Nose tip: 1 (most reliable center point)
    // Between eyebrows (glabella): 168
    // Left eye center: 468
    // Right eye center: 473
    // Using HEAD ROTATION (YAW) for cursor control
    // This is much more natural - just turn your head left/right, no position movement needed!
    
    const noseTip = face[1];          // Nose tip
    const leftEar = face[234];        // Left side of face (near ear)
    const rightEar = face[454];       // Right side of face (near ear)
    
    // Calculate head rotation (yaw) based on horizontal face landmarks
    // When you turn head left, right landmarks move toward center
    // When you turn head right, left landmarks move toward center
    const faceWidth = Math.abs(rightEar.x - leftEar.x);
    
    // Calculate horizontal rotation ratio
    // 0.5 = facing center, < 0.5 = turned right, > 0.5 = turned left
    const leftVisibility = (noseTip.x - leftEar.x) / faceWidth;
    const rightVisibility = (rightEar.x - noseTip.x) / faceWidth;
    const rotationRatio = leftVisibility / (leftVisibility + rightVisibility);
    
    // Calculate vertical position (nodding up/down) from nose height
    const verticalPosition = noseTip.y;
    
    return {
      forehead: { x: noseTip.x, y: noseTip.y },
      leftEye: { x: face[468].x, y: face[468].y },
      rightEye: { x: face[473].x, y: face[473].y },
      nose: { x: rotationRatio, y: verticalPosition }, // X = rotation (0-1), Y = vertical pos
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

        // Extract blink data from blendshapes
        if (result.faceBlendshapes && result.faceBlendshapes.length > 0) {
          const blendshapes = result.faceBlendshapes[0];
          
          // Find eye blink blendshapes
          const leftEyeBlink = blendshapes.categories.find(c => c.categoryName === 'eyeBlinkLeft');
          const rightEyeBlink = blendshapes.categories.find(c => c.categoryName === 'eyeBlinkRight');
          
          const leftClosed = leftEyeBlink?.score || 0;
          const rightClosed = rightEyeBlink?.score || 0;
          
          // VERY LOW threshold for detecting a blink (0.2 = 20% closed)
          const BLINK_THRESHOLD = 0.2;
          const isBlinking = leftClosed > BLINK_THRESHOLD && rightClosed > BLINK_THRESHOLD;
          
          // Log raw values every 120 frames for debugging (less spam)
          if (frameCount % 120 === 0) {
            console.log(`👁️ Blink values - Left: ${(leftClosed * 100).toFixed(1)}%, Right: ${(rightClosed * 100).toFixed(1)}%, Threshold: ${(BLINK_THRESHOLD * 100)}%`);
          }
          
          setBlinkData({
            leftEyeClosed: leftClosed,
            rightEyeClosed: rightClosed,
            isBlinking,
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
