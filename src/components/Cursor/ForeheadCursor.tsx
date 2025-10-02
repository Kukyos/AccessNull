import { useEffect, useState, useRef } from 'react';
import type { Point2D, FaceLandmarks, CalibrationSettings, BlinkData } from '../../types';

interface ForeheadCursorProps {
  landmarks: FaceLandmarks | null;
  blinkData: BlinkData | null;
  calibration: CalibrationSettings;
  onDwellComplete?: (element: HTMLElement) => void;
}

export const ForeheadCursor: React.FC<ForeheadCursorProps> = ({
  landmarks,
  blinkData,
  calibration,
  onDwellComplete,
}) => {
  const [cursorPosition, setCursorPosition] = useState<Point2D>({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [dwellProgress, setDwellProgress] = useState(0);
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);

  const dwellTimerRef = useRef<number | null>(null);
  const smoothedPositionRef = useRef<Point2D>({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const lastUpdateRef = useRef<number>(0);
  const lastBlinkRef = useRef<boolean>(false);
  const blinkCooldownRef = useRef<boolean>(false);

  // Map forehead position to screen coordinates with throttling
  useEffect(() => {
    if (!landmarks) return;

    // Throttle updates to 60fps max
    const now = performance.now();
    if (now - lastUpdateRef.current < 16) return; // ~60fps
    lastUpdateRef.current = now;

    const { nose } = landmarks; // nose.x = rotation ratio (0-1), nose.y = vertical position

    // Use HEAD ROTATION for horizontal cursor movement!
    // Turn head left/right instead of moving it side to side
    // Much more natural and doesn't require repositioning
    
    const rotationRatio = nose.x; // 0.5 = center, <0.5 = looking right, >0.5 = looking left
    const verticalPosition = nose.y; // 0-1 vertical position
    
    // Apply sensitivity to rotation
    // Amplify small head turns into big cursor movements
    const centerRotation = 0.5;
    const rotationDeviation = (rotationRatio - centerRotation) * calibration.sensitivity;
    
    // Map rotation to horizontal screen position
    // Video is mirrored, so flip the rotation
    const targetX = (0.5 - rotationDeviation) * window.innerWidth;
    
    // Apply sensitivity to vertical position
    const centerY = 0.5;
    const verticalDeviation = (verticalPosition - centerY) * calibration.sensitivity;
    const targetY = (0.5 + verticalDeviation) * window.innerHeight;
    
    // Apply smoothing
    const smoothing = calibration.smoothing;
    const smoothedX = smoothedPositionRef.current.x * smoothing + targetX * (1 - smoothing);
    const smoothedY = smoothedPositionRef.current.y * smoothing + targetY * (1 - smoothing);
    
    smoothedPositionRef.current = { x: smoothedX, y: smoothedY };

    // Clamp to screen bounds with padding
    const finalX = Math.max(20, Math.min(window.innerWidth - 20, smoothedX));
    const finalY = Math.max(20, Math.min(window.innerHeight - 20, smoothedY));

    setCursorPosition({ x: finalX, y: finalY });
  }, [landmarks, calibration]);

  // Blink detection for clicking
  useEffect(() => {
    if (!blinkData || !onDwellComplete) return;

    const { isBlinking } = blinkData;

    // Detect blink transition (eyes closed -> eyes open)
    if (lastBlinkRef.current && !isBlinking && !blinkCooldownRef.current) {
      // Blink detected! Find element under cursor
      const elementsAtPoint = document.elementsFromPoint(cursorPosition.x, cursorPosition.y);
      const clickableElement = elementsAtPoint.find(
        el => 
          el.tagName === 'BUTTON' || 
          el.tagName === 'A' ||
          el.hasAttribute('data-hoverable')
      ) as HTMLElement | undefined;

      if (clickableElement) {
        console.log('👁️✅ BLINK DETECTED! Clicking:', clickableElement.textContent?.trim());
        onDwellComplete(clickableElement);
        
        // Cooldown to prevent multiple clicks
        blinkCooldownRef.current = true;
        setTimeout(() => {
          blinkCooldownRef.current = false;
          console.log('🔄 Blink cooldown reset');
        }, 800); // 800ms cooldown between blinks
      } else {
        console.log('👁️ Blink detected but no clickable element under cursor');
      }
    }

    lastBlinkRef.current = isBlinking;
  }, [blinkData, cursorPosition, onDwellComplete]);

  // Check for hoverable elements under cursor
  useEffect(() => {
    const elementsAtPoint = document.elementsFromPoint(cursorPosition.x, cursorPosition.y);
    
    // Find first clickable element (button, link, or has data-hoverable attribute)
    const clickableElement = elementsAtPoint.find(
      el => 
        el.tagName === 'BUTTON' || 
        el.tagName === 'A' ||
        el.hasAttribute('data-hoverable')
    ) as HTMLElement | undefined;

    if (clickableElement && clickableElement !== hoveredElement) {
      // New element hovered
      console.log('🎯 Started dwelling on:', clickableElement.textContent?.trim() || clickableElement.tagName);
      setHoveredElement(clickableElement);
      setDwellProgress(0);
      
      // Start dwell timer
      const startTime = Date.now();
      const updateDwell = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / calibration.dwellTime) * 100, 100);
        setDwellProgress(progress);

        // Log progress every 25%
        if (progress === 25 || progress === 50 || progress === 75) {
          console.log(`⏱️ Dwell progress: ${progress.toFixed(0)}%`);
        }

        if (progress >= 100) {
          // Dwell complete!
          console.log('✅✅✅ DWELL COMPLETE AT 100%! ✅✅✅');
          console.log('Calling onDwellComplete with element:', clickableElement);
          console.log('onDwellComplete function exists?', !!onDwellComplete);
          
          if (onDwellComplete && clickableElement) {
            console.log('🚀 Calling onDwellComplete NOW!');
            onDwellComplete(clickableElement);
            console.log('✅ onDwellComplete called successfully');
          } else {
            console.error('❌ Cannot call onDwellComplete:', { 
              hasCallback: !!onDwellComplete, 
              hasElement: !!clickableElement 
            });
          }
          setDwellProgress(0);
          setHoveredElement(null);
        } else {
          dwellTimerRef.current = requestAnimationFrame(updateDwell);
        }
      };

      dwellTimerRef.current = requestAnimationFrame(updateDwell);
    } else if (!clickableElement && hoveredElement) {
      // Moved away from element
      console.log('❌ Left element, resetting dwell');
      if (dwellTimerRef.current) {
        cancelAnimationFrame(dwellTimerRef.current);
      }
      setHoveredElement(null);
      setDwellProgress(0);
    }

    return () => {
      if (dwellTimerRef.current) {
        cancelAnimationFrame(dwellTimerRef.current);
      }
    };
  }, [cursorPosition, hoveredElement, calibration.dwellTime, onDwellComplete]);

  return (
    <>
      {/* Custom cursor */}
      <div
        style={{
          position: 'fixed',
          left: cursorPosition.x,
          top: cursorPosition.y,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 9999, // Highest z-index to always be visible
          willChange: 'left, top', // Optimize rendering
        }}
      >
        {/* Main cursor dot */}
        <div style={{ position: 'relative' }}>
          <div style={{
            width: '24px',
            height: '24px',
            backgroundColor: hoveredElement ? '#27AE60' : '#E74C3C', // Green when hovering
            borderRadius: '50%',
            boxShadow: hoveredElement ? '0 0 20px rgba(39, 174, 96, 0.6)' : '0 4px 6px rgba(0, 0, 0, 0.1)',
            border: '2px solid white',
            transition: 'background-color 0.2s, box-shadow 0.2s',
          }} />
          
          {/* Dwell progress indicator */}
          {dwellProgress > 0 && (
            <svg
              style={{
                position: 'absolute',
                inset: 0,
                margin: '-16px',
                width: '56px',
                height: '56px',
                transform: 'rotate(-90deg)',
              }}
            >
              <circle
                cx="28"
                cy="28"
                r="24"
                fill="none"
                stroke="white"
                strokeWidth="3"
                opacity="0.3"
              />
              <circle
                cx="28"
                cy="28"
                r="24"
                fill="none"
                stroke="#E74C3C"
                strokeWidth="3"
                strokeDasharray="150.8"
                strokeDashoffset={150.8 * (1 - dwellProgress / 100)}
                style={{
                  transition: 'stroke-dashoffset 0.1s linear',
                }}
              />
            </svg>
          )}
        </div>
      </div>

      {/* Highlight hovered element */}
      {hoveredElement && (
        <div
          style={{
            position: 'fixed',
            left: hoveredElement.getBoundingClientRect().left - 4,
            top: hoveredElement.getBoundingClientRect().top - 4,
            width: hoveredElement.getBoundingClientRect().width + 8,
            height: hoveredElement.getBoundingClientRect().height + 8,
            pointerEvents: 'none',
            zIndex: 9998, // Just below cursor
            border: '4px solid #27AE60',
            borderRadius: '0.75rem',
            boxShadow: '0 0 20px rgba(39, 174, 96, 0.4)',
            transition: 'all 0.2s',
            animation: 'pulse 1s ease-in-out infinite',
          }}
        />
      )}
    </>
  );
};
