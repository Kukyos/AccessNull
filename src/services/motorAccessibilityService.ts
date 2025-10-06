/**
 * Motor Accessibility Service
 * Handles input adaptations for users with mobility impairments
 */

interface MotorSettings {
  dwellTime: number; // milliseconds
  enableDwellClick: boolean;
  enableVoiceControl: boolean;
  enableEyeTracking: boolean;
  enableSwitchControl: boolean;
  largeTargets: boolean;
  reduceAccuracy: boolean;
  enableSticky: boolean; // sticky keys
  enableMouseKeys: boolean;
  dragThreshold: number;
  doubleClickSpeed: number;
}

export class MotorAccessibilityService {
  private settings: MotorSettings;
  private dwellTimer: number | null = null;
  private currentTarget: Element | null = null;
  private dwellProgress: HTMLElement | null = null;
  private voiceCommands: Map<string, () => void> = new Map();
  private recognition: any = null; // SpeechRecognition type varies by browser
  private switchInputs: Map<string, () => void> = new Map();

  constructor() {
    this.settings = {
      dwellTime: 1500, // 1.5 seconds default
      enableDwellClick: false,
      enableVoiceControl: false,
      enableEyeTracking: false,
      enableSwitchControl: false,
      largeTargets: true,
      reduceAccuracy: true,
      enableSticky: false,
      enableMouseKeys: false,
      dragThreshold: 10,
      doubleClickSpeed: 500
    };

    this.initializeService();
  }

  /**
   * Initialize the motor accessibility service
   */
  private initializeService() {
    this.setupLargeTargets();
    this.setupReducedAccuracy();
    this.initializeVoiceCommands();
    this.initializeSwitchControl();
    this.setupKeyboardEnhancements();

    console.log('♿ Motor Accessibility Service initialized:', this.settings);
  }

  /**
   * Enable/disable dwell clicking
   */
  enableDwellClick(enabled: boolean) {
    this.settings.enableDwellClick = enabled;

    if (enabled) {
      this.startDwellTracking();
    } else {
      this.stopDwellTracking();
    }

    console.log(`⏱️ Dwell click: ${enabled ? 'enabled' : 'disabled'} (${this.settings.dwellTime}ms)`);
  }

  /**
   * Set dwell time in milliseconds
   */
  setDwellTime(timeMs: number) {
    this.settings.dwellTime = Math.max(500, Math.min(5000, timeMs)); // 0.5-5 seconds
    console.log(`⏱️ Dwell time set to: ${this.settings.dwellTime}ms`);
  }

  /**
   * Start dwell click tracking
   */
  private startDwellTracking() {
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseleave', this.cancelDwell);
  }

  /**
   * Stop dwell click tracking
   */
  private stopDwellTracking() {
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseleave', this.cancelDwell);
    this.cancelDwell();
  }

  /**
   * Handle mouse movement for dwell clicking
   */
  private handleMouseMove = (event: MouseEvent) => {
    const element = document.elementFromPoint(event.clientX, event.clientY);
    
    if (!element || !this.isClickableElement(element)) {
      this.cancelDwell();
      return;
    }

    if (element === this.currentTarget) {
      return; // Still on same element
    }

    this.cancelDwell();
    this.currentTarget = element;
    this.startDwellTimer(element, event.clientX, event.clientY);
  };

  /**
   * Check if element is clickable
   */
  private isClickableElement(element: Element): boolean {
    const clickableTags = ['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT'];
    const hasClickHandler = element.getAttribute('onclick') !== null;
    const hasRole = ['button', 'link', 'tab', 'menuitem'].includes(element.getAttribute('role') || '');
    const isInteractive = element.hasAttribute('tabindex') && element.getAttribute('tabindex') !== '-1';

    return clickableTags.includes(element.tagName) || hasClickHandler || hasRole || isInteractive;
  }

  /**
   * Start dwell timer for element
   */
  private startDwellTimer(element: Element, x: number, y: number) {
    this.createDwellProgress(x, y);

    this.dwellTimer = window.setTimeout(() => {
      this.performDwellClick(element);
    }, this.settings.dwellTime);
  }

