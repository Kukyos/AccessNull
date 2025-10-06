/**
 * Hearing Accessibility Service
 * Handles audio/sound adaptations for users with hearing impairments
 */

interface HearingSettings {
  enableVisualNotifications: boolean;
  enableVibrationAlerts: boolean;
  enableCaptions: boolean;
  showSoundIndicators: boolean;
  amplifyAudio: boolean;
  audioDescriptions: boolean;
  flashOnAlert: boolean;
  customNotificationColor: string;
  vibrationPattern: 'short' | 'long' | 'pattern' | 'custom';
  captionSize: 'small' | 'medium' | 'large';
  captionBackground: boolean;
}

export class HearingAccessibilityService {
  private settings: HearingSettings;
  private notificationContainer: HTMLElement | null = null;
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private isFlashing = false;
  private speechSynthesis: SpeechSynthesis | null = null;

  constructor() {
    this.settings = {
      enableVisualNotifications: true,
      enableVibrationAlerts: true,
      enableCaptions: false,
      showSoundIndicators: true,
      amplifyAudio: false,
      audioDescriptions: false,
      flashOnAlert: true,
      customNotificationColor: '#3498db',
      vibrationPattern: 'short',
      captionSize: 'medium',
      captionBackground: true
    };

    this.initializeService();
  }

  /**
   * Initialize the hearing accessibility service
   */
  private initializeService() {
    this.createNotificationContainer();
    this.setupAudioContext();
    this.setupSpeechSynthesis();
    this.interceptAudioAlerts();
    this.setupVisualIndicators();

    console.log('🔊 Hearing Accessibility Service initialized:', this.settings);
  }

