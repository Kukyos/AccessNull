/**
 * Universal Button Component
 * Accessible button that works with all input methods
 */

import React, { forwardRef, useEffect, useState } from 'react';
import type { UniversalButtonProps, HapticPattern } from '../../types';

export const UniversalButton = forwardRef<HTMLButtonElement, UniversalButtonProps>(
  ({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    icon,
    iconPosition = 'left',
    fullWidth = false,
    voiceCommand,
    hapticFeedback,
    ariaLabel,
    tooltip,
    confirmAction = false,
    className = '',
    onClick,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
    ...props
  }, ref) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [isPendingConfirmation, setIsPendingConfirmation] = useState(false);

    // Register voice command if provided
    useEffect(() => {
      if (voiceCommand && typeof window !== 'undefined') {
        // TODO: Register with voice command service
        console.log(`Voice command registered: "${voiceCommand}"`);
      }
    }, [voiceCommand]);

    // Haptic feedback function
    const triggerHaptic = (pattern?: HapticPattern) => {
      if (pattern && navigator.vibrate) {
        navigator.vibrate(pattern.pattern);
      } else if (navigator.vibrate) {
        // Default haptic feedback
        navigator.vibrate([50]);
      }
    };

    // Handle click with confirmation if needed
    const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || loading) return;

      // Trigger haptic feedback
      if (hapticFeedback) {
        triggerHaptic(hapticFeedback);
      }

      // Handle confirmation flow
      if (confirmAction && !isPendingConfirmation) {
        setIsPendingConfirmation(true);
        // Auto-cancel confirmation after 3 seconds
        setTimeout(() => setIsPendingConfirmation(false), 3000);
        return;
      }

      // Execute click handler
      if (onClick) {
        setIsPendingConfirmation(false);
        onClick(event);
      }
    };

    // Handle mouse events
    const handleMouseEnter = (event: React.MouseEvent<HTMLButtonElement>) => {
      setIsHovered(true);
      if (onMouseEnter) onMouseEnter(event);
    };

    const handleMouseLeave = (event: React.MouseEvent<HTMLButtonElement>) => {
      setIsHovered(false);
      setIsPendingConfirmation(false); // Cancel confirmation on mouse leave
      if (onMouseLeave) onMouseLeave(event);
    };

    // Handle focus events
    const handleFocus = (event: React.FocusEvent<HTMLButtonElement>) => {
      setIsFocused(true);
      if (onFocus) onFocus(event);
    };

    const handleBlur = (event: React.FocusEvent<HTMLButtonElement>) => {
      setIsFocused(false);
      setIsPendingConfirmation(false); // Cancel confirmation on blur
      if (onBlur) onBlur(event);
    };

    // Generate CSS classes
    const baseClasses = 'btn';
    const variantClasses = `btn-${variant}`;
    const sizeClasses = `btn-${size}`;
    const stateClasses = [
      loading && 'opacity-75 cursor-wait',
      disabled && 'opacity-50 cursor-not-allowed',
      fullWidth && 'w-full',
      isPendingConfirmation && 'animate-pulse border-warning bg-warning text-white'
    ].filter(Boolean).join(' ');

    const buttonClasses = [
      baseClasses,
      variantClasses,
      sizeClasses,
      stateClasses,
      className
    ].filter(Boolean).join(' ');

    // ARIA attributes
    const ariaAttributes = {
      'aria-label': ariaLabel || (typeof children === 'string' ? children : undefined),
      'aria-disabled': disabled || loading,
      'aria-describedby': tooltip ? `${props.id}-tooltip` : undefined,
      'aria-pressed': isPendingConfirmation ? true : undefined,
      'data-hoverable': true, // For face tracking cursor
      'data-voice-command': voiceCommand,
      role: 'button',
      tabIndex: disabled ? -1 : 0
    };

    return (
      <div className="relative inline-block">
        <button
          ref={ref}
          className={buttonClasses}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled || loading}
          {...ariaAttributes}
          {...props}
        >
          {/* Loading spinner */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="spinner w-5 h-5" />
            </div>
          )}

          {/* Button content */}
          <div className={`flex items-center justify-center gap-2 ${loading ? 'opacity-0' : 'opacity-100'}`}>
            {icon && iconPosition === 'left' && (
              <span className="flex-shrink-0" aria-hidden="true">
                {icon}
              </span>
            )}
            
            {children && (
              <span className="font-inherit">
                {isPendingConfirmation ? 'Click to confirm' : children}
              </span>
            )}
            
            {icon && iconPosition === 'right' && (
              <span className="flex-shrink-0" aria-hidden="true">
                {icon}
              </span>
            )}
          </div>

          {/* Voice command indicator */}
          {voiceCommand && (
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-info rounded-full flex items-center justify-center">
              <span className="text-xs text-white" aria-hidden="true">🎤</span>
            </div>
          )}
        </button>

        {/* Tooltip */}
        {tooltip && (
          <div
            id={`${props.id}-tooltip`}
            role="tooltip"
            className={`
              absolute z-50 px-2 py-1 text-sm bg-gray-800 text-white rounded shadow-lg
              transition-opacity duration-200 pointer-events-none
              ${(isHovered || isFocused) ? 'opacity-100' : 'opacity-0'}
              bottom-full left-1/2 transform -translate-x-1/2 -translate-y-2
            `}
          >
            <div className="whitespace-nowrap">{tooltip}</div>
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-t-gray-800" />
          </div>
        )}

        {/* Screen reader announcements */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {isPendingConfirmation && 'Action requires confirmation. Click again to proceed.'}
          {loading && 'Action in progress, please wait.'}
        </div>
      </div>
    );
  }
);

UniversalButton.displayName = 'UniversalButton';