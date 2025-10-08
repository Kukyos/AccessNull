/**
 * Karunya University Color Palette & Design System
 * Based on official logo colors and accessibility standards
 */

export const KarunyaColors = {
  // Primary Brand Colors (from logo)
  primary: {
    blue: {
      50: '#eff6ff',
      100: '#dbeafe', 
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6', // Main blue
      600: '#2563eb', // Deep blue from logo
      700: '#1d4ed8',
      800: '#1e3a8a', // Navy blue from logo
      900: '#1e2a69',
      950: '#0f1729'
    },
    orange: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#f97316',
      600: '#ea580c', // Main orange from logo
      700: '#c2410c',
      800: '#9a3412',
      900: '#7c2d12',
      950: '#431407'
    }
  },

  // University Status Colors
  academic: {
    success: '#059669', // Emerald for achievements, passed courses
    warning: '#d97706', // Amber for deadlines, pending assignments
    danger: '#dc2626', // Red for failed courses, urgent alerts
    info: '#0284c7', // Sky blue for information, announcements
    neutral: '#6b7280' // Gray for general information
  },

  // Accessibility Colors (WCAG AAA compliant)
  accessibility: {
    highContrast: {
      background: '#000000',
      text: '#ffffff',
      accent: '#ffff00'
    },
    lowVision: {
      background: '#1a1a1a',
      text: '#ffffff',
      accent: '#fbbf24'
    },
    colorBlind: {
      blue: '#0066cc',
      orange: '#ff6600',
      green: '#006600',
      red: '#cc0000'
    }
  },

  // Surface Colors
  surfaces: {
    background: '#ffffff',
    paper: '#f8fafc',
    glass: 'rgba(255, 255, 255, 0.1)',
    glassBlur: 'rgba(255, 255, 255, 0.05)',
    overlay: 'rgba(0, 0, 0, 0.5)',
    overlayLight: 'rgba(0, 0, 0, 0.3)'
  },

  // Text Colors
  text: {
    primary: '#1f2937',
    secondary: '#6b7280',
    tertiary: '#9ca3af',
    inverse: '#ffffff',
    onPrimary: '#ffffff',
    onSecondary: '#1f2937'
  },

  // Interactive States
  states: {
    hover: 'rgba(59, 130, 246, 0.1)',
    active: 'rgba(59, 130, 246, 0.2)',
    focus: 'rgba(59, 130, 246, 0.3)',
    disabled: 'rgba(0, 0, 0, 0.3)'
  }
} as const;

// Design System Utilities
export const getContrastColor = (backgroundColor: string): string => {
  // Simple contrast color logic - can be enhanced
  const lightColors = ['50', '100', '200', '300', '400'];
  const colorLevel = backgroundColor.split('-').pop();
  return lightColors.includes(colorLevel || '') ? KarunyaColors.text.primary : KarunyaColors.text.inverse;
};

export const getAccessibilityScaledSize = (
  baseSize: number, 
  faceTrackingEnabled: boolean, 
  accessibilityLevel: 'normal' | 'large' | 'extra-large' = 'normal'
): number => {
  // For now, return normal size everywhere - we'll add scaling back later
  return baseSize;
};

// University-specific color gradients
export const KarunyaGradients = {
  primary: 'linear-gradient(135deg, #2563eb 0%, #ea580c 100%)',
  hero: 'linear-gradient(135deg, #1e3a8a 0%, #ea580c 50%, #2563eb 100%)',
  surface: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(234, 88, 12, 0.1) 100%)',
  glass: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
  sidebar: 'linear-gradient(180deg, #1e3a8a 0%, #1d4ed8 100%)'
} as const;

// Export commonly used combinations
export const KarunyaTheme = {
  colors: KarunyaColors,
  gradients: KarunyaGradients,
  getContrastColor,
  getAccessibilityScaledSize
} as const;

export default KarunyaTheme;