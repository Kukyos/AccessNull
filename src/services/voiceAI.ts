// Voice AI System - Controls entire screen through speech commands

// TypeScript declarations for Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

export class VoiceAI {
  private recognition: any = null;
  private synthesis: SpeechSynthesis;
  private isListening = false;
  private commandQueue: string[] = [];
  private onCommandCallback?: (command: string, action: string) => void;

  constructor() {
    this.synthesis = window.speechSynthesis;
    this.initializeSpeechRecognition();
  }

  private initializeSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      
      this.recognition.onresult = (event: any) => {
        const lastResult = event.results[event.results.length - 1];
        if (lastResult.isFinal) {
          const command = lastResult[0].transcript.toLowerCase().trim();
          console.log('🎤 Voice Command:', command);
          this.processCommand(command);
        }
      };

      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          this.speak('Microphone access denied. Please allow microphone access.');
        }
      };

      this.recognition.onend = () => {
        if (this.isListening) {
          // Restart if we're still supposed to be listening
          setTimeout(() => this.recognition?.start(), 100);
        }
      };
    } else {
      console.error('Speech recognition not supported');
    }
  }

  startListening() {
    if (!this.recognition) {
      this.speak('Speech recognition not supported in this browser');
      return false;
    }

    this.isListening = true;
    try {
      this.recognition.start();
      this.speak('Voice AI activated. I can click anything on screen. Try saying: click button, scroll down, type hello, or press enter.');
      return true;
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      return false;
    }
  }

  stopListening() {
    this.isListening = false;
    if (this.recognition) {
      this.recognition.stop();
    }
    this.speak('Voice AI deactivated');
  }

  private async processCommand(command: string) {
    console.log('🤖 Processing command:', command);
    
    // Add to command queue for feedback
    this.commandQueue.push(command);
    if (this.commandQueue.length > 10) {
      this.commandQueue.shift();
    }

    // Parse and execute command
    const action = await this.parseCommand(command);
    if (action) {
      this.onCommandCallback?.(command, action);
      await this.executeAction(action);
    }
  }

  private async parseCommand(command: string): Promise<string | null> {
    // Click commands
    if (command.includes('click')) {
      const target = command.replace('click', '').trim();
      if (target) {
        return `click:${target}`;
      }
      return 'click:anywhere';
    }

    // Type commands
    if (command.includes('type') || command.includes('write')) {
      const text = command.replace(/^(type|write)\s*/, '').trim();
      if (text) {
        return `type:${text}`;
      }
    }

    // Navigation commands
    if (command.includes('scroll down') || command.includes('scroll')) {
      return 'scroll:down';
    }
    if (command.includes('scroll up')) {
      return 'scroll:up';
    }
    if (command.includes('go back') || command.includes('back')) {
      return 'navigate:back';
    }
    if (command.includes('refresh') || command.includes('reload')) {
      return 'navigate:refresh';
    }

    // Key commands
    if (command.includes('press enter') || command.includes('enter')) {
      return 'key:Enter';
    }
    if (command.includes('press escape') || command.includes('escape')) {
      return 'key:Escape';
    }
    if (command.includes('press tab') || command.includes('tab')) {
      return 'key:Tab';
    }

    // Form commands
    if (command.includes('submit') || command.includes('send')) {
      return 'click:submit';
    }
    if (command.includes('login')) {
      return 'click:login';
    }
    if (command.includes('search')) {
      return 'focus:search';
    }

    return null;
  }

  private async executeAction(action: string) {
    const [actionType, parameter] = action.split(':');
    
    try {
      switch (actionType) {
        case 'click':
          await this.performClick(parameter);
          break;
        case 'type':
          await this.performType(parameter);
          break;
        case 'scroll':
          await this.performScroll(parameter);
          break;
        case 'navigate':
          await this.performNavigation(parameter);
          break;
        case 'key':
          await this.performKeyPress(parameter);
          break;
        case 'focus':
          await this.performFocus(parameter);
          break;
        default:
          this.speak(`I don't know how to ${actionType}`);
      }
    } catch (error) {
      console.error('Action execution failed:', error);
      this.speak('Sorry, I couldn\'t complete that action');
    }
  }

  private async performClick(target: string) {
    let element: Element | null = null;

    if (target === 'anywhere') {
      // Click center of screen
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      this.clickAtCoordinates(centerX, centerY);
      this.speak('Clicked center of screen');
      return;
    }

    // Try to find element by various methods
    element = this.findElementByText(target) || 
              this.findElementByRole(target) || 
              this.findElementByType(target);

    if (element) {
      this.clickElement(element);
      this.speak(`Clicked ${target}`);
    } else {
      this.speak(`Could not find ${target} to click`);
    }
  }

  private findElementByText(text: string): Element | null {
    // Find by exact text content
    const elements = Array.from(document.querySelectorAll('*'));
    return elements.find(el => 
      el.textContent?.toLowerCase().includes(text.toLowerCase()) && 
      el.children.length === 0 // Leaf elements only
    ) || null;
  }

  private findElementByRole(role: string): Element | null {
    // Common button/interactive element selectors
    const selectors = {
      'button': 'button, [role="button"], input[type="button"], input[type="submit"]',
      'link': 'a, [role="link"]',
      'submit': 'input[type="submit"], button[type="submit"], [role="button"]',
      'login': '[data-testid*="login"], #login, .login, button:contains("login")',
      'search': 'input[type="search"], [placeholder*="search"], #search, .search'
    };

    const selector = selectors[role as keyof typeof selectors];
    if (selector) {
      return document.querySelector(selector);
    }
    return null;
  }

  private findElementByType(type: string): Element | null {
    // Find by element type or class
    if (type.includes('input') || type.includes('textbox')) {
      return document.querySelector('input[type="text"], input[type="email"], textarea');
    }
    if (type.includes('button')) {
      return document.querySelector('button');
    }
    return null;
  }

  private clickElement(element: Element) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Scroll element into view first
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    setTimeout(() => {
      this.clickAtCoordinates(centerX, centerY);
    }, 300);
  }

  private clickAtCoordinates(x: number, y: number) {
    // Create and dispatch click events
    const events = ['mousedown', 'mouseup', 'click'];
    
    events.forEach(eventType => {
      const event = new MouseEvent(eventType, {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        button: 0
      });
      
      const elementAtPoint = document.elementFromPoint(x, y);
      if (elementAtPoint) {
        elementAtPoint.dispatchEvent(event);
      }
    });
  }

  private async performType(text: string) {
    const activeElement = document.activeElement as HTMLInputElement | HTMLTextAreaElement;
    
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
      // Type in currently focused input
      activeElement.value = text;
      activeElement.dispatchEvent(new Event('input', { bubbles: true }));
      this.speak(`Typed: ${text}`);
    } else {
      // Find first available input
      const input = document.querySelector('input[type="text"], input[type="email"], textarea') as HTMLInputElement;
      if (input) {
        input.focus();
        input.value = text;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        this.speak(`Typed: ${text}`);
      } else {
        this.speak('No text input found');
      }
    }
  }

  private async performScroll(direction: string) {
    const scrollAmount = direction === 'up' ? -300 : 300;
    window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
    this.speak(`Scrolled ${direction}`);
  }

  private async performNavigation(action: string) {
    switch (action) {
      case 'back':
        window.history.back();
        this.speak('Going back');
        break;
      case 'refresh':
        window.location.reload();
        this.speak('Refreshing page');
        break;
    }
  }

  private async performKeyPress(key: string) {
    const event = new KeyboardEvent('keydown', {
      key: key,
      bubbles: true,
      cancelable: true
    });
    
    document.dispatchEvent(event);
    this.speak(`Pressed ${key}`);
  }

  private async performFocus(target: string) {
    const element = this.findElementByRole(target) || this.findElementByText(target);
    if (element && element instanceof HTMLElement) {
      element.focus();
      this.speak(`Focused on ${target}`);
    } else {
      this.speak(`Could not find ${target} to focus on`);
    }
  }

  private speak(text: string) {
    // Cancel any ongoing speech
    this.synthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    console.log('🔊 Speaking:', text);
    this.synthesis.speak(utterance);
  }

  onCommand(callback: (command: string, action: string) => void) {
    this.onCommandCallback = callback;
  }

  getRecentCommands(): string[] {
    return [...this.commandQueue];
  }

  isCurrentlyListening(): boolean {
    return this.isListening;
  }
}

// Global instance
export const voiceAI = new VoiceAI();