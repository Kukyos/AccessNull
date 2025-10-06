/**
 * Eye Tracking Service
 * Integrates WebGazer.js for gaze-based navigation and interaction
 */

// @ts-ignore - WebGazer doesn't have official TypeScript definitions
import webgazer from 'webgazer';

interface EyeTrackingSettings {
  enabled: boolean;
  calibrationRequired: boolean;
  dwellTime: number; // milliseconds
  gazeRadius: number; // pixels
  smoothingFactor: number; // 0-1
  showGazePointer: boolean;
  enableGazeClick: boolean;
  enableGazeScroll: boolean;
  debugMode: boolean;
  confidenceThreshold: number; // 0-1
}

interface GazePoint {
  x: number;
  y: number;
  timestamp: number;
  confidence?: number;
}

export class EyeTrackingService {
  private settings: EyeTrackingSettings;
  private isInitialized = false;
  private gazePointer: HTMLElement | null = null;
  private dwellTimer: number | null = null;
  private currentTarget: Element | null = null;
  private gazeHistory: GazePoint[] = [];
  private calibrationPoints: { x: number; y: number }[] = [];
  private currentCalibrationPoint = 0;
  private calibrationOverlay: HTMLElement | null = null;
  private isCalibrating = false;

  constructor() {
    this.settings = {
      enabled: false,
      calibrationRequired: true,
      dwellTime: 1500, // 1.5 seconds
      gazeRadius: 50, // 50 pixel radius
      smoothingFactor: 0.3,
      showGazePointer: true,
      enableGazeClick: true,
      enableGazeScroll: true,
      debugMode: false,
      confidenceThreshold: 0.5
    };

    this.setupCalibrationPoints();
  }

  /**
   * Initialize the eye tracking service
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      console.log('👁️ Initializing Eye Tracking Service...');

      // Initialize WebGazer
      await webgazer
        .setRegression('ridge') // Use ridge regression
        .setTrackingPrecision(1) // High precision
        .showVideoPreview(this.settings.debugMode) // Show camera preview in debug mode
        .showFaceOverlay(this.settings.debugMode) // Show face detection overlay in debug mode
        .showFaceFeedbackBox(this.settings.debugMode) // Show feedback box in debug mode
        .begin();

      // Set up gaze listener
      webgazer.setGazeListener((data: any) => {
        if (data && this.settings.enabled) {
          this.handleGazeData({
            x: data.x,
            y: data.y,
            timestamp: Date.now(),
            confidence: data.confidence || 1
          });
        }
      });

      this.isInitialized = true;
      
      if (this.settings.showGazePointer) {
        this.createGazePointer();
      }

      console.log('✅ Eye Tracking Service initialized successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to initialize Eye Tracking Service:', error);
      return false;
    }
  }

  /**
   * Enable/disable eye tracking
   */
  async setEnabled(enabled: boolean): Promise<boolean> {
    this.settings.enabled = enabled;

    if (enabled) {
      if (!this.isInitialized) {
        const success = await this.initialize();
        if (!success) return false;
      }

      // Start calibration if required
      if (this.settings.calibrationRequired && !this.isCalibrating) {
        await this.startCalibration();
      }

      // Resume tracking
      webgazer.resume();
      
      if (this.gazePointer) {
        this.gazePointer.style.display = 'block';
      }

      console.log('👁️ Eye tracking enabled');
      return true;

    } else {
      // Pause tracking
      webgazer.pause();
      
      if (this.gazePointer) {
        this.gazePointer.style.display = 'none';
      }

      this.cancelDwell();
      console.log('👁️ Eye tracking disabled');
      return true;
    }
  }

  /**
   * Handle gaze data from WebGazer
   */
  private handleGazeData(gazePoint: GazePoint) {
    if (!this.settings.enabled || gazePoint.confidence! < this.settings.confidenceThreshold) {
      return;
    }

    // Apply smoothing
    const smoothedPoint = this.applySmoothingFilter(gazePoint);
    
    // Update gaze history
    this.gazeHistory.push(smoothedPoint);
    if (this.gazeHistory.length > 10) {
      this.gazeHistory.shift(); // Keep only last 10 points
    }

    // Update gaze pointer position
    this.updateGazePointer(smoothedPoint);

    // Handle gaze interactions
    if (this.settings.enableGazeClick) {
      this.handleGazeClick(smoothedPoint);
    }

    if (this.settings.enableGazeScroll) {
      this.handleGazeScroll(smoothedPoint);
    }
  }

