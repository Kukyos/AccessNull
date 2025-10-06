/**
 * Adaptive Card Component  
 * Intelligent card that adapts to user capabilities and input methods
 */

import React, { forwardRef, useState, useEffect } from 'react';
import type { AdaptiveCardProps } from '../../types';

export const AdaptiveCard = forwardRef<HTMLDivElement, AdaptiveCardProps & React.HTMLAttributes<HTMLDivElement>>(
  ({
    title,
    description,
    icon,
    onClick,
    variant = 'default',
    size = 'md',
    disabled = false,
    loading = false,
    children,
    ariaLabel,
    voiceCommand,
    className,
    id,
    ...props
  }, ref) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [dwellProgress, setDwellProgress] = useState(0);

    // Register voice command
    useEffect(() => {
      if (voiceCommand) {
        console.log(`Card voice command registered: "${voiceCommand}"`);
      }
    }, [voiceCommand]);

    // Haptic feedback
    const triggerHaptic = () => {
      if (navigator.vibrate) {
        navigator.vibrate([50]);
      }
    };

    // Handle click interactions
    const handleClick = () => {
      if (disabled || loading || !onClick) return;
      
      triggerHaptic();
      onClick();
    };

    const handleKeyDown = (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleClick();
      }
    };

    const handleMouseEnter = () => {
      if (!disabled && !loading) {
        setIsHovered(true);
      }
    };

    const handleMouseLeave = () => {
      setIsHovered(false);
      setDwellProgress(0);
    };

    const handleFocus = () => {
      if (!disabled && !loading) {
        setIsFocused(true);
      }
    };

    const handleBlur = () => {
      setIsFocused(false);
      setDwellProgress(0);
    };

    // Generate CSS classes
    const baseClasses = 'card';
    const variantClasses = {
      default: 'bg-white border-gray-200',
      glass: 'glass',
      outlined: 'bg-transparent border-2 border-primary',
      elevated: 'shadow-xl'
    }[variant];
    
    const sizeClasses = {
      sm: 'p-4',
      md: 'p-6', 
      lg: 'p-8'
    }[size];

    const interactiveClasses = onClick ? 'cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1' : '';
    const stateClasses = [
      disabled && 'opacity-50 cursor-not-allowed',
      loading && 'opacity-75',
      (isHovered || isFocused) && onClick && 'ring-2 ring-primary ring-opacity-50'
    ].filter(Boolean).join(' ');

    const cardClasses = [
      baseClasses,
      variantClasses,
      sizeClasses,
      interactiveClasses,
      stateClasses,
      className
    ].filter(Boolean).join(' ');

    // ARIA attributes
    const ariaAttributes = {
      role: onClick ? 'button' : 'region',
      tabIndex: onClick && !disabled ? 0 : -1,
      'aria-label': ariaLabel || title,
      'aria-describedby': description ? `${id}-description` : undefined,
      'aria-disabled': disabled,
      'data-hoverable': onClick ? true : undefined,
      'data-voice-command': voiceCommand
    };

    return (
      <div
        ref={ref}
        className={cardClasses}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...ariaAttributes}
        {...props}
      >
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-xl">
            <div className="spinner" />
          </div>
        )}

        {/* Card header with icon and title */}
        {(icon || title) && (
          <div className="flex items-center gap-4 mb-4">
            {icon && (
              <div className="flex-shrink-0 text-4xl" aria-hidden="true">
                {icon}
              </div>
            )}
            {title && (
              <h3 className="text-2xl font-bold text-gray-800 flex-1">
                {title}
              </h3>
            )}
            {voiceCommand && (
              <div className="flex-shrink-0 w-8 h-8 bg-info rounded-full flex items-center justify-center">
                <span className="text-xs text-white" aria-hidden="true">🎤</span>
              </div>
            )}
          </div>
        )}

        {/* Description */}
        {description && (
          <p 
            id={`${id}-description`}
            className="text-gray-600 mb-4 text-lg leading-relaxed"
          >
            {description}
          </p>
        )}

        {/* Card content */}
        {children && (
          <div className="text-gray-700">
            {children}
          </div>
        )}

        {/* Dwell progress indicator for face tracking */}
        {dwellProgress > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 border-4 border-primary rounded-xl opacity-50" />
            <svg className="absolute inset-0 w-full h-full">
              <rect
                x="2"
                y="2"
                width="calc(100% - 4px)"
                height="calc(100% - 4px)"
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="4"
                strokeDasharray="100%"
                strokeDashoffset={`${100 - dwellProgress}%`}
                rx="12"
                className="transition-all duration-100"
              />
            </svg>
          </div>
        )}

        {/* Screen reader announcement */}
        <div aria-live="polite" className="sr-only">
          {isHovered && onClick && 'Interactive card focused. Press Enter or Space to activate.'}
          {loading && 'Card content is loading.'}
        </div>
      </div>
    );
  }
);

AdaptiveCard.displayName = 'AdaptiveCard';