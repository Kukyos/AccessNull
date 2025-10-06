/**
 * Enhanced Voice Command Service
 * Advanced voice control with natural language processing and complex actions
 */

interface VoiceCommand {
  patterns: string[];
  action: (params?: any) => void;
  description: string;
  category: 'navigation' | 'interaction' | 'accessibility' | 'system' | 'content';
  requiresConfirmation?: boolean;
  parameters?: string[];
}

interface VoiceSettings {
  enabled: boolean;
  language: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  confidence: number;
  timeout: number;
  wakeWord: string;
  confirmationRequired: boolean;
  voiceFeedback: boolean;
  customCommands: VoiceCommand[];
}

export class EnhancedVoiceCommandService {
  private settings: VoiceSettings;
  private recognition: any = null; // SpeechRecognition varies by browser
  private synthesis: SpeechSynthesis | null = null;
  // Removed isListening as it's managed by the indicator state
  private commands: Map<string, VoiceCommand> = new Map();
  private lastCommand: string = '';
  private commandHistory: string[] = [];
  private isAwaitingConfirmation = false;
  private pendingCommand: (() => void) | null = null;
  private voiceIndicator: HTMLElement | null = null;

  constructor() {
    this.settings = {
      enabled: false,
      language: 'en-US',
      continuous: true,
      interimResults: false,
      maxAlternatives: 1,
      confidence: 0.7,
      timeout: 5000,
      wakeWord: 'hey accessibility',
      confirmationRequired: true,
      voiceFeedback: true,
      customCommands: []
    };

    this.initializeService();
  }

  /**
   * Initialize the voice command service
   */
  private initializeService() {
    this.setupSpeechRecognition();
    this.setupSpeechSynthesis();
    this.registerDefaultCommands();
    this.createVoiceIndicator();

    console.log('🗣️ Enhanced Voice Command Service initialized');
  }

  /**
   * Setup speech recognition
   */
  private setupSpeechRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = this.settings.continuous;
    this.recognition.interimResults = this.settings.interimResults;
    this.recognition.lang = this.settings.language;
    this.recognition.maxAlternatives = this.settings.maxAlternatives;

    this.recognition.onstart = () => {
      this.updateVoiceIndicator('listening');
      console.log('🎤 Voice recognition started');
    };

    this.recognition.onend = () => {
      this.updateVoiceIndicator('idle');
      
      // Restart recognition if enabled and continuous
      if (this.settings.enabled && this.settings.continuous) {
        setTimeout(() => {
          if (this.settings.enabled) {
            this.recognition.start();
          }
        }, 100);
      }
    };

    this.recognition.onresult = (event: any) => {
      const result = event.results[event.resultIndex];
      const transcript = result[0].transcript.toLowerCase().trim();
      const confidence = result[0].confidence;

      if (confidence >= this.settings.confidence) {
        this.processVoiceCommand(transcript);
      }
    };