  /**
   * Apply smoothing filter to gaze data
   */
  private applySmoothingFilter(newPoint: GazePoint): GazePoint {
    if (this.gazeHistory.length === 0) {
      return newPoint;
    }

    const lastPoint = this.gazeHistory[this.gazeHistory.length - 1];
    const factor = this.settings.smoothingFactor;

    return {
      x: lastPoint.x * (1 - factor) + newPoint.x * factor,
      y: lastPoint.y * (1 - factor) + newPoint.y * factor,
      timestamp: newPoint.timestamp,
      confidence: newPoint.confidence
    };
  }

  /**
   * Create gaze pointer visualization
   */
  private createGazePointer() {
    this.gazePointer = document.createElement('div');
    this.gazePointer.id = 'eye-tracking-pointer';
    this.gazePointer.style.cssText = `
      position: fixed;
      width: 20px;
      height: 20px;
      border: 2px solid #ff6b6b;
      border-radius: 50%;
      background: rgba(255, 107, 107, 0.3);
      pointer-events: none;
      z-index: 10000;
      transform: translate(-50%, -50%);
      transition: all 0.1s ease-out;
      display: ${this.settings.showGazePointer ? 'block' : 'none'};
    `;

    document.body.appendChild(this.gazePointer);
  }

  /**
   * Update gaze pointer position
   */
  private updateGazePointer(gazePoint: GazePoint) {
    if (!this.gazePointer) return;

    this.gazePointer.style.left = `${gazePoint.x}px`;
    this.gazePointer.style.top = `${gazePoint.y}px`;
  }

  /**
   * Handle gaze-based clicking
   */
  private handleGazeClick(gazePoint: GazePoint) {
    const element = document.elementFromPoint(gazePoint.x, gazePoint.y);
    
    if (!element || !this.isClickableElement(element)) {
      this.cancelDwell();
      return;
    }

    if (element === this.currentTarget) {
      return; // Still on same element
    }

    this.cancelDwell();
    this.currentTarget = element;
    this.startDwellTimer(element, gazePoint);
  }

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
   * Start dwell timer for gaze-based clicking
   */
  private startDwellTimer(element: Element, gazePoint: GazePoint) {
    this.showDwellProgress(gazePoint);

    this.dwellTimer = window.setTimeout(() => {
      this.performGazeClick(element);
    }, this.settings.dwellTime);
  }

