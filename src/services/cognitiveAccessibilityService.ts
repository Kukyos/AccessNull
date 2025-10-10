/**
 * Cognitive Accessibility Service
 * Handles adaptations for users with cognitive impairments
 */

interface CognitiveSettings {
  enableSimplifiedUI: boolean;
  enableStepByStep: boolean;
  enableReadingAssist: boolean;
  enableMemoryAids: boolean;
  reduceCognitiveLoad: boolean;
  showProgress: boolean;
  enableFocusMode: boolean;
  highlightImportant: boolean;
  useSimpleLanguage: boolean;
  enableTutorialMode: boolean;
  autoSave: boolean;
  confirmActions: boolean;
  timeoutWarnings: boolean;
  readAloud: boolean;
}

export class CognitiveAccessibilityService {
  private settings: CognitiveSettings;
  private stepGuide: HTMLElement | null = null;
  private progressTracker: HTMLElement | null = null;
  private memoryAids: Map<string, any> = new Map();
  private focusHistory: Element[] = [];
  private currentStep = 0;
  private totalSteps = 0;
  private speechSynthesis: SpeechSynthesis | null = null;
  private autoSaveInterval: number | null = null;

  constructor() {
    this.settings = {
      enableSimplifiedUI: false,
      enableStepByStep: false,
      enableReadingAssist: false,
      enableMemoryAids: true,
      reduceCognitiveLoad: false,
      showProgress: true,
      enableFocusMode: false,
      highlightImportant: true,
      useSimpleLanguage: false,
      enableTutorialMode: false,
      autoSave: true,
      confirmActions: false,
      timeoutWarnings: true,
      readAloud: false
    };

    this.initializeService();
  }

  /**
   * Initialize the cognitive accessibility service
   */
  private initializeService() {
    this.setupSpeechSynthesis();
    this.setupMemoryAids();
    this.setupProgressTracking();
    this.setupFocusMode();
    this.setupAutoSave();
    this.setupActionConfirmation();

    console.log('🧠 Cognitive Accessibility Service initialized:', this.settings);
  }

  /**
   * Setup speech synthesis for reading assistance
   */
  private setupSpeechSynthesis() {
    if ('speechSynthesis' in window) {
      this.speechSynthesis = window.speechSynthesis;
    }
  }