  /**
   * Create container for visual notifications
   */
  private createNotificationContainer() {
    this.notificationContainer = document.createElement('div');
    this.notificationContainer.id = 'hearing-notifications';
    this.notificationContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      max-width: 400px;
      pointer-events: none;
    `;
    document.body.appendChild(this.notificationContainer);
  }

  /**
   * Setup Web Audio API context for audio manipulation
   */
  private setupAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      
      if (this.settings.amplifyAudio) {
        this.gainNode.gain.value = 2.0; // Amplify by 2x
      }
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }

  /**
   * Setup speech synthesis for audio descriptions
   */
  private setupSpeechSynthesis() {
    if ('speechSynthesis' in window) {
      this.speechSynthesis = window.speechSynthesis;
    }
  }

  /**
   * Intercept audio alerts and convert to visual
   */
  private interceptAudioAlerts() {
    // Override console methods to catch alerts
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error
    };

    console.log = (...args) => {
      originalConsole.log(...args);
      if (this.settings.enableVisualNotifications) {
        this.showVisualNotification('info', args.join(' '));
      }
    };

    console.warn = (...args) => {
      originalConsole.warn(...args);
      if (this.settings.enableVisualNotifications) {
        this.showVisualNotification('warning', args.join(' '));
      }
    };

    console.error = (...args) => {
      originalConsole.error(...args);
      if (this.settings.enableVisualNotifications) {
        this.showVisualNotification('error', args.join(' '));
      }
    };

    // Override window alert
    const originalAlert = window.alert;
    window.alert = (message) => {
      if (this.settings.enableVisualNotifications) {
        this.showVisualNotification('alert', message);
      } else {
        originalAlert(message);
      }
    };
  }

  /**
   * Show visual notification
   */
  showVisualNotification(type: 'info' | 'warning' | 'error' | 'alert' | 'sound', message: string, duration = 5000) {
    if (!this.notificationContainer) return;

    const notification = document.createElement('div');
    notification.className = `hearing-notification hearing-notification--${type}`;
    
    const colors = {
      info: '#3498db',
      warning: '#f39c12',
      error: '#e74c3c',
      alert: '#9b59b6',
      sound: this.settings.customNotificationColor
    };

    const icons = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      alert: '🔔',
      sound: '🔊'
    };

    notification.style.cssText = `
      background: ${colors[type]};
      color: white;
      padding: 16px;
      margin-bottom: 8px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: slideInNotification 0.3s ease-out;
      pointer-events: auto;
      cursor: pointer;
      position: relative;
      font-size: 16px;
      line-height: 1.4;
    `;

    notification.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <span style="font-size: 24px; flex-shrink: 0;">${icons[type]}</span>
        <div style="flex: 1;">
          <div style="font-weight: bold; margin-bottom: 4px; text-transform: capitalize;">${type}</div>
          <div>${this.escapeHtml(message)}</div>
        </div>
        <button style="background: none; border: none; color: white; font-size: 20px; cursor: pointer; opacity: 0.7; hover: opacity: 1;" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;

    // Add slide-in animation
    if (!document.getElementById('notification-animations')) {
      const style = document.createElement('style');
      style.id = 'notification-animations';
      style.textContent = `
        @keyframes slideInNotification {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutNotification {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    this.notificationContainer.appendChild(notification);

    // Auto-remove after duration
    setTimeout(() => {
      if (notification.parentElement) {
        notification.style.animation = 'slideOutNotification 0.3s ease-in';
        setTimeout(() => {
          notification.remove();
        }, 300);
      }
    }, duration);

    // Trigger additional alerts
    if (this.settings.enableVibrationAlerts) {
      this.triggerVibration(type);
    }

    if (this.settings.flashOnAlert) {
      this.flashScreen(type);
    }

    console.log(`📢 Visual notification shown: ${type} - ${message}`);
  }

  /**
   * Trigger vibration alert
   */
  private triggerVibration(type: string) {
    if (!navigator.vibrate) return;

    const patterns = {
      short: [200],
      long: [800],
      pattern: [200, 100, 200],
      custom: [100, 50, 100, 50, 300],
      info: [200],
      warning: [200, 100, 200],
      error: [300, 100, 300, 100, 300],
      alert: [400],
      sound: [150]
    };

    const pattern = patterns[this.settings.vibrationPattern] || patterns[type as keyof typeof patterns] || patterns.short;
    navigator.vibrate(pattern);
  }

  /**
   * Flash screen for alert
   */
  private flashScreen(_type: string) {
    if (this.isFlashing) return;
    this.isFlashing = true;

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: ${this.settings.customNotificationColor};
      opacity: 0;
      z-index: 9999;
      pointer-events: none;
      animation: screenFlash 0.5s ease-in-out;
    `;

    // Add flash animation
    if (!document.getElementById('flash-animations')) {
      const style = document.createElement('style');
      style.id = 'flash-animations';
      style.textContent = `
        @keyframes screenFlash {
          0%, 100% { opacity: 0; }
          20%, 80% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(overlay);

    setTimeout(() => {
      overlay.remove();
      this.isFlashing = false;
    }, 500);
  }

  /**
   * Setup visual sound indicators
   */
  private setupVisualIndicators() {
    if (!this.settings.showSoundIndicators) return;

    // Create sound visualizer
    const soundIndicator = document.createElement('div');
    soundIndicator.id = 'sound-indicator';
    soundIndicator.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      width: 60px;
      height: 60px;
      background: ${this.settings.customNotificationColor};
      border-radius: 50%;
      display: none;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    soundIndicator.innerHTML = '🔊';
    
    document.body.appendChild(soundIndicator);

    // Monitor audio activity (simplified)
    this.monitorAudioActivity(soundIndicator);
  }

  /**
   * Monitor audio activity and show visual indicator
   */
  private monitorAudioActivity(indicator: HTMLElement) {
    // Listen for audio/video elements
    const audioElements = document.querySelectorAll('audio, video');
    
    audioElements.forEach(element => {
      element.addEventListener('play', () => {
        indicator.style.display = 'flex';
        this.showVisualNotification('sound', 'Audio is playing');
      });

      element.addEventListener('pause', () => {
        indicator.style.display = 'none';
      });

      element.addEventListener('ended', () => {
        indicator.style.display = 'none';
      });
    });

    // Monitor for new audio/video elements
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) {
            const audioElements = node.querySelectorAll('audio, video');
            audioElements.forEach(element => {
              element.addEventListener('play', () => {
                indicator.style.display = 'flex';
                this.showVisualNotification('sound', 'Audio is playing');
              });
            });
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  /**
   * Enable/disable captions
   */
  enableCaptions(enabled: boolean) {
    this.settings.enableCaptions = enabled;

    if (enabled) {
      this.setupCaptions();
    } else {
      this.removeCaptions();
    }

    console.log(`📝 Captions: ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Setup captions for video/audio elements
   */
  private setupCaptions() {
    const mediaElements = document.querySelectorAll('video, audio');
    
    mediaElements.forEach((element, index) => {
      // Create caption container
      const captionContainer = document.createElement('div');
      captionContainer.id = `captions-${index}`;
      captionContainer.className = 'accessibility-captions';
      
      const fontSize = {
        small: '14px',
        medium: '18px',
        large: '24px'
      }[this.settings.captionSize];

      captionContainer.style.cssText = `
        position: absolute;
        bottom: 10px;
        left: 50%;
        transform: translateX(-50%);
        ${this.settings.captionBackground ? 'background: rgba(0,0,0,0.8);' : ''}
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        font-size: ${fontSize};
        font-family: sans-serif;
        line-height: 1.4;
        max-width: 80%;
        text-align: center;
        z-index: 1000;
        display: none;
      `;

      // Insert caption container
      const parent = element.parentElement;
      if (parent && parent.style.position !== 'relative') {
        parent.style.position = 'relative';
      }
      parent?.appendChild(captionContainer);

      // For demonstration, show sample captions
      element.addEventListener('play', () => {
        captionContainer.style.display = 'block';
        captionContainer.textContent = 'Captions will appear here during playback';
      });

      element.addEventListener('pause', () => {
        captionContainer.style.display = 'none';
      });
    });
  }

  /**
   * Remove captions
   */
  private removeCaptions() {
    const captions = document.querySelectorAll('.accessibility-captions');
    captions.forEach(caption => caption.remove());
  }

  /**
   * Provide audio description
   */
  provideAudioDescription(description: string) {
    if (!this.settings.audioDescriptions || !this.speechSynthesis) return;

    const utterance = new SpeechSynthesisUtterance(description);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    
    this.speechSynthesis.speak(utterance);
    
    // Also show as visual notification
    this.showVisualNotification('info', `Audio Description: ${description}`);
  }

  /**
   * Detect important sounds and convert to visual
   */
  detectAndConvertSounds() {
    // This would use Web Audio API to analyze frequency patterns
    // For now, we'll simulate detection of common UI sounds
    
    const commonSounds = [
      { pattern: 'notification', visual: '🔔 Notification received' },
      { pattern: 'error', visual: '❌ Error sound detected' },
      { pattern: 'success', visual: '✅ Success sound detected' },
      { pattern: 'click', visual: '👆 Click sound detected' },
      { pattern: 'message', visual: '💬 Message sound detected' }
    ];

    // Simulate sound detection (in real implementation, this would analyze audio)
    setInterval(() => {
      if (Math.random() < 0.1) { // 10% chance every interval
        const sound = commonSounds[Math.floor(Math.random() * commonSounds.length)];
        this.showVisualNotification('sound', sound.visual, 2000);
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Escape HTML for safe display
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Set custom notification color
   */
  setNotificationColor(color: string) {
    this.settings.customNotificationColor = color;
    console.log(`🎨 Notification color set to: ${color}`);
  }

  /**
   * Set vibration pattern
   */
  setVibrationPattern(pattern: 'short' | 'long' | 'pattern' | 'custom') {
    this.settings.vibrationPattern = pattern;
    console.log(`📳 Vibration pattern set to: ${pattern}`);
  }

  /**
   * Test notification system
   */
  testNotifications() {
    this.showVisualNotification('info', 'This is a test information notification');
    setTimeout(() => {
      this.showVisualNotification('warning', 'This is a test warning notification');
    }, 1000);
    setTimeout(() => {
      this.showVisualNotification('error', 'This is a test error notification');
    }, 2000);
    setTimeout(() => {
      this.showVisualNotification('sound', 'This is a test sound notification');
    }, 3000);
  }

  /**
   * Get current settings
   */
  getSettings(): HearingSettings {
    return { ...this.settings };
  }

  /**
   * Apply settings
   */
  applySettings(newSettings: Partial<HearingSettings>) {
    Object.assign(this.settings, newSettings);
    
    // Reapply specific settings
    this.enableCaptions(this.settings.enableCaptions);
    
    console.log('⚙️ Hearing accessibility settings updated:', this.settings);
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.notificationContainer) {
      this.notificationContainer.remove();
    }

    if (this.audioContext) {
      this.audioContext.close();
    }

    this.removeCaptions();

    // Remove style sheets
    ['notification-animations', 'flash-animations'].forEach(id => {
      const element = document.getElementById(id);
      if (element) element.remove();
    });

    // Remove sound indicator
    const soundIndicator = document.getElementById('sound-indicator');
    if (soundIndicator) soundIndicator.remove();

    console.log('🔊 Hearing Accessibility Service destroyed');
  }
}

// Singleton instance
export const hearingAccessibilityService = new HearingAccessibilityService();