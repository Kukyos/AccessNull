/**
 * Visual Accessibility Service
 * Handles high contrast, large fonts, color adjustments, and visual enhancements
 */

// Visual Accessibility Service - handles visual enhancements and adaptations

interface VisualSettings {
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  highContrast: boolean;
  darkMode: boolean;
  reduceMotion: boolean;
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
}

export class VisualAccessibilityService {
  private settings: VisualSettings;
  private styleElement: HTMLStyleElement | null = null;
  private observers: Map<string, MutationObserver> = new Map();

  constructor() {
    this.settings = {
      fontSize: 'medium',
      highContrast: false,
      darkMode: false,
      reduceMotion: false,
      colorBlindMode: 'none'
    };
    
    this.initializeService();
  }

  /**
   * Initialize the visual accessibility service
   */
  private initializeService() {
    // Detect user preferences from system
    this.detectSystemPreferences();
    
    // Create dynamic stylesheet
    this.createStylesheet();
    
    // Apply initial settings
    this.applyAllSettings();
    
    // Watch for system preference changes
    this.watchSystemPreferences();

    console.log('👁️ Visual Accessibility Service initialized:', this.settings);
  }

  /**
   * Detect system accessibility preferences
   */
  private detectSystemPreferences() {
    // High contrast preference
    if (window.matchMedia('(prefers-contrast: high)').matches) {
      this.settings.highContrast = true;
    }

    // Dark mode preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.settings.darkMode = true;
    }

    // Reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.settings.reduceMotion = true;
    }
  }

  /**
   * Watch for system preference changes
   */
  private watchSystemPreferences() {
    // Watch high contrast changes
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');
    contrastQuery.addEventListener('change', (e) => {
      this.updateHighContrast(e.matches);
    });

    // Watch dark mode changes
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkModeQuery.addEventListener('change', (e) => {
      this.updateDarkMode(e.matches);
    });

    // Watch reduced motion changes
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    motionQuery.addEventListener('change', (e) => {
      this.updateReduceMotion(e.matches);
    });
  }

  /**
   * Create dynamic stylesheet for accessibility
   */
  private createStylesheet() {
    this.styleElement = document.createElement('style');
    this.styleElement.id = 'visual-accessibility-styles';
    document.head.appendChild(this.styleElement);
  }

  /**
   * Apply all current settings
   */
  private applyAllSettings() {
    this.updateFontSize(this.settings.fontSize);
    this.updateHighContrast(this.settings.highContrast);
    this.updateDarkMode(this.settings.darkMode);
    this.updateReduceMotion(this.settings.reduceMotion);
    this.updateColorBlindMode(this.settings.colorBlindMode);
  }

  /**
   * Update font size setting
   */
  updateFontSize(size: 'small' | 'medium' | 'large' | 'extra-large') {
    this.settings.fontSize = size;
    
    const fontSizes = {
      small: '14px',
      medium: '16px',
      large: '20px',
      'extra-large': '24px'
    };

    const rootFontSize = fontSizes[size];
    document.documentElement.style.fontSize = rootFontSize;
    
    // Update CSS custom property
    document.documentElement.style.setProperty('--base-font-size', rootFontSize);
    
    this.updateDynamicStyles();
    console.log(`📝 Font size updated to: ${size} (${rootFontSize})`);
  }

  /**
   * Update high contrast mode
   */
  updateHighContrast(enabled: boolean) {
    this.settings.highContrast = enabled;
    
    if (enabled) {
      document.documentElement.classList.add('high-contrast');
      document.documentElement.style.setProperty('--contrast-mode', 'high');
    } else {
      document.documentElement.classList.remove('high-contrast');
      document.documentElement.style.setProperty('--contrast-mode', 'normal');
    }
    
    this.updateDynamicStyles();
    console.log(`🎨 High contrast mode: ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Update dark mode
   */
  updateDarkMode(enabled: boolean) {
    this.settings.darkMode = enabled;
    
    if (enabled) {
      document.documentElement.classList.add('dark-mode');
      document.documentElement.style.setProperty('--color-scheme', 'dark');
    } else {
      document.documentElement.classList.remove('dark-mode');
      document.documentElement.style.setProperty('--color-scheme', 'light');
    }
    
    this.updateDynamicStyles();
    console.log(`🌙 Dark mode: ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Update reduced motion setting
   */
  updateReduceMotion(enabled: boolean) {
    this.settings.reduceMotion = enabled;
    
    if (enabled) {
      document.documentElement.classList.add('reduce-motion');
      document.documentElement.style.setProperty('--animation-duration', '0.01ms');
    } else {
      document.documentElement.classList.remove('reduce-motion');
      document.documentElement.style.setProperty('--animation-duration', '300ms');
    }
    
    this.updateDynamicStyles();
    console.log(`⚡ Reduced motion: ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Update color blind mode
   */
  updateColorBlindMode(mode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia') {
    this.settings.colorBlindMode = mode;
    
    // Remove all color blind classes
    document.documentElement.classList.remove('protanopia', 'deuteranopia', 'tritanopia');
    
    if (mode !== 'none') {
      document.documentElement.classList.add(mode);
      document.documentElement.style.setProperty('--color-blind-mode', mode);
    } else {
      document.documentElement.style.setProperty('--color-blind-mode', 'none');
    }
    
    this.updateDynamicStyles();
    console.log(`🌈 Color blind support: ${mode}`);
  }

  /**
   * Update dynamic styles based on current settings
   */
  private updateDynamicStyles() {
    if (!this.styleElement) return;

    const css = this.generateDynamicCSS();
    this.styleElement.textContent = css;
  }

  /**
   * Generate dynamic CSS based on current settings
   */
  private generateDynamicCSS(): string {
    let css = '';

    // High contrast styles
    if (this.settings.highContrast) {
      css += `
        .high-contrast {
          --color-primary: #000000 !important;
          --color-primary-dark: #000000 !important;
          --color-white: #FFFFFF !important;
          --color-black: #000000 !important;
          --color-gray-50: #FFFFFF !important;
          --color-gray-900: #000000 !important;
        }
        
        .high-contrast * {
          border-color: #000000 !important;
          box-shadow: none !important;
        }
        
        .high-contrast .btn {
          border-width: 3px !important;
          font-weight: bold !important;
        }
        
        .high-contrast .card {
          border-width: 3px !important;
          border-color: #000000 !important;
        }
      `;
    }

    // Dark mode styles
    if (this.settings.darkMode) {
      css += `
        .dark-mode {
          --color-gray-50: #1F2937 !important;
          --color-gray-100: #374151 !important;
          --color-gray-800: #F9FAFB !important;
          --color-gray-900: #FFFFFF !important;
          background-color: #1F2937 !important;
          color: #F9FAFB !important;
        }
        
        .dark-mode .card {
          background-color: #374151 !important;
          border-color: #4B5563 !important;
          color: #F9FAFB !important;
        }
        
        .dark-mode .btn-secondary {
          background-color: #374151 !important;
          color: #F9FAFB !important;
          border-color: #F9FAFB !important;
        }
      `;
    }

    // Reduced motion styles
    if (this.settings.reduceMotion) {
      css += `
        .reduce-motion *,
        .reduce-motion *::before,
        .reduce-motion *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }
      `;
    }

    // Color blind support
    if (this.settings.colorBlindMode !== 'none') {
      const filters = {
        protanopia: 'url(#protanopia-filter)',
        deuteranopia: 'url(#deuteranopia-filter)', 
        tritanopia: 'url(#tritanopia-filter)'
      };

      css += `
        .${this.settings.colorBlindMode} {
          filter: ${filters[this.settings.colorBlindMode]};
        }
      `;
    }

    // Font size responsive adjustments
    const fontSizeMultipliers = {
      small: 0.875,
      medium: 1,
      large: 1.25,
      'extra-large': 1.5
    };

    const multiplier = fontSizeMultipliers[this.settings.fontSize];
    
    css += `
      .text-xs { font-size: ${0.75 * multiplier}rem !important; }
      .text-sm { font-size: ${0.875 * multiplier}rem !important; }
      .text-base { font-size: ${1 * multiplier}rem !important; }
      .text-lg { font-size: ${1.125 * multiplier}rem !important; }
      .text-xl { font-size: ${1.25 * multiplier}rem !important; }
      .text-2xl { font-size: ${1.5 * multiplier}rem !important; }
      .text-3xl { font-size: ${1.875 * multiplier}rem !important; }
      .text-4xl { font-size: ${2.25 * multiplier}rem !important; }
      .text-5xl { font-size: ${3 * multiplier}rem !important; }
      .text-6xl { font-size: ${3.75 * multiplier}rem !important; }
      
      .btn {
        padding: ${0.75 * multiplier}rem ${1.5 * multiplier}rem !important;
        font-size: ${1.125 * multiplier}rem !important;
        min-height: ${64 * multiplier}px !important;
        min-width: ${64 * multiplier}px !important;
      }
      
      .btn-sm {
        padding: ${0.5 * multiplier}rem ${1 * multiplier}rem !important;
        font-size: ${0.875 * multiplier}rem !important;
        min-height: ${48 * multiplier}px !important;
      }
      
      .btn-lg {
        padding: ${1 * multiplier}rem ${2 * multiplier}rem !important;
        font-size: ${1.25 * multiplier}rem !important;
        min-height: ${80 * multiplier}px !important;
      }
      
      .btn-xl {
        padding: ${1.5 * multiplier}rem ${2.5 * multiplier}rem !important;
        font-size: ${1.5 * multiplier}rem !important;
        min-height: ${96 * multiplier}px !important;
      }
    `;

    return css;
  }

  /**
   * Create color blind support SVG filters
   */
  createColorBlindFilters() {
    // Only create once
    if (document.getElementById('color-blind-filters')) return;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'color-blind-filters';
    svg.style.position = 'absolute';
    svg.style.width = '0';
    svg.style.height = '0';
    
    svg.innerHTML = `
      <defs>
        <!-- Protanopia (red-blind) filter -->
        <filter id="protanopia-filter">
          <feColorMatrix type="matrix" values="0.567 0.433 0 0 0
                                                0.558 0.442 0 0 0  
                                                0 0.242 0.758 0 0
                                                0 0 0 1 0"/>
        </filter>
        
        <!-- Deuteranopia (green-blind) filter -->
        <filter id="deuteranopia-filter">
          <feColorMatrix type="matrix" values="0.625 0.375 0 0 0
                                                0.7 0.3 0 0 0
                                                0 0.3 0.7 0 0
                                                0 0 0 1 0"/>
        </filter>
        
        <!-- Tritanopia (blue-blind) filter -->
        <filter id="tritanopia-filter">
          <feColorMatrix type="matrix" values="0.95 0.05 0 0 0
                                                0 0.433 0.567 0 0
                                                0 0.475 0.525 0 0
                                                0 0 0 1 0"/>
        </filter>
      </defs>
    `;
    
    document.body.appendChild(svg);
  }

  /**
   * Enhance focus visibility
   */
  enhanceFocusVisibility() {
    const css = `
      *:focus {
        outline: 3px solid var(--color-info) !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 6px rgba(52, 152, 219, 0.3) !important;
      }
      
      .btn:focus {
        outline: 4px solid var(--color-info) !important;
        outline-offset: 3px !important;
      }
      
      input:focus,
      textarea:focus,
      select:focus {
        border-color: var(--color-info) !important;
        box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.3) !important;
      }
    `;
    
    const focusStyle = document.createElement('style');
    focusStyle.id = 'enhanced-focus-styles';
    focusStyle.textContent = css;
    document.head.appendChild(focusStyle);
  }

  /**
   * Get current settings
   */
  getSettings() {
    return { ...this.settings };
  }

  /**
   * Apply settings from configuration
   */
  applySettings(newSettings: Partial<typeof this.settings>) {
    Object.assign(this.settings, newSettings);
    this.applyAllSettings();
  }

  /**
   * Reset to default settings
   */
  resetToDefaults() {
    this.settings = {
      fontSize: 'medium',
      highContrast: false,
      darkMode: false,
      reduceMotion: false,
      colorBlindMode: 'none'
    };
    
    this.applyAllSettings();
    console.log('🔄 Visual accessibility settings reset to defaults');
  }

  /**
   * Check if user needs high contrast
   */
  shouldUseHighContrast(): boolean {
    return this.settings.highContrast || window.matchMedia('(prefers-contrast: high)').matches;
  }

  /**
   * Check if user prefers dark mode
   */
  shouldUseDarkMode(): boolean {
    return this.settings.darkMode || window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.styleElement) {
      this.styleElement.remove();
    }
    
    const colorBlindFilters = document.getElementById('color-blind-filters');
    if (colorBlindFilters) {
      colorBlindFilters.remove();
    }
    
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

// Singleton instance
export const visualAccessibilityService = new VisualAccessibilityService();