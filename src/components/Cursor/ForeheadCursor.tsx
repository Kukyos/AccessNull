import { useEffect, useState, useRef } from 'react';
import type { Point2D, FaceLandmarks, CalibrationSettings, BlinkData } from '../../types';
import { ScreenReader } from '../../utils/screenReader';

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

  // Hide default cursor when face tracking is active
  useEffect(() => {
    // Temporarily disable cursor hiding for debugging
    // document.body.classList.add('cursor-hidden');
    return () => {
      document.body.classList.remove('cursor-hidden');
      // Cleanup any face-hovered class when component unmounts
      if (hoveredElement) {
        hoveredElement.classList.remove('face-hovered');
      }
    };
  }, [hoveredElement]);

  const dwellTimerRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const lastBlinkRef = useRef<boolean>(false);
  const blinkCooldownRef = useRef<boolean>(false);
  const lastSpokenElementRef = useRef<HTMLElement | null>(null);
  
  // Smoothing buffer like ForeHeadDetector (deque with maxlen=5)
  const positionBufferRef = useRef<Array<{ x: number, y: number }>>([]);

  // TTS function for hover feedback
  const speakElementText = (element: HTMLElement) => {
    const screenReader = ScreenReader.getInstance();
    
    // Don't interrupt intro announcement
    if (screenReader.isIntroActive()) {
      console.log('🔊 Skipping cursor hover TTS - intro still active');
      return;
    }

    // Don't repeat the same element
    if (lastSpokenElementRef.current === element) return;
    lastSpokenElementRef.current = element;

    // Get meaningful text from element
    let textToSpeak = '';
    
    // Try different text sources in order of preference
    const ariaLabel = element.getAttribute('aria-label');
    const title = element.getAttribute('title');
    const textContent = element.textContent?.trim();
    const placeholder = element.getAttribute('placeholder');
    const value = (element as HTMLInputElement).value;
    
    // Smart text extraction with context
    if (ariaLabel) {
      textToSpeak = ariaLabel;
    } else if (title) {
      textToSpeak = title;
    } else if (textContent && textContent.length > 0 && textContent.length < 150) {
      // Add context for better understanding
      const tagName = element.tagName.toLowerCase();
      if (tagName === 'button') {
        textToSpeak = `${textContent} button`;
      } else if (tagName === 'a') {
        textToSpeak = `${textContent} link`;
      } else if (element.getAttribute('role') === 'button') {
        textToSpeak = `${textContent} button`;
      } else if (element.hasAttribute('data-hoverable')) {
        textToSpeak = `${textContent} - clickable`;
      } else {
        textToSpeak = textContent;
      }
    } else if (placeholder) {
      textToSpeak = `Input field for ${placeholder}`;
    } else if (value) {
      textToSpeak = `Input field with value ${value}`;
    } else {
      // Smart fallback based on context
      const tagName = element.tagName.toLowerCase();
      const className = element.className;
      const id = element.id;
      
      // Check for specific UI patterns
      if (className.includes('sidebar') || id.includes('sidebar')) {
        textToSpeak = 'Sidebar navigation';
      } else if (className.includes('menu') || id.includes('menu')) {
        textToSpeak = 'Menu item';
      } else if (className.includes('close') || textContent?.includes('×') || textContent?.includes('✕')) {
        textToSpeak = 'Close button';
      } else if (className.includes('back') || textContent?.includes('←')) {
        textToSpeak = 'Back button';
      } else if (tagName === 'button') {
        textToSpeak = 'Button';
      } else if (tagName === 'input') {
        textToSpeak = 'Input field';
      } else if (tagName === 'a') {
        textToSpeak = 'Link';
      } else {
        // Don't announce generic "clickable element" - skip it
        return;
      }
    }

    if (textToSpeak && textToSpeak !== 'Clickable element') {
      console.log('🔊 TTS: Speaking hover text:', textToSpeak);
      
      // Use ScreenReader for consistent speech management
      screenReader.speak(textToSpeak, { rate: 1.3, volume: 0.6, priority: 'low' });
    }
  };

  // Map forehead position to screen coordinates
  useEffect(() => {
    if (!landmarks) return;

    // Throttle updates to 60fps max
    const now = performance.now();
    if (now - lastUpdateRef.current < 16) return; // ~60fps
    lastUpdateRef.current = now;

    const { nose } = landmarks; // nose = direct nose tip position

    // EXACT implementation from ForeHeadDetector:
    // They use: head_y = nose_tip.y (normalized 0-1)
    // Then: target_y = head_y * WINDOW_HEIGHT
    // With sensitivity adjustment
    
    // nose.x and nose.y are already normalized (0-1) from MediaPipe
    // FLIP X because video is mirrored - move right should move cursor right!
    
    // Apply sensitivity to extend range (deviation from center * sensitivity)
    const centerX = 0.5;
    const centerY = 0.5;
    const deviationX = (1 - nose.x) - centerX; // Flipped X
    const deviationY = nose.y - centerY;
    
    const targetX = (centerX + deviationX * calibration.sensitivity) * window.innerWidth;
    const targetY = (centerY + deviationY * calibration.sensitivity) * window.innerHeight;
    
    // Add to smoothing buffer (max 5 samples, like deque(maxlen=5))
    positionBufferRef.current.push({ x: targetX, y: targetY });
    if (positionBufferRef.current.length > 5) {
      positionBufferRef.current.shift(); // Remove oldest
    }
    
    // Calculate average (smoothing)
    const avgX = positionBufferRef.current.reduce((sum, p) => sum + p.x, 0) / positionBufferRef.current.length;
    const avgY = positionBufferRef.current.reduce((sum, p) => sum + p.y, 0) / positionBufferRef.current.length;

    // Clamp to screen bounds with padding
    const finalX = Math.max(20, Math.min(window.innerWidth - 20, avgX));
    const finalY = Math.max(20, Math.min(window.innerHeight - 20, avgY));

    setCursorPosition({ x: finalX, y: finalY });
  }, [landmarks, calibration]);

  // Click detection (blink or mouth)
  useEffect(() => {
    if (!blinkData || !onDwellComplete) return;

    const { isBlinking, isMouthOpen } = blinkData;
    
    // Different trigger logic for blink vs mouth:
    // - Blink: Trigger when eyes CLOSE then OPEN (lastBlinkRef=true, isBlinking=false)
    // - Mouth: Trigger when mouth goes from CLOSED to OPEN (!lastBlinkRef, isMouthOpen=true)
    
    let shouldClick = false;
    
    if (calibration.clickMethod === 'mouth') {
      // Mouth: Click when opening mouth (closed → open)
      shouldClick = !lastBlinkRef.current && isMouthOpen && !blinkCooldownRef.current;
    } else {
      // Blink: Click when closing then opening eyes (closed → open)
      shouldClick = lastBlinkRef.current && !isBlinking && !blinkCooldownRef.current;
    }

    if (shouldClick) {
      // Click triggered! Find element under cursor
      const elementsAtPoint = document.elementsFromPoint(cursorPosition.x, cursorPosition.y);
      const clickableElement = elementsAtPoint.find(
        el => {
          const htmlEl = el as HTMLElement;
          const computedStyle = window.getComputedStyle(htmlEl);
          
          return (
            htmlEl.tagName === 'BUTTON' || 
            htmlEl.tagName === 'A' ||
            htmlEl.tagName === 'INPUT' ||
            htmlEl.hasAttribute('data-hoverable') ||
            htmlEl.hasAttribute('onclick') ||
            htmlEl.getAttribute('role') === 'button' ||
            htmlEl.style.cursor === 'pointer' ||
            htmlEl.classList.contains('clickable') ||
            // Check if element has click event listeners
            htmlEl.onclick !== null ||
            // Check for any element that might be clickable in modals/dialogs
            htmlEl.closest('[role="dialog"]') !== null ||
            htmlEl.closest('.modal') !== null ||
            // Check for voice panel elements (high z-index, positioned fixed)
            (computedStyle.position === 'fixed' && 
             parseInt(computedStyle.zIndex) > 90000 &&
             computedStyle.cursor === 'pointer') ||
            // Check if cursor is pointer (more reliable check)
            computedStyle.cursor === 'pointer'
          );
        }
      ) as HTMLElement | undefined;

      if (clickableElement) {
        const method = calibration.clickMethod === 'mouth' ? '👄 MOUTH OPEN' : '👁️ BLINK';
        console.log(`${method} DETECTED! Clicking:`, clickableElement.textContent?.trim());
        onDwellComplete(clickableElement);
        
        // Cooldown to prevent multiple clicks
        blinkCooldownRef.current = true;
        setTimeout(() => {
          blinkCooldownRef.current = false;
          console.log('🔄 Click cooldown reset');
        }, 800); // 800ms cooldown between clicks
      } else {
        const method = calibration.clickMethod === 'mouth' ? '👄 Mouth open' : '👁️ Blink';
        console.log(`${method} detected but no clickable element under cursor`);
      }
    }

    // Update last state based on method
    const currentState = calibration.clickMethod === 'mouth' ? isMouthOpen : isBlinking;
    lastBlinkRef.current = currentState;
  }, [blinkData, cursorPosition, onDwellComplete, calibration.clickMethod]);

  // Check for hoverable elements under cursor
  useEffect(() => {
    const elementsAtPoint = document.elementsFromPoint(cursorPosition.x, cursorPosition.y);
    
    // Debug what elements we're finding
    console.log('🔍 Elements at cursor point:', elementsAtPoint.slice(0, 5).map(el => ({
      tag: el.tagName,
      text: (el as HTMLElement).textContent?.trim()?.slice(0, 20),
      hoverable: (el as HTMLElement).hasAttribute('data-hoverable'),
      cursor: window.getComputedStyle(el as HTMLElement).cursor,
      zIndex: window.getComputedStyle(el as HTMLElement).zIndex
    })));

    // Find first clickable element with expanded detection
    const clickableElement = elementsAtPoint.find(
      el => {
        const htmlEl = el as HTMLElement;
        const computedStyle = window.getComputedStyle(htmlEl);
        const text = htmlEl.textContent?.trim() || '';
        
        const isClickable = (
          htmlEl.tagName === 'BUTTON' || 
          htmlEl.tagName === 'A' ||
          htmlEl.tagName === 'INPUT' ||
          htmlEl.hasAttribute('data-hoverable') ||
          htmlEl.hasAttribute('onclick') ||
          htmlEl.getAttribute('role') === 'button' ||
          htmlEl.style.cursor === 'pointer' ||
          htmlEl.classList.contains('clickable') ||
          // Check if element has click event listeners
          htmlEl.onclick !== null ||
          // Check for any element that might be clickable in modals/dialogs
          htmlEl.closest('[role="dialog"]') !== null ||
          htmlEl.closest('.modal') !== null ||
          // Enhanced voice panel detection
          (computedStyle.position === 'fixed' && 
           parseInt(computedStyle.zIndex) >= 99999) ||
          // Voice panel specific text detection
          (text.includes('AI Voice') || text.includes('Listen') || text.includes('🤖')) ||
          // Check computed styles for cursor pointer (more reliable)
          computedStyle.cursor === 'pointer'
        );
        
        if (isClickable) {
          console.log('✅ Found clickable element:', {
            tag: htmlEl.tagName,
            text: text.slice(0, 30),
            hoverable: htmlEl.hasAttribute('data-hoverable'),
            zIndex: computedStyle.zIndex,
            position: computedStyle.position
          });
        }
        
        return isClickable;
      }
    ) as HTMLElement | undefined;

    if (clickableElement && clickableElement !== hoveredElement) {
      // New element hovered
      console.log('🎯 Face cursor dwelling on:', {
        text: clickableElement.textContent?.trim() || '(no text)',
        tag: clickableElement.tagName,
        className: clickableElement.className,
        id: clickableElement.id,
        role: clickableElement.getAttribute('role'),
        hasDataHoverable: clickableElement.hasAttribute('data-hoverable'),
        computedCursor: window.getComputedStyle(clickableElement).cursor
      });
      setHoveredElement(clickableElement);
      setDwellProgress(0);
      
      // Speak the element text for accessibility
      speakElementText(clickableElement);
      
      // Also try the screen reader for better context
      const screenReader = ScreenReader.getInstance();
      const smartDescription = screenReader.announceElementDetails(clickableElement);
      const elementText = clickableElement.textContent?.trim();
      if (smartDescription && smartDescription !== elementText) {
        setTimeout(() => {
          screenReader.speak(smartDescription, { rate: 1.3, volume: 0.6 });
        }, 800); // Slight delay after the first announcement
      }
      
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
          lastSpokenElementRef.current = null; // Clear spoken element reference
        } else {
          dwellTimerRef.current = requestAnimationFrame(updateDwell);
        }
      };

      dwellTimerRef.current = requestAnimationFrame(updateDwell);
    } else if (!clickableElement && hoveredElement) {
      // Moved away from element
      console.log('❌ Face cursor left element, resetting dwell');
      if (dwellTimerRef.current) {
        cancelAnimationFrame(dwellTimerRef.current);
      }
      setHoveredElement(null);
      setDwellProgress(0);
      lastSpokenElementRef.current = null; // Clear spoken element reference
    } else if (!clickableElement && elementsAtPoint.length > 0) {
      // Debug: Show what elements are under cursor but not clickable
      const topElements = elementsAtPoint.slice(0, 3).map(el => ({
        tag: el.tagName,
        text: el.textContent?.slice(0, 20) || '(no text)',
        className: (el as HTMLElement).className
      }));
      console.log('🔍 Face cursor over non-clickable elements:', topElements);
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
          zIndex: 9999999, // Much higher than voice panel (999999)
          willChange: 'left, top', // Optimize rendering
        }}
      >
        {/* Main cursor dot */}
        <div style={{ position: 'relative' }}>
          <div style={{
            width: '16px',
            height: '16px',
            backgroundColor: hoveredElement ? 'rgba(59, 130, 246, 0.9)' : 'rgba(156, 163, 175, 0.6)', // Blue when hovering, gray when not
            borderRadius: '50%',
            boxShadow: hoveredElement 
              ? '0 0 20px rgba(59, 130, 246, 0.8), 0 0 40px rgba(59, 130, 246, 0.4)' 
              : '0 2px 8px rgba(0, 0, 0, 0.15)',
            border: hoveredElement ? '2px solid rgba(255, 255, 255, 0.9)' : '1px solid rgba(255, 255, 255, 0.4)',
            transition: 'all 0.2s ease',
            opacity: hoveredElement ? 1 : 0.4,
            transform: hoveredElement ? 'scale(1.2)' : 'scale(1)', // Slightly bigger when hovering
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