  /**
   * Show dwell progress indicator
   */
  private showDwellProgress(gazePoint: GazePoint) {
    const progress = document.createElement('div');
    progress.className = 'gaze-dwell-progress';
    progress.style.cssText = `
      position: fixed;
      left: ${gazePoint.x - 25}px;
      top: ${gazePoint.y - 25}px;
      width: 50px;
      height: 50px;
      border: 3px solid #4caf50;
      border-radius: 50%;
      border-top: 3px solid transparent;
      animation: gaze-dwell-spin ${this.settings.dwellTime}ms linear;
      pointer-events: none;
      z-index: 10001;
    `;

    // Add animation if not present
    if (!document.getElementById('gaze-animations')) {
      const style = document.createElement('style');
      style.id = 'gaze-animations';
      style.textContent = `
        @keyframes gaze-dwell-spin {
          0% { transform: rotate(0deg); border-top-color: transparent; }
          50% { border-top-color: #4caf50; }
          100% { transform: rotate(360deg); border-top-color: #4caf50; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(progress);

    // Store reference for cleanup
    this.currentTarget!.setAttribute('data-gaze-progress', 'true');

    setTimeout(() => {
      progress.remove();
    }, this.settings.dwellTime);
  }

  /**
   * Cancel current dwell operation
   */
  private cancelDwell() {
    if (this.dwellTimer) {
      clearTimeout(this.dwellTimer);
      this.dwellTimer = null;
    }

    // Remove progress indicators
    const progressElements = document.querySelectorAll('.gaze-dwell-progress');
    progressElements.forEach(el => el.remove());

    this.currentTarget = null;
  }

  /**
   * Perform gaze-based click
   */
  private performGazeClick(element: Element) {
    this.cancelDwell();

    // Create and dispatch click event
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    });

    element.dispatchEvent(clickEvent);

    // Show click feedback
    this.showGazeClickFeedback(element);
    console.log('👁️ Gaze click performed on:', element.tagName);
  }

  /**
   * Show visual feedback for gaze click
   */
  private showGazeClickFeedback(element: Element) {
    const rect = element.getBoundingClientRect();
    const feedback = document.createElement('div');
    feedback.style.cssText = `
      position: fixed;
      left: ${rect.left + rect.width / 2 - 30}px;
      top: ${rect.top + rect.height / 2 - 30}px;
      width: 60px;
      height: 60px;
      border: 3px solid #4caf50;
      border-radius: 50%;
      background: rgba(76, 175, 80, 0.2);
      pointer-events: none;
      z-index: 10001;
      animation: gaze-click-pulse 0.6s ease-out;
    `;

    if (!document.getElementById('gaze-click-animations')) {
      const style = document.createElement('style');
      style.id = 'gaze-click-animations';
      style.textContent = `
        @keyframes gaze-click-pulse {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(feedback);

    setTimeout(() => {
      feedback.remove();
    }, 600);
  }

  /**
   * Handle gaze-based scrolling
   */
  private handleGazeScroll(gazePoint: GazePoint) {
    const scrollZoneHeight = 100;
    const windowHeight = window.innerHeight;
    
    // Check if gaze is in scroll zones
    if (gazePoint.y < scrollZoneHeight) {
      // Scroll up
      window.scrollBy(0, -10);
    } else if (gazePoint.y > windowHeight - scrollZoneHeight) {
      // Scroll down
      window.scrollBy(0, 10);
    }
  }

  /**
   * Setup calibration points
   */
  private setupCalibrationPoints() {
    // Create a 9-point calibration grid
    this.calibrationPoints = [];
    const margin = 100;
    const width = window.innerWidth - 2 * margin;
    const height = window.innerHeight - 2 * margin;

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        this.calibrationPoints.push({
          x: margin + (col * width) / 2,
          y: margin + (row * height) / 2
        });
      }
    }
  }

  /**
   * Start calibration process
   */
  async startCalibration(): Promise<boolean> {
    if (this.isCalibrating) return false;

    this.isCalibrating = true;
    this.currentCalibrationPoint = 0;

    return new Promise((resolve) => {
      this.createCalibrationOverlay();
      this.showCalibrationPoint();
      
      // Auto-resolve after all points are calibrated
      const checkCalibration = () => {
        if (this.currentCalibrationPoint >= this.calibrationPoints.length) {
          this.completeCalibration();
          resolve(true);
        }
      };

      // Check every 100ms
      const calibrationInterval = setInterval(() => {
        checkCalibration();
        if (!this.isCalibrating) {
          clearInterval(calibrationInterval);
        }
      }, 100);
    });
  }

  /**
   * Create calibration overlay
   */
  private createCalibrationOverlay() {
    this.calibrationOverlay = document.createElement('div');
    this.calibrationOverlay.id = 'eye-tracking-calibration';
    this.calibrationOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      z-index: 10002;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-family: sans-serif;
    `;

    this.calibrationOverlay.innerHTML = `
      <div style="text-align: center;">
        <h2 style="margin-bottom: 20px;">Eye Tracking Calibration</h2>
        <p style="margin-bottom: 30px;">Look at each point and click when ready</p>
        <div id="calibration-point" style="
          width: 20px;
          height: 20px;
          background: #ff6b6b;
          border-radius: 50%;
          position: absolute;
          cursor: pointer;
          box-shadow: 0 0 20px rgba(255, 107, 107, 0.8);
          animation: pulse 1s infinite;
        "></div>
        <div style="margin-top: 50px;">
          <p>Point <span id="calibration-progress">1</span> of ${this.calibrationPoints.length}</p>
          <button id="skip-calibration" style="
            margin-top: 20px;
            padding: 10px 20px;
            background: #666;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
          ">Skip Calibration</button>
        </div>
      </div>
    `;

    // Add pulse animation
    if (!document.getElementById('calibration-animations')) {
      const style = document.createElement('style');
      style.id = 'calibration-animations';
      style.textContent = `
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(this.calibrationOverlay);

    // Setup event handlers
    const skipBtn = this.calibrationOverlay.querySelector('#skip-calibration');
    skipBtn?.addEventListener('click', () => this.skipCalibration());
  }