  /**
   * Create visual dwell progress indicator
   */
  private createDwellProgress(x: number, y: number) {
    this.dwellProgress = document.createElement('div');
    this.dwellProgress.className = 'dwell-progress';
    this.dwellProgress.style.cssText = `
      position: fixed;
      left: ${x - 15}px;
      top: ${y - 15}px;
      width: 30px;
      height: 30px;
      border: 3px solid #3498db;
      border-radius: 50%;
      border-top: 3px solid transparent;
      animation: dwell-spin ${this.settings.dwellTime}ms linear;
      pointer-events: none;
      z-index: 10000;
    `;

    // Add animation keyframes if not already present
    if (!document.getElementById('dwell-animations')) {
      const style = document.createElement('style');
      style.id = 'dwell-animations';
      style.textContent = `
        @keyframes dwell-spin {
          0% { transform: rotate(0deg); border-top-color: transparent; }
          50% { border-top-color: #3498db; }
          100% { transform: rotate(360deg); border-top-color: #3498db; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(this.dwellProgress);
  }

  /**
   * Cancel current dwell operation
   */
  private cancelDwell = () => {
    if (this.dwellTimer) {
      clearTimeout(this.dwellTimer);
      this.dwellTimer = null;
    }

    if (this.dwellProgress) {
      this.dwellProgress.remove();
      this.dwellProgress = null;
    }

    this.currentTarget = null;
  };

  /**
   * Perform dwell click on element
   */
  private performDwellClick(element: Element) {
    this.cancelDwell();

    // Create and dispatch click event
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    });

    element.dispatchEvent(clickEvent);

    // Visual feedback
    this.showClickFeedback(element);
    console.log('🖱️ Dwell click performed on:', element.tagName);
  }

  /**
   * Show visual feedback for click
   */
  private showClickFeedback(element: Element) {
    const rect = element.getBoundingClientRect();
    const feedback = document.createElement('div');
    feedback.className = 'click-feedback';
    feedback.style.cssText = `
      position: fixed;
      left: ${rect.left + rect.width / 2 - 25}px;
      top: ${rect.top + rect.height / 2 - 25}px;
      width: 50px;
      height: 50px;
      border: 3px solid #27ae60;
      border-radius: 50%;
      background: rgba(39, 174, 96, 0.2);
      pointer-events: none;
      z-index: 10000;
      animation: click-pulse 0.5s ease-out;
    `;

    // Add pulse animation
    if (!document.getElementById('click-animations')) {
      const style = document.createElement('style');
      style.id = 'click-animations';
      style.textContent = `
        @keyframes click-pulse {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(feedback);

    setTimeout(() => {
      feedback.remove();
    }, 500);
  }

  /**
   * Setup large targets for easier clicking
   */
  private setupLargeTargets() {
    if (!this.settings.largeTargets) return;

    const style = document.createElement('style');
    style.id = 'large-targets';
    style.textContent = `
      button, .btn, input[type="button"], input[type="submit"] {
        min-width: 48px !important;
        min-height: 48px !important;
        padding: 12px 16px !important;
      }
      
      a, [role="button"], [role="link"] {
        min-width: 44px !important;
        min-height: 44px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      
      input[type="checkbox"], input[type="radio"] {
        width: 20px !important;
        height: 20px !important;
        transform: scale(1.5) !important;
        margin: 8px !important;
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Setup reduced accuracy requirements
   */
  private setupReducedAccuracy() {
    if (!this.settings.reduceAccuracy) return;

    const style = document.createElement('style');
    style.id = 'reduced-accuracy';
    style.textContent = `
      button, .btn, a, [role="button"] {
        position: relative !important;
      }
      
      button::before, .btn::before, a::before, [role="button"]::before {
        content: '';
        position: absolute;
        top: -10px;
        left: -10px;
        right: -10px;
        bottom: -10px;
        z-index: -1;
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Initialize voice commands
   */
  private initializeVoiceCommands() {
    if (!this.settings.enableVoiceControl) return;

    // Check for speech recognition support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    // Setup basic voice commands
    this.voiceCommands.set('click', () => this.clickFocusedElement());
    this.voiceCommands.set('press', () => this.clickFocusedElement());
    this.voiceCommands.set('activate', () => this.clickFocusedElement());
    this.voiceCommands.set('next', () => this.focusNext());
    this.voiceCommands.set('previous', () => this.focusPrevious());
    this.voiceCommands.set('back', () => window.history.back());
    this.voiceCommands.set('refresh', () => window.location.reload());
    this.voiceCommands.set('scroll up', () => window.scrollBy(0, -200));
    this.voiceCommands.set('scroll down', () => window.scrollBy(0, 200));

    this.recognition.onresult = (event: any) => {
      const last = event.results.length - 1;
      const command = event.results[last][0].transcript.toLowerCase().trim();
      
      if (this.voiceCommands.has(command)) {
        this.voiceCommands.get(command)!();
        console.log('🗣️ Voice command executed:', command);
      }
    };

    this.recognition.onerror = (event: any) => {
      console.warn('Voice recognition error:', event.error);
    };
  }

  /**
   * Enable/disable voice control
   */
  enableVoiceControl(enabled: boolean) {
    this.settings.enableVoiceControl = enabled;

    if (enabled && this.recognition) {
      this.recognition.start();
      console.log('🗣️ Voice control enabled');
    } else if (this.recognition) {
      this.recognition.stop();
      console.log('🗣️ Voice control disabled');
    }
  }

  /**
   * Click currently focused element
   */
  private clickFocusedElement() {
    const focused = document.activeElement;
    if (focused && focused !== document.body) {
      (focused as HTMLElement).click();
    }
  }

  /**
   * Focus next interactive element
   */
  private focusNext() {
    const focusableElements = this.getFocusableElements();
    const currentIndex = focusableElements.findIndex(el => el === document.activeElement);
    const nextIndex = (currentIndex + 1) % focusableElements.length;
    focusableElements[nextIndex]?.focus();
  }

  /**
   * Focus previous interactive element
   */
  private focusPrevious() {
    const focusableElements = this.getFocusableElements();
    const currentIndex = focusableElements.findIndex(el => el === document.activeElement);
    const prevIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
    focusableElements[prevIndex]?.focus();
  }

  /**
   * Get all focusable elements
   */
  private getFocusableElements(): HTMLElement[] {
    const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    return Array.from(document.querySelectorAll(selector)) as HTMLElement[];
  }

  /**
   * Initialize switch control
   */
  private initializeSwitchControl() {
    if (!this.settings.enableSwitchControl) return;

    // Map switch inputs to actions
    this.switchInputs.set('Space', () => this.clickFocusedElement());
    this.switchInputs.set('Enter', () => this.clickFocusedElement());
    this.switchInputs.set('Tab', () => this.focusNext());
    this.switchInputs.set('Shift+Tab', () => this.focusPrevious());

    document.addEventListener('keydown', this.handleSwitchInput);
  }

  /**
   * Handle switch input
   */
  private handleSwitchInput = (event: KeyboardEvent) => {
    if (!this.settings.enableSwitchControl) return;

    const key = event.shiftKey ? `Shift+${event.code}` : event.code;
    
    if (this.switchInputs.has(key)) {
      event.preventDefault();
      this.switchInputs.get(key)!();
    }
  };

  /**
   * Setup keyboard enhancements
   */
  private setupKeyboardEnhancements() {
    document.addEventListener('keydown', this.handleKeyboardEnhancements);
  }

  /**
   * Handle keyboard enhancements
   */
  private handleKeyboardEnhancements = (event: KeyboardEvent) => {
    // Sticky keys simulation
    if (this.settings.enableSticky) {
      this.handleStickyKeys(event);
    }

    // Mouse keys simulation
    if (this.settings.enableMouseKeys) {
      this.handleMouseKeys(event);
    }
  };

  /**
   * Handle sticky keys
   */
  private handleStickyKeys(event: KeyboardEvent) {
    // Simple sticky keys implementation
    if (['Shift', 'Control', 'Alt'].includes(event.key)) {
      // In a full implementation, this would maintain modifier state
      console.log('🔒 Sticky key pressed:', event.key);
    }
  }

  /**
   * Handle mouse keys (numeric keypad as mouse)
   */
  private handleMouseKeys(event: KeyboardEvent) {
    if (!event.getModifierState('NumLock')) return;

    const mouseActions: Record<string, () => void> = {
      'Numpad1': () => this.simulateMouseMove(-1, 1),
      'Numpad2': () => this.simulateMouseMove(0, 1),
      'Numpad3': () => this.simulateMouseMove(1, 1),
      'Numpad4': () => this.simulateMouseMove(-1, 0),
      'Numpad6': () => this.simulateMouseMove(1, 0),
      'Numpad7': () => this.simulateMouseMove(-1, -1),
      'Numpad8': () => this.simulateMouseMove(0, -1),
      'Numpad9': () => this.simulateMouseMove(1, -1),
      'Numpad5': () => this.simulateMouseClick()
    };

    if (mouseActions[event.code]) {
      event.preventDefault();
      mouseActions[event.code]();
    }
  }

  /**
   * Simulate mouse movement
   */
  private simulateMouseMove(deltaX: number, deltaY: number) {
    // In a real implementation, this would move the mouse cursor
    // For now, we'll focus the element in that direction
    console.log(`🖱️ Mouse keys move: ${deltaX}, ${deltaY}`);
  }

  /**
   * Simulate mouse click
   */
  private simulateMouseClick() {
    this.clickFocusedElement();
    console.log('🖱️ Mouse keys click');
  }

  /**
   * Get current settings
   */
  getSettings(): MotorSettings {
    return { ...this.settings };
  }

  /**
   * Apply settings
   */
  applySettings(newSettings: Partial<MotorSettings>) {
    Object.assign(this.settings, newSettings);

    // Apply specific settings
    this.enableDwellClick(this.settings.enableDwellClick);
    this.enableVoiceControl(this.settings.enableVoiceControl);

    console.log('⚙️ Motor accessibility settings updated:', this.settings);
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.cancelDwell();
    this.stopDwellTracking();
    
    if (this.recognition) {
      this.recognition.stop();
    }

    document.removeEventListener('keydown', this.handleSwitchInput);
    document.removeEventListener('keydown', this.handleKeyboardEnhancements);

    // Remove style sheets
    ['large-targets', 'reduced-accuracy', 'dwell-animations', 'click-animations'].forEach(id => {
      const element = document.getElementById(id);
      if (element) element.remove();
    });

    console.log('♿ Motor Accessibility Service destroyed');
  }
}

// Singleton instance
export const motorAccessibilityService = new MotorAccessibilityService();