    this.recognition.onerror = (event: any) => {
      console.warn('Voice recognition error:', event.error);
      this.updateVoiceIndicator('error');
      
      // Restart after error if enabled
      if (this.settings.enabled && event.error !== 'not-allowed') {
        setTimeout(() => {
          if (this.settings.enabled) {
            this.recognition.start();
          }
        }, 1000);
      }
    };
  }

  /**
   * Setup speech synthesis
   */
  private setupSpeechSynthesis() {
    if ('speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
    }
  }

  /**
   * Register default voice commands
   */
  private registerDefaultCommands() {
    const defaultCommands: VoiceCommand[] = [
      // Navigation commands
      {
        patterns: ['go back', 'navigate back', 'back'],
        action: () => window.history.back(),
        description: 'Navigate to previous page',
        category: 'navigation'
      },
      {
        patterns: ['go forward', 'navigate forward', 'forward'],
        action: () => window.history.forward(),
        description: 'Navigate to next page',
        category: 'navigation'
      },
      {
        patterns: ['refresh page', 'reload page', 'refresh'],
        action: () => window.location.reload(),
        description: 'Refresh current page',
        category: 'navigation',
        requiresConfirmation: true
      },
      {
        patterns: ['scroll up', 'page up'],
        action: () => window.scrollBy(0, -300),
        description: 'Scroll up on page',
        category: 'navigation'
      },
      {
        patterns: ['scroll down', 'page down'],
        action: () => window.scrollBy(0, 300),
        description: 'Scroll down on page',
        category: 'navigation'
      },
      {
        patterns: ['scroll to top', 'go to top'],
        action: () => window.scrollTo(0, 0),
        description: 'Scroll to top of page',
        category: 'navigation'
      },
      {
        patterns: ['scroll to bottom', 'go to bottom'],
        action: () => window.scrollTo(0, document.body.scrollHeight),
        description: 'Scroll to bottom of page',
        category: 'navigation'
      },

      // Interaction commands
      {
        patterns: ['click', 'activate', 'press', 'select'],
        action: () => this.clickFocusedElement(),
        description: 'Click the currently focused element',
        category: 'interaction'
      },
      {
        patterns: ['next element', 'tab forward', 'next'],
        action: () => this.focusNext(),
        description: 'Focus next interactive element',
        category: 'interaction'
      },
      {
        patterns: ['previous element', 'tab backward', 'previous'],
        action: () => this.focusPrevious(),
        description: 'Focus previous interactive element',
        category: 'interaction'
      },
      {
        patterns: ['focus first', 'go to first'],
        action: () => this.focusFirst(),
        description: 'Focus first interactive element',
        category: 'interaction'
      },
      {
        patterns: ['focus last', 'go to last'],
        action: () => this.focusLast(),
        description: 'Focus last interactive element',
        category: 'interaction'
      },

      // Content interaction
      {
        patterns: ['find *', 'search for *', 'look for *'],
        action: (text: string) => this.findTextOnPage(text),
        description: 'Find text on the current page',
        category: 'content',
        parameters: ['text']
      },
      {
        patterns: ['read page', 'read content', 'read all'],
        action: () => this.readPageContent(),
        description: 'Read the main content of the page aloud',
        category: 'content'
      },
      {
        patterns: ['read selected', 'read selection'],
        action: () => this.readSelectedText(),
        description: 'Read currently selected text aloud',
        category: 'content'
      },
      {
        patterns: ['stop reading', 'stop speech', 'be quiet'],
        action: () => this.stopSpeech(),
        description: 'Stop current speech synthesis',
        category: 'content'
      },

      // Accessibility commands
      {
        patterns: ['enable high contrast', 'turn on high contrast'],
        action: () => this.toggleAccessibilityFeature('highContrast', true),
        description: 'Enable high contrast mode',
        category: 'accessibility'
      },
      {
        patterns: ['disable high contrast', 'turn off high contrast'],
        action: () => this.toggleAccessibilityFeature('highContrast', false),
        description: 'Disable high contrast mode',
        category: 'accessibility'
      },
      {
        patterns: ['increase font size', 'make text larger', 'bigger text'],
        action: () => this.adjustFontSize('increase'),
        description: 'Increase font size',
        category: 'accessibility'
      },
      {
        patterns: ['decrease font size', 'make text smaller', 'smaller text'],
        action: () => this.adjustFontSize('decrease'),
        description: 'Decrease font size',
        category: 'accessibility'
      },
      {
        patterns: ['enable dark mode', 'turn on dark mode'],
        action: () => this.toggleAccessibilityFeature('darkMode', true),
        description: 'Enable dark mode',
        category: 'accessibility'
      },
      {
        patterns: ['disable dark mode', 'turn off dark mode'],
        action: () => this.toggleAccessibilityFeature('darkMode', false),
        description: 'Disable dark mode',
        category: 'accessibility'
      },

      // System commands
      {
        patterns: ['help', 'show commands', 'what can I say'],
        action: () => this.showAvailableCommands(),
        description: 'Show available voice commands',
        category: 'system'
      },
      {
        patterns: ['repeat last command', 'do that again'],
        action: () => this.repeatLastCommand(),
        description: 'Repeat the last executed command',
        category: 'system'
      },
      {
        patterns: ['yes', 'confirm', 'do it'],
        action: () => this.confirmPendingCommand(),
        description: 'Confirm pending action',
        category: 'system'
      },
      {
        patterns: ['no', 'cancel', 'never mind'],
        action: () => this.cancelPendingCommand(),
        description: 'Cancel pending action',
        category: 'system'
      }
    ];

    defaultCommands.forEach(command => {
      command.patterns.forEach(pattern => {
        this.commands.set(pattern, command);
      });
    });

    console.log(`📚 Registered ${defaultCommands.length} default voice commands`);
  }

  /**
   * Create voice indicator UI (DISABLED - using SimpleVoiceBox instead)
   */
  private createVoiceIndicator() {
    // Disabled - we're using the SimpleVoiceBox component instead
    return;
  }

  /**
   * Update voice indicator appearance
   */
  private updateVoiceIndicator(state: 'idle' | 'listening' | 'processing' | 'error') {
    if (!this.voiceIndicator) return;

    const states = {
      idle: { icon: '🎤', color: '#2196f3', opacity: '0.7' },
      listening: { icon: '🔴', color: '#f44336', opacity: '1' },
      processing: { icon: '🔄', color: '#ff9800', opacity: '1' },
      error: { icon: '❌', color: '#795548', opacity: '0.5' }
    };

    const stateConfig = states[state];
    this.voiceIndicator.innerHTML = stateConfig.icon;
    this.voiceIndicator.style.background = stateConfig.color;
    this.voiceIndicator.style.opacity = stateConfig.opacity;

    if (state === 'listening') {
      this.voiceIndicator.style.animation = 'pulse 1s infinite';
      
      // Add pulse animation if not present
      if (!document.getElementById('voice-animations')) {
        const style = document.createElement('style');
        style.id = 'voice-animations';
        style.textContent = `
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
          }
        `;
        document.head.appendChild(style);
      }
    } else {
      this.voiceIndicator.style.animation = 'none';
    }
  }

  /**
   * Enable/disable voice commands
   */
  setEnabled(enabled: boolean) {
    this.settings.enabled = enabled;

    if (enabled && this.recognition) {
      this.recognition.start();
      if (this.settings.voiceFeedback) {
        this.speak('Voice commands enabled');
      }
    } else if (this.recognition) {
      this.recognition.stop();
      if (this.settings.voiceFeedback) {
        this.speak('Voice commands disabled');
      }
    }

    console.log(`🗣️ Voice commands: ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Process voice command
   */
  private processVoiceCommand(transcript: string) {
    this.updateVoiceIndicator('processing');
    this.commandHistory.push(transcript);
    
    // Check for wake word if required
    if (this.settings.wakeWord && !transcript.includes(this.settings.wakeWord)) {
      return;
    }

    // Remove wake word from transcript
    const cleanTranscript = transcript.replace(this.settings.wakeWord, '').trim();
    
    // Handle confirmation responses
    if (this.isAwaitingConfirmation) {
      this.handleConfirmationResponse(cleanTranscript);
      return;
    }

    // Find matching command
    const matchedCommand = this.findMatchingCommand(cleanTranscript);
    
    if (matchedCommand) {
      this.executeCommand(matchedCommand.command, matchedCommand.parameters, cleanTranscript);
    } else {
      if (this.settings.voiceFeedback) {
        this.speak(`Sorry, I didn't understand "${cleanTranscript}". Say "help" for available commands.`);
      }
      console.log(`❓ Unknown voice command: "${cleanTranscript}"`);
    }

    setTimeout(() => {
      this.updateVoiceIndicator('listening');
    }, 1000);
  }

  /**
   * Find matching command from transcript
   */
  private findMatchingCommand(transcript: string): { command: VoiceCommand; parameters: any[] } | null {
    // Try exact matches first
    if (this.commands.has(transcript)) {
      return { command: this.commands.get(transcript)!, parameters: [] };
    }

    // Try pattern matching with wildcards
    for (const [pattern, command] of this.commands.entries()) {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace('*', '(.+)'));
        const match = transcript.match(regex);
        
        if (match) {
          const parameters = match.slice(1); // Extract captured groups
          return { command, parameters };
        }
      }
    }

    // Try partial matches
    for (const [pattern, command] of this.commands.entries()) {
      if (!pattern.includes('*') && (transcript.includes(pattern) || pattern.includes(transcript))) {
        return { command, parameters: [] };
      }
    }

    return null;
  }

  /**
   * Execute voice command
   */
  private executeCommand(command: VoiceCommand, parameters: any[], transcript: string) {
    this.lastCommand = transcript;

    if (command.requiresConfirmation && this.settings.confirmationRequired) {
      this.pendingCommand = () => command.action(...parameters);
      this.isAwaitingConfirmation = true;
      
      if (this.settings.voiceFeedback) {
        this.speak(`Do you want to ${command.description.toLowerCase()}? Say yes to confirm or no to cancel.`);
      }
      
      console.log(`⏳ Awaiting confirmation for: ${command.description}`);
    } else {
      try {
        command.action(...parameters);
        
        if (this.settings.voiceFeedback) {
          this.speak(`${command.description} executed`);
        }
        
        console.log(`✅ Executed voice command: ${command.description}`);
      } catch (error) {
        console.error('❌ Error executing voice command:', error);
        if (this.settings.voiceFeedback) {
          this.speak('Sorry, there was an error executing that command');
        }
      }
    }
  }

  /**
   * Handle confirmation response
   */
  private handleConfirmationResponse(transcript: string) {
    const positiveResponses = ['yes', 'confirm', 'do it', 'proceed', 'ok', 'okay'];
    const negativeResponses = ['no', 'cancel', 'never mind', 'stop', 'abort'];

    if (positiveResponses.some(response => transcript.includes(response))) {
      this.confirmPendingCommand();
    } else if (negativeResponses.some(response => transcript.includes(response))) {
      this.cancelPendingCommand();
    } else {
      if (this.settings.voiceFeedback) {
        this.speak('Please say yes to confirm or no to cancel');
      }
    }
  }

  /**
   * Confirm pending command
   */
  private confirmPendingCommand() {
    if (this.pendingCommand) {
      try {
        this.pendingCommand();
        if (this.settings.voiceFeedback) {
          this.speak('Command confirmed and executed');
        }
        console.log('✅ Pending command confirmed and executed');
      } catch (error) {
        console.error('❌ Error executing confirmed command:', error);
        if (this.settings.voiceFeedback) {
          this.speak('Sorry, there was an error executing the command');
        }
      }
    }

    this.isAwaitingConfirmation = false;
    this.pendingCommand = null;
  }

  /**
   * Cancel pending command
   */
  private cancelPendingCommand() {
    this.isAwaitingConfirmation = false;
    this.pendingCommand = null;
    
    if (this.settings.voiceFeedback) {
      this.speak('Command cancelled');
    }
    
    console.log('❌ Pending command cancelled');
  }

  /**
   * Speak text using speech synthesis
   */
  private speak(text: string, options: { rate?: number; pitch?: number; volume?: number } = {}) {
    if (!this.synthesis || !this.settings.voiceFeedback) return;

    // Stop any current speech
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate || 0.9;
    utterance.pitch = options.pitch || 1;
    utterance.volume = options.volume || 0.8;
    utterance.lang = this.settings.language;

    this.synthesis.speak(utterance);
  }

  /**
   * Stop current speech
   */
  private stopSpeech() {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }

  /**
   * Click currently focused element
   */
  private clickFocusedElement() {
    const focused = document.activeElement as HTMLElement;
    if (focused && focused !== document.body) {
      focused.click();
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
   * Focus first interactive element
   */
  private focusFirst() {
    const focusableElements = this.getFocusableElements();
    focusableElements[0]?.focus();
  }

  /**
   * Focus last interactive element
   */
  private focusLast() {
    const focusableElements = this.getFocusableElements();
    focusableElements[focusableElements.length - 1]?.focus();
  }

  /**
   * Get all focusable elements
   */
  private getFocusableElements(): HTMLElement[] {
    const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    return Array.from(document.querySelectorAll(selector)) as HTMLElement[];
  }

  /**
   * Find text on page
   */
  private findTextOnPage(text: string) {
    if (!text) return;

    // Simple text search implementation
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node;
    while (node = walker.nextNode()) {
      const nodeText = node.textContent?.toLowerCase() || '';
      const searchText = text.toLowerCase();
      
      if (nodeText.includes(searchText)) {
        const element = node.parentElement;
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.style.backgroundColor = 'yellow';
          
          // Remove highlight after 3 seconds
          setTimeout(() => {
            element.style.backgroundColor = '';
          }, 3000);
          
          if (this.settings.voiceFeedback) {
            this.speak(`Found "${text}" on the page`);
          }
          return;
        }
      }
    }

    if (this.settings.voiceFeedback) {
      this.speak(`"${text}" not found on the page`);
    }
  }

  /**
   * Read page content aloud
   */
  private readPageContent() {
    const content = this.extractMainContent();
    if (content) {
      this.speak(content);
    } else {
      this.speak('No readable content found on this page');
    }
  }

  /**
   * Read selected text aloud
   */
  private readSelectedText() {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    
    if (selectedText) {
      this.speak(selectedText);
    } else {
      this.speak('No text selected');
    }
  }

  /**
   * Extract main content from page
   */
  private extractMainContent(): string {
    const selectors = ['main', 'article', '[role="main"]', '.content', '#content'];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element.textContent?.trim() || '';
      }
    }

    // Fallback to body content, excluding script and style tags
    const bodyClone = document.body.cloneNode(true) as HTMLElement;
    const scriptsAndStyles = bodyClone.querySelectorAll('script, style, nav, header, footer');
    scriptsAndStyles.forEach(el => el.remove());
    
    return bodyClone.textContent?.trim() || '';
  }

  /**
   * Toggle accessibility feature
   */
  private toggleAccessibilityFeature(feature: string, enabled: boolean) {
    // This would integrate with other accessibility services
    console.log(`🔧 ${enabled ? 'Enabling' : 'Disabling'} ${feature}`);
    
    // Example integration - would need to be connected to actual services
    if (feature === 'highContrast') {
      document.documentElement.classList.toggle('high-contrast', enabled);
    } else if (feature === 'darkMode') {
      document.documentElement.classList.toggle('dark-mode', enabled);
    }
  }

  /**
   * Adjust font size
   */
  private adjustFontSize(direction: 'increase' | 'decrease') {
    const currentSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const adjustment = direction === 'increase' ? 2 : -2;
    const newSize = Math.max(12, Math.min(32, currentSize + adjustment));
    
    document.documentElement.style.fontSize = `${newSize}px`;
    
    if (this.settings.voiceFeedback) {
      this.speak(`Font size ${direction === 'increase' ? 'increased' : 'decreased'} to ${newSize} pixels`);
    }
  }

  /**
   * Show available commands
   */
  private showAvailableCommands() {
    const categories = ['navigation', 'interaction', 'accessibility', 'content', 'system'];
    let helpText = 'Available voice commands: ';
    
    categories.forEach(category => {
      const categoryCommands = Array.from(this.commands.values())
        .filter(cmd => cmd.category === category)
        .slice(0, 2); // Limit to 2 per category
      
      if (categoryCommands.length > 0) {
        helpText += `${category}: `;
        helpText += categoryCommands.map(cmd => cmd.patterns[0]).join(', ');
        helpText += '. ';
      }
    });

    this.speak(helpText);
  }

  /**
   * Repeat last command
   */
  private repeatLastCommand() {
    if (this.lastCommand) {
      this.processVoiceCommand(this.lastCommand);
    } else {
      if (this.settings.voiceFeedback) {
        this.speak('No previous command to repeat');
      }
    }
  }

  /**
   * Register custom command
   */
  registerCommand(command: VoiceCommand) {
    command.patterns.forEach(pattern => {
      this.commands.set(pattern, command);
    });
    
    console.log(`📝 Registered custom voice command: ${command.description}`);
  }

  /**
   * Remove command
   */
  removeCommand(pattern: string) {
    this.commands.delete(pattern);
    console.log(`🗑️ Removed voice command: ${pattern}`);
  }

  /**
   * Get current settings
   */
  getSettings(): VoiceSettings {
    return { ...this.settings };
  }

  /**
   * Apply settings
   */
  applySettings(newSettings: Partial<VoiceSettings>) {
    Object.assign(this.settings, newSettings);
    
    // Apply recognition settings
    if (this.recognition) {
      this.recognition.lang = this.settings.language;
      this.recognition.continuous = this.settings.continuous;
      this.recognition.interimResults = this.settings.interimResults;
      this.recognition.maxAlternatives = this.settings.maxAlternatives;
    }
    
    console.log('⚙️ Voice command settings updated:', this.settings);
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.recognition) {
      this.recognition.stop();
    }

    if (this.synthesis) {
      this.synthesis.cancel();
    }

    if (this.voiceIndicator) {
      this.voiceIndicator.remove();
    }

    const style = document.getElementById('voice-animations');
    if (style) style.remove();

    console.log('🗣️ Enhanced Voice Command Service destroyed');
  }
}

// Singleton instance
export const enhancedVoiceCommandService = new EnhancedVoiceCommandService();