  /**
   * Show current calibration point
   */
  private showCalibrationPoint() {
    if (!this.calibrationOverlay || this.currentCalibrationPoint >= this.calibrationPoints.length) {
      return;
    }

    const point = this.calibrationPoints[this.currentCalibrationPoint];
    const calibrationPoint = this.calibrationOverlay.querySelector('#calibration-point') as HTMLElement;
    const progressSpan = this.calibrationOverlay.querySelector('#calibration-progress');

    if (calibrationPoint) {
      calibrationPoint.style.left = `${point.x - 10}px`;
      calibrationPoint.style.top = `${point.y - 10}px`;
      
      // Handle click on calibration point
      calibrationPoint.onclick = () => {
        // Tell WebGazer about this calibration point
        webgazer.recordScreenPosition(point.x, point.y, 'click');
        
        this.currentCalibrationPoint++;
        
        if (progressSpan) {
          progressSpan.textContent = (this.currentCalibrationPoint + 1).toString();
        }
        
        if (this.currentCalibrationPoint < this.calibrationPoints.length) {
          this.showCalibrationPoint();
        }
      };
    }
  }

  /**
   * Complete calibration process
   */
  private completeCalibration() {
    this.isCalibrating = false;
    this.settings.calibrationRequired = false;
    
    if (this.calibrationOverlay) {
      this.calibrationOverlay.remove();
      this.calibrationOverlay = null;
    }

    console.log('✅ Eye tracking calibration completed');
  }

  /**
   * Skip calibration process
   */
  private skipCalibration() {
    this.isCalibrating = false;
    this.settings.calibrationRequired = false;
    
    if (this.calibrationOverlay) {
      this.calibrationOverlay.remove();
      this.calibrationOverlay = null;
    }

    console.log('⏭️ Eye tracking calibration skipped');
  }

  /**
   * Set dwell time
   */
  setDwellTime(timeMs: number) {
    this.settings.dwellTime = Math.max(500, Math.min(5000, timeMs));
    console.log(`⏱️ Gaze dwell time set to: ${this.settings.dwellTime}ms`);
  }

  /**
   * Set gaze radius for interaction
   */
  setGazeRadius(pixels: number) {
    this.settings.gazeRadius = Math.max(20, Math.min(100, pixels));
    console.log(`🎯 Gaze interaction radius set to: ${this.settings.gazeRadius}px`);
  }

  /**
   * Toggle gaze pointer visibility
   */
  showGazePointer(show: boolean) {
    this.settings.showGazePointer = show;
    
    if (this.gazePointer) {
      this.gazePointer.style.display = show ? 'block' : 'none';
    }

    console.log(`👁️ Gaze pointer: ${show ? 'visible' : 'hidden'}`);
  }

  /**
   * Recalibrate eye tracking
   */
  async recalibrate(): Promise<boolean> {
    this.settings.calibrationRequired = true;
    return await this.startCalibration();
  }

  /**
   * Get current settings
   */
  getSettings(): EyeTrackingSettings {
    return { ...this.settings };
  }

  /**
   * Apply settings
   */
  applySettings(newSettings: Partial<EyeTrackingSettings>) {
    Object.assign(this.settings, newSettings);
    console.log('⚙️ Eye tracking settings updated:', this.settings);
  }

  /**
   * Get calibration status
   */
  isCalibrated(): boolean {
    return !this.settings.calibrationRequired;
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.isInitialized) {
      webgazer.end();
    }

    this.cancelDwell();
    
    if (this.gazePointer) {
      this.gazePointer.remove();
    }

    if (this.calibrationOverlay) {
      this.calibrationOverlay.remove();
    }

    // Remove style sheets
    ['gaze-animations', 'gaze-click-animations', 'calibration-animations'].forEach(id => {
      const element = document.getElementById(id);
      if (element) element.remove();
    });

    this.isInitialized = false;
    console.log('👁️ Eye Tracking Service destroyed');
  }
}

// Singleton instance
export const eyeTrackingService = new EyeTrackingService();