  /**
   * Enable/disable simplified UI mode
   */
  enableSimplifiedUI(enabled: boolean) {
    this.settings.enableSimplifiedUI = enabled;

    if (enabled) {
      this.applySimplifiedStyles();
    } else {
      this.removeSimplifiedStyles();
    }

    console.log(`🎯 Simplified UI: ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Apply simplified UI styles
   */
  private applySimplifiedStyles() {
    const style = document.createElement('style');
    style.id = 'simplified-ui-styles';
    style.textContent = `
      /* Hide non-essential elements */
      .cognitive-hide { display: none !important; }
      
      /* Simplify layout */
      .cognitive-simple {
        max-width: 600px !important;
        margin: 0 auto !important;
        padding: 20px !important;
        background: #f8f9fa !important;
        border-radius: 8px !important;
      }
      
      /* Larger, clearer buttons */
      .cognitive-simple .btn {
        font-size: 18px !important;
        padding: 16px 24px !important;
        min-height: 64px !important;
        margin: 8px !important;
        border-radius: 8px !important;
        border: 2px solid #333 !important;
        background: #fff !important;
        color: #333 !important;
        font-weight: bold !important;
      }
      
      .cognitive-simple .btn:hover {
        background: #e3f2fd !important;
        border-color: #2196f3 !important;
      }
      
      .cognitive-simple .btn-primary {
        background: #2196f3 !important;
        color: white !important;
        border-color: #2196f3 !important;
      }
      
      /* Simplified text */
      .cognitive-simple h1 { font-size: 28px !important; margin-bottom: 16px !important; }
      .cognitive-simple h2 { font-size: 24px !important; margin-bottom: 12px !important; }
      .cognitive-simple p { font-size: 18px !important; line-height: 1.6 !important; margin-bottom: 16px !important; }
      
      /* Clear visual hierarchy */
      .cognitive-simple .card {
        border: 2px solid #ddd !important;
        border-radius: 8px !important;
        padding: 20px !important;
        margin: 16px 0 !important;
        background: white !important;
      }
      
      /* Remove distractions */
      .cognitive-simple * {
        box-shadow: none !important;
        text-shadow: none !important;
        animation: none !important;
        transition: none !important;
      }
    `;
    
    document.head.appendChild(style);
    document.body.classList.add('cognitive-simple');
  }

  /**
   * Remove simplified UI styles
   */
  private removeSimplifiedStyles() {
    const style = document.getElementById('simplified-ui-styles');
    if (style) style.remove();
    
    document.body.classList.remove('cognitive-simple');
  }

  /**
   * Enable/disable step-by-step guidance
   */
  enableStepByStep(enabled: boolean) {
    this.settings.enableStepByStep = enabled;

    if (enabled) {
      this.createStepGuide();
    } else {
      this.removeStepGuide();
    }

    console.log(`📋 Step-by-step guidance: ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Create step-by-step guide overlay
   */
  private createStepGuide() {
    this.stepGuide = document.createElement('div');
    this.stepGuide.id = 'cognitive-step-guide';
    this.stepGuide.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border: 3px solid #2196f3;
      border-radius: 12px;
      padding: 24px;
      max-width: 400px;
      z-index: 10001;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      display: none;
    `;

    this.stepGuide.innerHTML = `
      <div style="text-align: center;">
        <h3 style="margin: 0 0 16px 0; color: #2196f3;">Step-by-Step Guide</h3>
        <div id="step-content" style="margin-bottom: 20px; font-size: 16px; line-height: 1.5;"></div>
        <div id="step-progress" style="margin-bottom: 20px;">
          <div style="background: #e0e0e0; height: 8px; border-radius: 4px;">
            <div id="step-progress-bar" style="background: #2196f3; height: 100%; border-radius: 4px; width: 0%; transition: width 0.3s;"></div>
          </div>
          <div style="margin-top: 8px; font-size: 14px; color: #666;">
            Step <span id="step-current">1</span> of <span id="step-total">1</span>
          </div>
        </div>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button id="step-prev" class="btn btn-secondary" style="display: none;">Previous</button>
          <button id="step-next" class="btn btn-primary">Next</button>
          <button id="step-close" class="btn btn-secondary">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.stepGuide);
    this.setupStepGuideControls();
  }

  /**
   * Setup step guide controls
   */
  private setupStepGuideControls() {
    if (!this.stepGuide) return;

    const prevBtn = this.stepGuide.querySelector('#step-prev') as HTMLElement;
    const nextBtn = this.stepGuide.querySelector('#step-next') as HTMLElement;
    const closeBtn = this.stepGuide.querySelector('#step-close') as HTMLElement;

    prevBtn?.addEventListener('click', () => this.previousStep());
    nextBtn?.addEventListener('click', () => this.nextStep());
    closeBtn?.addEventListener('click', () => this.hideStepGuide());
  }

  /**
   * Start step-by-step tutorial for a process
   */
  startTutorial(steps: string[]) {
    if (!this.stepGuide) return;

    this.totalSteps = steps.length;
    this.currentStep = 0;
    
    this.updateStepContent(steps);
    this.stepGuide.style.display = 'block';
    
    if (this.settings.readAloud) {
      this.readAloud(steps[0]);
    }

    console.log(`📚 Tutorial started with ${steps.length} steps`);
  }

  /**
   * Update step content display
   */
  private updateStepContent(steps: string[]) {
    if (!this.stepGuide) return;

    const content = this.stepGuide.querySelector('#step-content');
    const current = this.stepGuide.querySelector('#step-current');
    const total = this.stepGuide.querySelector('#step-total');
    const progressBar = this.stepGuide.querySelector('#step-progress-bar') as HTMLElement;
    const prevBtn = this.stepGuide.querySelector('#step-prev') as HTMLElement;
    const nextBtn = this.stepGuide.querySelector('#step-next') as HTMLElement;

    if (content) content.textContent = steps[this.currentStep];
    if (current) current.textContent = (this.currentStep + 1).toString();
    if (total) total.textContent = this.totalSteps.toString();
    
    if (progressBar) {
      const progress = ((this.currentStep + 1) / this.totalSteps) * 100;
      progressBar.style.width = `${progress}%`;
    }

    // Update button visibility
    prevBtn.style.display = this.currentStep > 0 ? 'inline-block' : 'none';
    nextBtn.textContent = this.currentStep < this.totalSteps - 1 ? 'Next' : 'Finish';
  }

  /**
   * Go to next step
   */
  private nextStep() {
    if (this.currentStep < this.totalSteps - 1) {
      this.currentStep++;
      // Update content would be called with the steps array
    } else {
      this.hideStepGuide();
    }
  }

  /**
   * Go to previous step
   */
  private previousStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
      // Update content would be called with the steps array
    }
  }

  /**
   * Hide step guide
   */
  private hideStepGuide() {
    if (this.stepGuide) {
      this.stepGuide.style.display = 'none';
    }
  }

  /**
   * Remove step guide
   */
  private removeStepGuide() {
    if (this.stepGuide) {
      this.stepGuide.remove();
      this.stepGuide = null;
    }
  }

  /**
   * Setup memory aids
   */
  private setupMemoryAids() {
    if (!this.settings.enableMemoryAids) return;

    // Save form data automatically
    this.autoSaveFormData();
    
    // Remember user preferences
    this.loadUserPreferences();
    
    // Track frequently used features
    this.trackFeatureUsage();
  }

  /**
   * Auto-save form data
   */
  private autoSaveFormData() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach((form, index) => {
      const formId = form.id || `form-${index}`;
      
      // Load saved data
      const savedData = this.getMemoryAid(`form-${formId}`);
      if (savedData) {
        this.restoreFormData(form, savedData);
      }
      
      // Save data on change
      form.addEventListener('input', () => {
        const formData = this.extractFormData(form);
        this.setMemoryAid(`form-${formId}`, formData);
      });
    });
  }

  /**
   * Extract form data
   */
  private extractFormData(form: HTMLFormElement): Record<string, any> {
    const data: Record<string, any> = {};
    const formData = new FormData(form);
    
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }
    
    return data;
  }

  /**
   * Restore form data
   */
  private restoreFormData(form: HTMLFormElement, data: Record<string, any>) {
    Object.entries(data).forEach(([name, value]) => {
      const input = form.querySelector(`[name="${name}"]`) as HTMLInputElement;
      if (input) {
        input.value = value as string;
      }
    });
  }

  /**
   * Set memory aid
   */
  setMemoryAid(key: string, value: any) {
    this.memoryAids.set(key, value);
    localStorage.setItem(`cognitive-memory-${key}`, JSON.stringify(value));
  }

  /**
   * Get memory aid
   */
  getMemoryAid(key: string): any {
    if (this.memoryAids.has(key)) {
      return this.memoryAids.get(key);
    }
    
    const stored = localStorage.getItem(`cognitive-memory-${key}`);
    if (stored) {
      try {
        const value = JSON.parse(stored);
        this.memoryAids.set(key, value);
        return value;
      } catch (error) {
        console.warn('Failed to parse memory aid:', error);
      }
    }
    
    return null;
  }

  /**
   * Load user preferences
   */
  private loadUserPreferences() {
    const preferences = this.getMemoryAid('user-preferences');
    if (preferences) {
      Object.assign(this.settings, preferences);
      console.log('💾 Loaded user preferences from memory aids');
    }
  }

  /**
   * Track feature usage
   */
  private trackFeatureUsage() {
    const usage = this.getMemoryAid('feature-usage') || {};
    
    // Track button clicks
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.classList.contains('btn')) {
        const feature = target.textContent?.trim() || 'unknown';
        usage[feature] = (usage[feature] || 0) + 1;
        this.setMemoryAid('feature-usage', usage);
      }
    });
  }

  /**
   * Setup progress tracking
   */
  private setupProgressTracking() {
    if (!this.settings.showProgress) return;

    this.progressTracker = document.createElement('div');
    this.progressTracker.id = 'cognitive-progress-tracker';
    this.progressTracker.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: white;
      border: 2px solid #4caf50;
      border-radius: 20px;
      padding: 8px 16px;
      z-index: 10000;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      display: none;
    `;

    document.body.appendChild(this.progressTracker);
  }

  /**
   * Update progress display
   */
  updateProgress(current: number, total: number, label: string = 'Progress') {
    if (!this.progressTracker) return;

    const percentage = Math.round((current / total) * 100);
    this.progressTracker.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <span>📊 ${label}</span>
        <div style="background: #e0e0e0; width: 100px; height: 8px; border-radius: 4px;">
          <div style="background: #4caf50; height: 100%; border-radius: 4px; width: ${percentage}%;"></div>
        </div>
        <span>${current}/${total}</span>
      </div>
    `;
    
    this.progressTracker.style.display = 'block';

    // Hide after delay
    setTimeout(() => {
      if (this.progressTracker) {
        this.progressTracker.style.display = 'none';
      }
    }, 3000);
  }

  /**
   * Setup focus mode
   */
  private setupFocusMode() {
    if (!this.settings.enableFocusMode) return;

    document.addEventListener('focusin', this.handleFocusIn);
    document.addEventListener('focusout', this.handleFocusOut);
  }

  /**
   * Handle focus in
   */
  private handleFocusIn = (event: FocusEvent) => {
    if (!this.settings.enableFocusMode) return;

    const target = event.target as HTMLElement;
    this.focusHistory.push(target);
    
    // Dim other elements
    document.body.classList.add('cognitive-focus-mode');
    target.classList.add('cognitive-focused');
    
    // Read element if enabled
    if (this.settings.readAloud) {
      this.readElement(target);
    }
  };

  /**
   * Handle focus out
   */
  private handleFocusOut = (event: FocusEvent) => {
    if (!this.settings.enableFocusMode) return;

    const target = event.target as HTMLElement;
    target.classList.remove('cognitive-focused');
    
    setTimeout(() => {
      if (document.activeElement === document.body) {
        document.body.classList.remove('cognitive-focus-mode');
      }
    }, 100);
  };

  /**
   * Read element aloud
   */
  private readElement(element: HTMLElement) {
    if (!this.speechSynthesis) return;

    let text = '';
    
    // Get readable text from element
    if (element.getAttribute('aria-label')) {
      text = element.getAttribute('aria-label')!;
    } else if (element.textContent) {
      text = element.textContent.trim();
    } else if (element.getAttribute('title')) {
      text = element.getAttribute('title')!;
    }
    
    if (text && text.length > 0) {
      this.readAloud(text);
    }
  }

  /**
   * Read text aloud
   */
  readAloud(text: string) {
    if (!this.speechSynthesis) return;

    // Stop any current speech
    this.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.8;
    utterance.pitch = 1;
    utterance.volume = 0.9;
    
    this.speechSynthesis.speak(utterance);
  }

  /**
   * Setup auto-save functionality
   */
  private setupAutoSave() {
    if (!this.settings.autoSave) return;

    this.autoSaveInterval = window.setInterval(() => {
      this.performAutoSave();
    }, 30000); // Auto-save every 30 seconds
  }

  /**
   * Perform auto-save
   */
  private performAutoSave() {
    // Save current form states
    const forms = document.querySelectorAll('form');
    forms.forEach((form, index) => {
      const formId = form.id || `form-${index}`;
      const formData = this.extractFormData(form as HTMLFormElement);
      this.setMemoryAid(`form-${formId}`, formData);
    });

    // Save settings
    this.setMemoryAid('user-preferences', this.settings);
    
    console.log('💾 Auto-save completed');
  }

  /**
   * Setup action confirmation
   */
  private setupActionConfirmation() {
    if (!this.settings.confirmActions) return;

    // Intercept form submissions
    document.addEventListener('submit', this.handleFormSubmit);
    
    // Intercept potentially destructive actions
    const destructiveSelectors = '[data-confirm], .btn-danger, [onclick*="delete"]';
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target.matches(destructiveSelectors)) {
        this.handleDestructiveAction(event, target);
      }
    });
  }

  /**
   * Handle form submit with confirmation
   */
  private handleFormSubmit = (event: Event) => {
    if (!this.settings.confirmActions) return;

    const confirmed = this.showConfirmation(
      'Submit Form',
      'Are you sure you want to submit this form?'
    );
    
    if (!confirmed) {
      event.preventDefault();
    }
  };

  /**
   * Handle destructive action with confirmation
   */
  private handleDestructiveAction(event: Event, target: HTMLElement) {
    // Skip accessibility toggle buttons - they're not destructive
    if (target.closest('[role="button"]') && (
      target.textContent?.includes('Assistant') ||
      target.textContent?.includes('Tracking') ||
      target.textContent?.includes('Speech') ||
      target.textContent?.includes('Voice') ||
      target.textContent?.includes('Face') ||
      target.textContent?.includes('Text-to-Speech')
    )) {
      return;
    }

    const action = target.textContent?.trim() || 'this action';
    const confirmed = this.showConfirmation(
      'Confirm Action',
      `Are you sure you want to ${action.toLowerCase()}?`
    );
    
    if (!confirmed) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  /**
   * Show confirmation dialog
   */
  private showConfirmation(title: string, message: string): boolean {
    // For now, use browser confirm
    // In production, this would be replaced with a custom accessible dialog
    return confirm(`${title}\n\n${message}`);
  }

  /**
   * Enable/disable focus mode
   */
  enableFocusMode(enabled: boolean) {
    this.settings.enableFocusMode = enabled;
    
    if (enabled) {
      this.setupFocusMode();
      this.addFocusStyles();
    } else {
      this.removeFocusMode();
    }

    console.log(`🎯 Focus mode: ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Add focus mode styles
   */
  private addFocusStyles() {
    const style = document.createElement('style');
    style.id = 'cognitive-focus-styles';
    style.textContent = `
      .cognitive-focus-mode * {
        opacity: 0.3;
        transition: opacity 0.3s ease;
      }
      
      .cognitive-focus-mode .cognitive-focused,
      .cognitive-focus-mode .cognitive-focused * {
        opacity: 1 !important;
      }
      
      .cognitive-focused {
        outline: 3px solid #ff9800 !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 6px rgba(255, 152, 0, 0.3) !important;
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Remove focus mode
   */
  private removeFocusMode() {
    document.removeEventListener('focusin', this.handleFocusIn);
    document.removeEventListener('focusout', this.handleFocusOut);
    
    const style = document.getElementById('cognitive-focus-styles');
    if (style) style.remove();
    
    document.body.classList.remove('cognitive-focus-mode');
  }

  /**
   * Get current settings
   */
  getSettings(): CognitiveSettings {
    return { ...this.settings };
  }

  /**
   * Apply settings
   */
  applySettings(newSettings: Partial<CognitiveSettings>) {
    Object.assign(this.settings, newSettings);
    
    // Apply specific settings
    this.enableSimplifiedUI(this.settings.enableSimplifiedUI);
    this.enableStepByStep(this.settings.enableStepByStep);
    this.enableFocusMode(this.settings.enableFocusMode);
    
    console.log('⚙️ Cognitive accessibility settings updated:', this.settings);
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.removeStepGuide();
    this.removeSimplifiedStyles();
    this.removeFocusMode();
    
    if (this.progressTracker) {
      this.progressTracker.remove();
    }
    
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    
    document.removeEventListener('submit', this.handleFormSubmit);
    
    console.log('🧠 Cognitive Accessibility Service destroyed');
  }
}

// Singleton instance
export const cognitiveAccessibilityService = new CognitiveAccessibilityService();