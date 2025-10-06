/**
 * Screen Reader and ARIA Support Service
 * Provides comprehensive screen reader integration and ARIA announcements
 */

import type { ScreenReaderAnnouncement, ARIAProperties } from '../types';

export class ScreenReaderService {
  private liveRegions: Map<string, HTMLElement> = new Map();
  private isScreenReaderDetected: boolean = false;
  private speechSynthesis: SpeechSynthesis | null = null;
  private currentVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    this.initializeService();
  }

  /**
   * Initialize the screen reader service
   */
  private initializeService() {
    // Detect screen reader presence
    this.isScreenReaderDetected = this.detectScreenReader();
    
    // Initialize speech synthesis
    if ('speechSynthesis' in window) {
      this.speechSynthesis = window.speechSynthesis;
      this.loadVoices();
      
      // Update voices when they change
      this.speechSynthesis.addEventListener('voiceschanged', () => {
        this.loadVoices();
      });
    }

    // Create ARIA live regions
    this.createLiveRegions();

    console.log('🔊 Screen Reader Service initialized', {
      screenReaderDetected: this.isScreenReaderDetected,
      speechSynthesisAvailable: !!this.speechSynthesis,
      voicesAvailable: this.speechSynthesis?.getVoices().length || 0
    });
  }

  /**
   * Detect if a screen reader is being used
   */
  private detectScreenReader(): boolean {
    // Multiple detection methods
    const indicators = [
      // Check user agent for known screen readers
      navigator.userAgent.includes('NVDA'),
      navigator.userAgent.includes('JAWS'),
      navigator.userAgent.includes('VoiceOver'),
      navigator.userAgent.includes('TalkBack'),
      navigator.userAgent.includes('Orca'),
      
      // Check for accessibility features
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      window.matchMedia('(prefers-contrast: high)').matches,
      
      // Check for speech synthesis usage
      'speechSynthesis' in window && window.speechSynthesis.speaking,
      
      // Check for specific accessibility APIs
      'accessibilityAPI' in navigator,
      
      // Check if user has interacted with accessibility features
      localStorage.getItem('accessibility-features-used') === 'true'
    ];

    return indicators.some(Boolean);
  }

  /**
   * Load available voices for speech synthesis
   */
  private loadVoices() {
    if (!this.speechSynthesis) return;

    const voices = this.speechSynthesis.getVoices();
    
    // Prefer English voices, then system default
    this.currentVoice = voices.find(voice => 
      voice.lang.startsWith('en') && voice.default
    ) || voices.find(voice => 
      voice.lang.startsWith('en')
    ) || voices[0] || null;

    console.log('🎤 Speech synthesis voices loaded:', {
      totalVoices: voices.length,
      selectedVoice: this.currentVoice?.name || 'None',
      language: this.currentVoice?.lang || 'Unknown'
    });
  }

  /**
   * Create ARIA live regions for announcements
   */
  private createLiveRegions() {
    const regions = [
      { id: 'polite-announcements', priority: 'polite' },
      { id: 'assertive-announcements', priority: 'assertive' },
      { id: 'status-announcements', priority: 'polite' }
    ];

    regions.forEach(({ id, priority }) => {
      let region = document.getElementById(id);
      
      if (!region) {
        region = document.createElement('div');
        region.id = id;
        region.setAttribute('aria-live', priority);
        region.setAttribute('aria-atomic', 'true');
        region.className = 'sr-only';
        document.body.appendChild(region);
      }
      
      this.liveRegions.set(priority, region);
    });
  }

  /**
   * Make an announcement to screen readers
   */
  announce(announcement: ScreenReaderAnnouncement): void {
    const { text, priority = 'polite', interrupt = false, region } = announcement;

    // Use specific region if provided, otherwise use priority-based region
    const targetRegion = region ? 
      document.getElementById(region) : 
      this.liveRegions.get(priority);

    if (targetRegion) {
      // Clear previous announcement if interrupting
      if (interrupt) {
        targetRegion.textContent = '';
        // Force reflow to ensure screen reader notices the change
        targetRegion.offsetHeight;
      }

      // Set new announcement
      targetRegion.textContent = text;
      
      console.log(`📢 Screen reader announcement (${priority}):`, text);
    }

    // Also use speech synthesis if available and screen reader not detected
    if (!this.isScreenReaderDetected && this.speechSynthesis && this.currentVoice) {
      this.speak(text, interrupt);
    }
  }

  /**
   * Speak text using speech synthesis
   */
  private speak(text: string, interrupt: boolean = false): void {
    if (!this.speechSynthesis || !this.currentVoice) return;

    if (interrupt) {
      this.speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = this.currentVoice;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;

    this.speechSynthesis.speak(utterance);
  }

  /**
   * Announce navigation changes
   */
  announceNavigation(from: string, to: string): void {
    this.announce({
      text: `Navigated from ${from} to ${to}`,
      priority: 'polite'
    });
  }

  /**
   * Announce loading states
   */
  announceLoading(isLoading: boolean, context?: string): void {
    const message = isLoading ? 
      `Loading ${context || 'content'}, please wait` : 
      `${context || 'Content'} loaded successfully`;
      
    this.announce({
      text: message,
      priority: 'polite'
    });
  }

  /**
   * Announce errors
   */
  announceError(error: string, critical: boolean = false): void {
    this.announce({
      text: `Error: ${error}`,
      priority: critical ? 'assertive' : 'polite',
      interrupt: critical
    });
  }

  /**
   * Announce form validation
   */
  announceValidation(field: string, isValid: boolean, message?: string): void {
    const text = isValid ? 
      `${field} is valid` : 
      `${field} is invalid. ${message || ''}`;
      
    this.announce({
      text,
      priority: 'assertive'
    });
  }

  /**
   * Announce progress updates
   */
  announceProgress(progress: number, total: number, context?: string): void {
    const percentage = Math.round((progress / total) * 100);
    this.announce({
      text: `${context || 'Progress'}: ${percentage}% complete`,
      priority: 'polite'
    });
  }

  /**
   * Generate ARIA properties for elements
   */
  generateARIAProps(config: ARIAProperties): Record<string, string | boolean | undefined> {
    const props: Record<string, string | boolean | undefined> = {};

    if (config.label) props['aria-label'] = config.label;
    if (config.describedBy) props['aria-describedby'] = config.describedBy;
    if (config.expanded !== undefined) props['aria-expanded'] = config.expanded;
    if (config.hasPopup) props['aria-haspopup'] = config.hasPopup;
    if (config.live) props['aria-live'] = config.live;
    if (config.atomic !== undefined) props['aria-atomic'] = config.atomic;
    if (config.relevant) props['aria-relevant'] = config.relevant;

    return props;
  }

  /**
   * Create accessible skip links
   */
  createSkipLinks(links: Array<{ href: string; text: string }>): HTMLElement {
    const skipNav = document.createElement('nav');
    skipNav.className = 'skip-navigation';
    skipNav.setAttribute('aria-label', 'Skip navigation links');

    const list = document.createElement('ul');
    list.className = 'sr-only';

    links.forEach(({ href, text }) => {
      const listItem = document.createElement('li');
      const link = document.createElement('a');
      
      link.href = href;
      link.className = 'skip-link';
      link.textContent = text;
      
      // Show on focus
      link.addEventListener('focus', () => {
        link.classList.remove('sr-only');
      });
      
      link.addEventListener('blur', () => {
        link.classList.add('sr-only');
      });

      listItem.appendChild(link);
      list.appendChild(listItem);
    });

    skipNav.appendChild(list);
    return skipNav;
  }

  /**
   * Set focus to element with announcement
   */
  focusWithAnnouncement(element: HTMLElement, announcement?: string): void {
    element.focus();
    
    if (announcement) {
      // Delay announcement slightly to ensure focus is set first
      setTimeout(() => {
        this.announce({
          text: announcement,
          priority: 'assertive'
        });
      }, 100);
    }
  }

  /**
   * Make content region more accessible
   */
  enhanceContentAccessibility(container: HTMLElement): void {
    // Add landmark roles where missing
    const headers = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headers.forEach((header, index) => {
      if (!header.id) {
        header.id = `heading-${Date.now()}-${index}`;
      }
    });

    // Enhance form elements
    const inputs = container.querySelectorAll('input, select, textarea');
    inputs.forEach((input) => {
      if (!input.getAttribute('aria-label') && !input.getAttribute('aria-labelledby')) {
        const label = container.querySelector(`label[for="${input.id}"]`);
        if (!label && input.id) {
          console.warn(`Input element ${input.id} missing associated label`);
        }
      }
    });

    // Add button roles where needed
    const clickableElements = container.querySelectorAll('[data-hoverable]');
    clickableElements.forEach((element) => {
      if (!element.getAttribute('role') && element.tagName !== 'BUTTON') {
        element.setAttribute('role', 'button');
        element.setAttribute('tabindex', '0');
      }
    });
  }

  /**
   * Check if screen reader is detected
   */
  isScreenReaderActive(): boolean {
    return this.isScreenReaderDetected;
  }

  /**
   * Update screen reader detection status
   */
  updateScreenReaderStatus(isActive: boolean): void {
    this.isScreenReaderDetected = isActive;
    localStorage.setItem('accessibility-features-used', isActive.toString());
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.speechSynthesis) {
      this.speechSynthesis.cancel();
    }
    
    this.liveRegions.forEach((region) => {
      region.remove();
    });
    
    this.liveRegions.clear();
  }
}

// Singleton instance
export const screenReaderService = new ScreenReaderService();