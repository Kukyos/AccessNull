import React, { useState, useRef, useEffect } from 'react';

interface ElementInfo {
  element: HTMLElement;
  text: string;
  type: string;
  isClickable: boolean;
  rect: DOMRect;
}

class IntelligentCommandProcessor {
  private getPageElements(): ElementInfo[] {
    const elements: ElementInfo[] = [];
    const allElements = document.querySelectorAll('*');
    
    allElements.forEach(el => {
      const htmlEl = el as HTMLElement;
      const rect = htmlEl.getBoundingClientRect();
      
      // Skip hidden or tiny elements
      if (rect.width < 10 || rect.height < 10 || htmlEl.offsetParent === null) {
        return;
      }
      
      const text = htmlEl.textContent?.trim() || '';
      const isClickable = this.isElementClickable(htmlEl);
      
      if (text || isClickable) {
        elements.push({
          element: htmlEl,
          text: text.slice(0, 100), // Limit text length
          type: htmlEl.tagName.toLowerCase(),
          isClickable,
          rect
        });
      }
    });
    
    return elements;
  }

  private isElementClickable(element: HTMLElement): boolean {
    const clickableTags = ['button', 'a', 'input'];
    const clickableRoles = ['button', 'link', 'tab', 'menuitem'];
    
    return (
      clickableTags.includes(element.tagName.toLowerCase()) ||
      clickableRoles.includes(element.getAttribute('role') || '') ||
      element.hasAttribute('onclick') ||
      element.style.cursor === 'pointer' ||
      element.hasAttribute('data-hoverable')
    );
  }

  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    let matches = 0;
    for (const word1 of words1) {
      for (const word2 of words2) {
        if (word1.includes(word2) || word2.includes(word1)) {
          matches++;
          break;
        }
      }
    }
    
    return matches / Math.max(words1.length, words2.length);
  }

  private analyzeIntent(command: string): {
    intent: string;
    keywords: string[];
    urgency: 'low' | 'medium' | 'high';
    targetWords: string[];
  } {
    const lower = command.toLowerCase().trim();
    const words = lower.split(/\s+/).filter(w => w.length > 1);
    
    // Clean up common speech recognition artifacts
    const cleanCommand = lower
      .replace(/\buh+\b/g, '') // Remove "uh", "uhh"
      .replace(/\bum+\b/g, '') // Remove "um", "umm"  
      .replace(/\ber+\b/g, '') // Remove "er", "err"
      .replace(/click more to mouth open/g, '') // Remove speech recognition artifacts
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
    
    console.log('🧠 Cleaned command:', cleanCommand, 'from original:', command);
    
    // Define intent patterns with much more sophisticated matching
    const patterns = {
      start: [
        /^(start|begin|continue|enter|proceed)(\s+.*)?$/,
        /\b(start|begin)\s+(the\s+)?(portal|application|app|menu)\b/,
        /\bget\s+started\b/,
        /\btake\s+me\s+(to\s+)?(main|portal|menu)\b/
      ],
      accessibility_toggle: [
        // Voice Assistant commands
        /\b(enable|turn\s+on|activate|start)\s+.*\b(voice|assistant|nullistant)\b/,
        /\b(disable|turn\s+off|deactivate|stop)\s+.*\b(voice|assistant|nullistant)\b/,
        
        // Face Tracking commands  
        /\b(enable|turn\s+on|activate|start)\s+.*\b(face|tracking|cursor|head)\b/,
        /\b(disable|turn\s+off|deactivate|stop)\s+.*\b(face|tracking|cursor|head)\b/,
        
        // Text-to-Speech commands
        /\b(enable|turn\s+on|activate|start)\s+.*\b(text|speech|narrator|reading|tts)\b/,
        /\b(disable|turn\s+off|deactivate|stop)\s+.*\b(text|speech|narrator|reading|tts)\b/,
        
        // More natural commands
        /\bturn\s+(on|off)\s+(voice|face|speech)/,
        /\b(start|stop)\s+(listening|tracking|speaking)/,
        /\b(enable|disable)\s+(narrator|assistant|cursor)/
      ],
      emergency: [
        /\b(help|emergency|save|urgent|crisis|danger|sos|mayday)\b/,
        /need.*(help|doctor|hospital)/,
        /save\s+me/,
        /\b911\b/,
        /call.*(ambulance|hospital|doctor)/
      ],
      contact: [
        /\b(call|phone|contact|dial|ring)\b.*\b(doctor|physician|nurse)\b/,
        /contact.*(doctor|physician|emergency)/,
        /\b(call|phone|ring)\b(?!.*back)/  // Call but not "call back"
      ],
      help: [
        /^help$/,
        /\bhelp\s+(me)?\b/,
        /what\s+can\s+i\s+(say|do)/,
        /available\s+commands/,
        /\b(commands|instructions|guide)\b/
      ],
      navigation: [
        // Explicit navigation commands
        /^(go\s+)?(back|return|exit|leave|quit|close)(\s+.*)?$/,
        /\b(back|return)\s+(to\s+)?(menu|main|home)\b/,
        /\b(exit|leave|quit|close)\s+(this|the|screen|page|tab)?\b/,
        /\bgo\s+(back|home|to\s+menu|to\s+main)\b/,
        /\b(main\s+screen|main\s+menu|home\s+screen)\b/,
        /\bget\s+(me\s+)?(out|back)/,
        /\btake\s+me\s+(back|home)/
      ],
      action: [
        /^(click|press|tap|select|choose|open|activate|launch)\s+/,
        /\b(button|link|option)\b/
      ]
    };
    
    let intent = 'unknown';
    let urgency: 'low' | 'medium' | 'high' = 'low';
    let targetWords: string[] = [];
    
    // Test patterns in order of priority
    for (const [intentType, patternList] of Object.entries(patterns)) {
      if (patternList.some(pattern => pattern.test(cleanCommand))) {
        intent = intentType;
        break;
      }
    }
    
    // Set target words and urgency based on intent
    switch (intent) {
      case 'start':
        urgency = 'high';
        targetWords = ['start', 'begin', 'continue', 'enter', 'proceed'];
        break;
      case 'accessibility_toggle':
        urgency = 'medium';
        targetWords = ['enable', 'disable', 'turn', 'voice', 'face', 'tracking', 'speech', 'narrator', 'assistant'];
        break;
      case 'emergency':
        urgency = 'high';
        targetWords = ['emergency', '911', 'help', 'urgent', 'call', 'doctor'];
        break;
      case 'contact':
        urgency = 'medium';
        targetWords = ['call', 'doctor', 'contact', 'phone', 'physician'];
        break;
      case 'help':
        urgency = 'high';
        targetWords = ['help', 'commands', 'instructions', 'guide'];
        break;
      case 'navigation':
        urgency = 'low';
        targetWords = ['back', 'menu', 'return', 'exit', 'close', 'main', 'home'];
        break;
      case 'action':
        urgency = 'low';
        targetWords = words.filter(w => !['click', 'press', 'tap', 'the', 'a', 'an'].includes(w));
        break;
      default:
        // For unknown intents, try to extract meaningful words
        targetWords = words.filter(w => 
          !['the', 'a', 'an', 'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'from'].includes(w)
        );
        // If it sounds like navigation but wasn't caught
        if (words.some(w => ['back', 'exit', 'leave', 'close', 'quit', 'return', 'menu', 'main'].includes(w))) {
          intent = 'navigation';
          targetWords = ['back', 'menu', 'return', 'exit', 'close'];
        }
    }
    
    console.log('🎯 Intent analysis result:', {
      original: command,
      cleaned: cleanCommand,
      intent,
      urgency,
      targetWords: targetWords.slice(0, 5)
    });
    
    return { intent, keywords: words, urgency, targetWords };
  }

  private handleAccessibilityCommand(command: string, analysis: any): {
    success: boolean;
    action: string;
    element?: HTMLElement;
    confidence: number;
    reasoning: string;
  } {
    const lowerCommand = command.toLowerCase();
    
    // Determine what accessibility feature and action
    let feature = '';
    let action = '';
    let targetText = '';
    
    // Determine action (enable/disable)
    if (lowerCommand.includes('enable') || lowerCommand.includes('turn on') || lowerCommand.includes('activate') || lowerCommand.includes('start')) {
      action = 'enable';
    } else if (lowerCommand.includes('disable') || lowerCommand.includes('turn off') || lowerCommand.includes('deactivate') || lowerCommand.includes('stop')) {
      action = 'disable';
    } else {
      action = 'toggle'; // Default to toggle if unclear
    }
    
    // Determine feature
    if (lowerCommand.includes('voice') || lowerCommand.includes('assistant') || lowerCommand.includes('nullistant')) {
      feature = 'voice';
      targetText = 'voice assistant';
    } else if (lowerCommand.includes('face') || lowerCommand.includes('tracking') || lowerCommand.includes('cursor') || lowerCommand.includes('head')) {
      feature = 'face';
      targetText = 'face tracking';
    } else if (lowerCommand.includes('text') || lowerCommand.includes('speech') || lowerCommand.includes('narrator') || lowerCommand.includes('reading') || lowerCommand.includes('tts')) {
      feature = 'speech';
      targetText = 'text-to-speech';
    }
    
    console.log('🎛️ Accessibility command:', { feature, action, targetText });
    console.log('🔍 Command analysis:', { command: lowerCommand, feature, action });
    
    // Find the corresponding toggle button
    const elements = this.getPageElements();
    console.log('📋 Available elements:', elements.length);
    let targetElement: HTMLElement | null = null;
    
    for (const elementInfo of elements) {
      const elementText = elementInfo.text.toLowerCase();
      console.log('🔍 Checking element:', elementText.slice(0, 50), 'for feature:', feature);
      
      // Look for accessibility toggle buttons
      if (feature === 'voice' && 
          (elementText.includes('voice assistant') || elementText.includes('nullistant'))) {
        targetElement = elementInfo.element;
        console.log('✅ Found voice assistant toggle:', elementText.slice(0, 50));
        break;
      } else if (feature === 'face' && 
                (elementText.includes('face tracking') || elementText.includes('cursor'))) {
        targetElement = elementInfo.element;
        console.log('✅ Found face tracking toggle:', elementText.slice(0, 50));
        break;
      } else if (feature === 'speech' && 
                (elementText.includes('text-to-speech') || elementText.includes('narrator'))) {
        targetElement = elementInfo.element;
        console.log('✅ Found text-to-speech toggle:', elementText.slice(0, 50));
        break;
      }
    }
    
    if (!targetElement) {
      console.warn('⚠️ Could not find target element for:', feature, 'action:', action);
      console.log('📝 Available element texts:', elements.map(e => e.text.slice(0, 30)));
      return {
        success: false,
        action: `Failed to find ${feature} toggle button`,
        confidence: 50,
        reasoning: `Could not locate ${targetText} button on page`
      };
    }

    if (targetElement && feature) {
      // Highlight and click the element
      const originalStyle = targetElement.style.cssText;
      targetElement.style.cssText += `
        outline: 3px solid #22c55e !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 10px #22c55e !important;
      `;
      
      // Scroll into view
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Click after highlighting - use multiple methods for Chrome compatibility
      setTimeout(() => {
        targetElement.style.cssText = originalStyle;
        
        // Try multiple click methods for Chrome compatibility
        try {
          // Method 1: Standard click
          targetElement.click();
          
          // Method 2: Dispatch mouse events (Chrome fallback)
          const mouseDown = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
          const mouseUp = new MouseEvent('mouseup', { bubbles: true, cancelable: true });
          const click = new MouseEvent('click', { bubbles: true, cancelable: true });
          
          targetElement.dispatchEvent(mouseDown);
          targetElement.dispatchEvent(mouseUp);
          targetElement.dispatchEvent(click);
          
          // Method 3: Trigger any onclick handlers directly
          if ((targetElement as any).onclick) {
            (targetElement as any).onclick();
          }
          
          console.log('✅ Clicked accessibility toggle (multi-method):', targetElement);
        } catch (error) {
          console.error('❌ Failed to click element:', error);
        }
      }, 800);
      
      return {
        success: true,
        action: `${action}d ${targetText}`,
        element: targetElement,
        confidence: 95,
        reasoning: `Accessibility command: ${action} ${feature} → found ${targetText} toggle`
      };
    } else {
      return {
        success: false,
        action: `could not find ${targetText} toggle`,
        confidence: 0,
        reasoning: `Accessibility command recognized but no matching toggle found for "${feature}"`
      };
    }
  }

  private handleHelpCommand(): {
    success: boolean;
    action: string;
    confidence: number;
    reasoning: string;
  } {
    console.log('ℹ️ Help command triggered');
    
    // Determine current page context for specific help
    let helpText = '';
    
    // Check if we're on the accessibility settings page
    if (document.querySelector('[role="button"]') && 
        (document.body.textContent?.includes('Voice Assistant') || 
         document.body.textContent?.includes('Face Tracking'))) {
      helpText = 'You are on the accessibility settings page. You can say: "enable voice assistant", "disable face tracking", "enable text to speech", or "enter university portal" to continue.';
    }
    // Check if we're in a chat interface
    else if (document.querySelector('input[type="text"]') || document.querySelector('textarea')) {
      helpText = 'You are in the chat interface. You can type your message or use voice commands like "back to menu" or "accessibility settings".';
    }
    // Default help
    else {
      helpText = 'Available commands include: "help" for this message, "back" to go back, accessibility commands like "enable voice assistant", or describe what you want to do.';
    }
    
    // Speak the help text
    const utterance = new SpeechSynthesisUtterance(helpText);
    utterance.rate = 0.9;
    utterance.volume = 0.8;
    speechSynthesis.speak(utterance);
    
    return {
      success: true,
      action: 'provided help information',
      confidence: 100,
      reasoning: 'Help command executed successfully'
    };
  }

  public async processCommand(command: string): Promise<{
    success: boolean;
    action: string;
    element?: HTMLElement;
    confidence: number;
    reasoning: string;
  }> {
    console.log('🤖 Processing command:', command);
    
    const elements = this.getPageElements();
    const analysis = this.analyzeIntent(command);
    
    console.log('📊 Intent analysis:', analysis);
    console.log('🔍 Found elements:', elements.length);
    
    // Special handling for accessibility toggle commands
    if (analysis.intent === 'accessibility_toggle') {
      return this.handleAccessibilityCommand(command, analysis);
    }
    
    // Special handling for help commands
    if (analysis.intent === 'help') {
      return this.handleHelpCommand();
    }
    
      // Find the best matching element with improved scoring
      let bestMatch: { element: ElementInfo; score: number; reason: string } | null = null;
      
      for (const elementInfo of elements) {
        let score = 0;
        let reasons: string[] = [];
        
        // Must be clickable to be considered
        if (!elementInfo.isClickable) {
          continue;
        }
        
        const elementText = elementInfo.text.toLowerCase();
        
        // IMPORTANT: Skip voice assistant elements when looking for navigation
        // This prevents the AI from clicking on itself when trying to navigate
        if (analysis.intent === 'navigation' && 
            (elementText.includes('ai voice') || 
             elementText.includes('nullistant') ||
             elementText.includes('listen') ||
             elementInfo.element.closest('[data-voice-assistant]'))) {
          console.log('🚫 Skipping voice assistant element for navigation:', elementText.slice(0, 30));
          continue;
        }      // High-priority exact matches
      for (const targetWord of analysis.targetWords) {
        if (elementText.includes(targetWord)) {
          score += 0.8;
          reasons.push(`contains "${targetWord}"`);
        }
      }
      
      // Intent-based scoring with better detection
      switch (analysis.intent) {
        case 'emergency':
          if (elementText.includes('emergency') || elementText.includes('911')) {
            score += 1.0;
            reasons.push('emergency button');
          } else if (elementText.includes('call') && elementText.includes('help')) {
            score += 0.8;
            reasons.push('emergency call');
          }
          // Check for red styling (emergency buttons are often red)
          const bgColor = window.getComputedStyle(elementInfo.element).backgroundColor;
          if (bgColor.includes('255, 0, 0') || bgColor.includes('244, 67, 54')) {
            score += 0.6;
            reasons.push('red button');
          }
          break;
          
        case 'contact':
          if (elementText.includes('call') || elementText.includes('doctor')) {
            score += 0.8;
            reasons.push('contact action');
          }
          if (elementText.includes('my doctor') || elementText.includes('physician')) {
            score += 0.9;
            reasons.push('doctor contact');
          }
          break;
          
        case 'navigation':
          // Highest priority for actual back/close buttons
          if (elementText.includes('back to menu') || elementText.includes('← back')) {
            score += 1.5;
            reasons.push('back to menu button');
          }
          if (elementText.includes('close chat') || elementText.includes('✕ close')) {
            score += 1.4;
            reasons.push('close screen button');
          }
          if (elementText.includes('back') || elementText.includes('menu') || elementText.includes('main')) {
            score += 1.2;
            reasons.push('navigation button');
          }
          if (elementText.includes('close') || elementText.includes('exit') || elementText.includes('✕')) {
            score += 1.1;
            reasons.push('close/exit button');
          }
          if (elementText.includes('←') || elementText.includes('return') || elementText.includes('home')) {
            score += 1.0;
            reasons.push('back navigation');
          }
          // Look for X buttons, close buttons, etc.
          if (elementText.match(/^(×|✕|x|X)$/) || elementText.trim() === '✕') {
            score += 1.3;
            reasons.push('X close button detected');
          }
          // Bonus for buttons that are likely page navigation (not voice assistant)
          const rect = elementInfo.rect;
          if (rect.bottom < window.innerHeight - 100) { // Not at bottom of screen
            score += 0.3;
            reasons.push('likely page button');
          }
          break;
      }
      
      // Text similarity (fuzzy matching)
      const textSimilarity = this.calculateSimilarity(command, elementInfo.text);
      if (textSimilarity > 0.3) {
        score += textSimilarity * 0.5;
        reasons.push(`${Math.round(textSimilarity * 100)}% text match`);
      }
      
      // Button type priority
      if (elementInfo.type === 'button') {
        score += 0.3;
        reasons.push('button element');
      }
      
      // Size matters - bigger elements are more likely targets
      const area = elementInfo.rect.width * elementInfo.rect.height;
      if (area > 5000) { // Large clickable area
        score += 0.2;
        reasons.push('large element');
      }
      
      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { 
          element: elementInfo, 
          score, 
          reason: reasons.join(', ') || 'partial match'
        };
      }
    }
    
    if (bestMatch && bestMatch.score > 0.7) { // Much higher threshold to prevent random clicking
      const element = bestMatch.element.element;
      const confidence = Math.min(Math.round(bestMatch.score * 100), 100);
      
      console.log('🎯 Best match found:', {
        element: bestMatch.element.text,
        score: bestMatch.score,
        reason: bestMatch.reason
      });
      
      // Highlight element briefly before clicking
      const originalStyle = element.style.cssText;
      element.style.cssText += `
        outline: 3px solid #3b82f6 !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 10px #3b82f6 !important;
      `;
      
      // Scroll element into view
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Click after highlighting
      setTimeout(() => {
        element.style.cssText = originalStyle;
        element.click();
        console.log('✅ Clicked element:', element);
      }, 800);
      
      return {
        success: true,
        action: `clicked "${bestMatch.element.text.slice(0, 30)}"`,
        element,
        confidence,
        reasoning: `${analysis.intent} intent → ${bestMatch.reason}`
      };
    }
    
    // Log all elements for debugging
    console.log('❌ No good match found. Available elements:', 
      elements.filter(e => e.isClickable).map(e => ({
        text: e.text.slice(0, 30),
        type: e.type
      }))
    );
    
    return {
      success: false,
      action: 'no suitable element found',
      confidence: 0,
      reasoning: `No confident match for "${command}" (intent: ${analysis.intent}). Found ${elements.filter(e => e.isClickable).length} clickable elements.`
    };
  }
}

interface IntelligentVoiceBoxProps {
  enabled?: boolean;
}

export const IntelligentVoiceBox: React.FC<IntelligentVoiceBoxProps> = ({ enabled = true }) => {
  const [isListening, setIsListening] = useState(false);
  const [isWakeWordMode, setIsWakeWordMode] = useState(false); // Start in always awake mode
  const [spokenText, setSpokenText] = useState('');
  const [status, setStatus] = useState(enabled ? '🤖 Nullistant ready - speak your command...' : '🤖 Nullistant disabled');
  const [lastAction, setLastAction] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [isExpanded, setIsExpanded] = useState(true); // Start expanded
  
  const recognitionRef = useRef<any>(null);
  const wakeWordRecognitionRef = useRef<any>(null);
  const processorRef = useRef(new IntelligentCommandProcessor());
  const restartTimeoutRef = useRef<number | null>(null);
  const lastProcessedTimeRef = useRef<number>(0);

  // Effect to handle enabled/disabled state
  useEffect(() => {
    if (!enabled) {
      // Clear any pending timeouts
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
      
      // Stop all recognition when disabled
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (wakeWordRecognitionRef.current) {
        wakeWordRecognitionRef.current.stop();
      }
      setIsListening(false);
      setStatus('🤖 Nullistant disabled');
      setSpokenText('');
      console.log('🔇 Nullistant disabled via toggle');
    } else {
      // Re-enable when enabled prop becomes true
      setStatus('🤖 Nullistant ready - speak your command...');
      console.log('🔊 Nullistant enabled via toggle');
      // Restart listening after a brief delay
      setTimeout(() => {
        if (enabled && !isListening) {
          startCommandListening();
        }
      }, 1000);
    }
  }, [enabled]);

  // Wake word detection function
  const detectWakeWord = (text: string): boolean => {
    const wakeWords = [
      'hey karunya',
      'hi karunya', 
      'karunya',
      'hey nullistant',
      'nullistant'
    ];
    
    const lowerText = text.toLowerCase().trim();
    return wakeWords.some(wake => lowerText.includes(wake));
  };

  useEffect(() => {
    // Check for both Chrome and Firefox speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      // Main command recognition
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;
      
      let finalTranscript = '';
      
      recognition.onstart = () => {
        setStatus('🤖 Nullistant listening...');
        setSpokenText('');
        finalTranscript = '';
      };
      
      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        finalTranscript = '';
        
        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Show current speech (interim + final)
        setSpokenText(finalTranscript + interimTranscript);
      };
      
      recognition.onend = async () => {
        setIsListening(false);
        console.log('🎯 Final transcript:', finalTranscript);
        
        if (finalTranscript.trim()) {
          setStatus('🤖 Nullistant analyzing...');
          await processIntelligentCommand(finalTranscript.trim());
          
          // Return to always awake command listening after processing
          setTimeout(() => {
            if (!isListening) {
              startCommandListening();
            }
          }, 2000);
        } else {
          // Add debouncing to prevent rapid alternation
          const now = Date.now();
          if (now - lastProcessedTimeRef.current < 3000) {
            console.log('🚫 Debouncing: Too soon since last command, skipping restart');
            setStatus('🤖 Nullistant ready - waiting...');
            
            // Clear existing timeout and set a longer one
            if (restartTimeoutRef.current) {
              clearTimeout(restartTimeoutRef.current);
            }
            restartTimeoutRef.current = setTimeout(() => {
              if (enabled && !isListening) {
                setStatus('🤖 Nullistant ready - speak your command...');
                startCommandListening();
              }
            }, 4000);
          } else {
            setStatus('No command detected - ready for next command');
            lastProcessedTimeRef.current = now;
            
            // Restart with a longer delay to prevent rapid cycling
            setTimeout(() => {
              if (enabled && !isListening) {
                startCommandListening();
              }
            }, 3000);
          }
        }
      };
      
      recognitionRef.current = recognition;

      // Wake word recognition (continuous)
      const wakeWordRecognition = new SpeechRecognition();
      wakeWordRecognition.continuous = true;
      wakeWordRecognition.interimResults = true;
      wakeWordRecognition.lang = 'en-US';
      wakeWordRecognition.maxAlternatives = 1;
      
      wakeWordRecognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        
        console.log('👂 Wake word detection:', transcript);
        
        if (detectWakeWord(transcript)) {
          console.log('🎯 Wake word detected!');
          wakeWordRecognition.stop();
          setIsWakeWordMode(false);
          
          // Brief pause, then start command listening
          setTimeout(() => {
            setStatus('🎯 Wake word detected! Speak your command...');
            startCommandListening();
          }, 500);
        }
      };
      
      wakeWordRecognition.onerror = (event: any) => {
        console.log('Wake word recognition error:', event.error);
        // Restart wake word listening on error
        setTimeout(() => {
          if (isWakeWordMode) {
            startWakeWordListening();
          }
        }, 1000);
      };
      
      wakeWordRecognitionRef.current = wakeWordRecognition;
      
      // Start command listening immediately in "Always Awake" mode
      setTimeout(() => {
        startCommandListening();
      }, 1000);
    } else {
      setStatus('❌ Speech recognition not supported');
      console.error('Speech recognition not supported in this browser');
    }

    // Cleanup function
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (wakeWordRecognitionRef.current) {
        wakeWordRecognitionRef.current.stop();
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
    };
  }, []);

  const startWakeWordListening = () => {
    if (wakeWordRecognitionRef.current && !isListening) {
      setIsWakeWordMode(true);
      setStatus('👂 Say "Hey Karunya" to activate...');
      setSpokenText('');
      wakeWordRecognitionRef.current.start();
    }
  };

  const startCommandListening = () => {
    // Clear any pending restart timeout
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    if (enabled && recognitionRef.current && !isListening) {
      setIsListening(true);
      setIsWakeWordMode(false);
      recognitionRef.current.start();
      console.log('🎤 Nullistant started listening');
    } else if (!enabled) {
      console.log('🚫 Nullistant is disabled, cannot start listening');
    }
  };

  const handleUnknownCommand = (command: string) => {
    console.log('🤷 Unknown command, providing TTS feedback:', command);
    
    // Use Speech Synthesis for immediate feedback
    const utterance = new SpeechSynthesisUtterance("Sorry, I couldn't understand that command.");
    utterance.rate = 0.9;
    utterance.volume = 0.8;
    
    utterance.onend = () => {
      // After saying sorry, re-announce the current page context
      setTimeout(() => {
        reAnnounceCurrentPage();
      }, 500);
    };
    
    speechSynthesis.speak(utterance);
  };

  const reAnnounceCurrentPage = () => {
    // Determine current page context and re-announce helpful information
    const currentUrl = window.location.pathname;
    const pageTitle = document.title;
    
    // Check for specific page indicators
    let pageContext = '';
    let availableCommands = '';
    
    // Check if we're on the accessibility landing page
    if (document.querySelector('[role="button"]') && 
        (document.body.textContent?.includes('Voice Assistant') || 
         document.body.textContent?.includes('Face Tracking'))) {
      pageContext = 'accessibility settings page';
      availableCommands = 'Try saying "enable voice assistant", "disable face tracking", "enable text to speech", or "enter university portal".';
    }
    // Check if we're in a chat or main interface
    else if (document.querySelector('input[type="text"]') || document.querySelector('textarea')) {
      pageContext = 'chat interface';
      availableCommands = 'You can type your message or say "help" for assistance.';
    }
    // Check if we're on the main portal
    else if (document.body.textContent?.includes('University') || document.body.textContent?.includes('Portal')) {
      pageContext = 'university portal';
      availableCommands = 'Try saying "start", "open chat", or "accessibility settings".';
    }
    // Default context
    else {
      pageContext = 'current page';
      availableCommands = 'Try saying "help", "back", or describe what you want to do.';
    }
    
    const reAnnouncement = `You are on the ${pageContext}. ${availableCommands}`;
    
    const utterance = new SpeechSynthesisUtterance(reAnnouncement);
    utterance.rate = 0.9;
    utterance.volume = 0.8;
    speechSynthesis.speak(utterance);
    
    console.log('🔄 Re-announced page context:', reAnnouncement);
  };

  const processIntelligentCommand = async (command: string) => {
    try {
      const result = await processorRef.current.processCommand(command);
      
      setConfidence(result.confidence);
      
      if (result.success) {
        setStatus(`✅ ${result.action}`);
        setLastAction(`"${command}" → ${result.reasoning}`);
      } else {
        setStatus(`❌ ${result.action}`);
        setLastAction(`Failed: ${result.reasoning}`);
        
        // Provide helpful TTS feedback for unknown commands
        handleUnknownCommand(command);
      }
    } catch (error) {
      console.error('Command processing error:', error);
      setStatus('❌ AI processing failed');
      
      // Also handle errors with TTS feedback
      const utterance = new SpeechSynthesisUtterance("Sorry, I encountered an error processing your command.");
      utterance.rate = 0.9;
      utterance.volume = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setStatus('🔇 Always Awake mode paused');
    } else {
      startCommandListening();
    }
  };

  return (
    <div 
      data-voice-assistant="true"
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 99999,
        fontFamily: 'Arial, sans-serif',
      }}>
      {/* Single Unified Box */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.75) 0%, rgba(50, 50, 50, 0.75) 100%)',
        backdropFilter: 'blur(15px)',
        border: '2px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '16px',
        padding: '12px',
        color: 'white',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        transition: 'all 0.3s ease',
        width: isExpanded ? '350px' : '200px',
        minHeight: isExpanded ? '300px' : '56px',
        opacity: 0.85 // Lower overall opacity
      }}>
        {/* Header Bar - Always Visible */}
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            userSelect: 'none',
            padding: '8px 12px',
            backgroundColor: isListening ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.2)',
            borderRadius: '12px',
            border: '1px solid rgba(34, 197, 94, 0.4)',
            marginBottom: isExpanded ? '15px' : '0',
            minHeight: '40px',
            transition: 'all 0.3s ease'
          }}
          data-hoverable="true"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              color: '#22c55e', 
              fontSize: '16px' 
            }}>
              🤖
            </span>
            <span style={{ 
              fontWeight: 'bold', 
              fontSize: '13px',
              color: 'white'
            }}>
              Nullistant (Always Awake)
            </span>
            {isListening && (
              <div style={{ 
                width: '6px', 
                height: '6px', 
                backgroundColor: '#22c55e', 
                borderRadius: '50%',
                animation: 'pulse 1s infinite'
              }} />
            )}
          </div>
          
          <div style={{
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.7)',
            fontWeight: 'normal'
          }}>
            {isExpanded ? 'Click to close' : 'Click to open'}
          </div>
          
          <style>
            {`
              @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.3; }
              }
            `}
          </style>
        </div>

        {/* Expanded Content - Inside Same Box */}
        {isExpanded && (
          <div style={{
            animation: 'slideDown 0.3s ease'
          }}>
            <style>
              {`
                @keyframes slideDown {
                  from { opacity: 0; transform: translateY(-10px); }
                  to { opacity: 1; transform: translateY(0); }
                }
              `}
            </style>
          
          <button
            onClick={toggleListening}
            style={{
              width: '100%',
              padding: '10px',
              background: isListening 
                ? 'linear-gradient(135deg, #ff4444, #cc0000)' 
                : isWakeWordMode
                ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
                : 'linear-gradient(135deg, #059669, #047857)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginBottom: '12px',
              transition: 'all 0.3s ease'
            }}
            data-hoverable="true"
          >
            {isListening ? '🔴 Pause Always Awake' : '🎤 Resume Always Awake'}
          </button>
          
          {/* Speech Display */}
          <div style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            padding: '10px',
            borderRadius: '6px',
            minHeight: '40px',
            marginBottom: '12px',
            fontSize: '12px'
          }}>
            {spokenText && (
              <div style={{ color: '#ffff00', marginBottom: '5px' }}>
                "{spokenText}"
              </div>
            )}
            {!spokenText && !isListening && (
              <div style={{ opacity: 0.7, fontSize: '11px' }}>
                Click Listen and speak naturally
              </div>
            )}
          </div>
          
          {/* Status */}
          <div style={{
            fontSize: '11px',
            color: status.includes('✅') ? '#10b981' : status.includes('❌') ? '#ff4444' : '#ccc',
            textAlign: 'center',
            padding: '6px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '4px',
            marginBottom: '8px'
          }}>
            {status}
          </div>
          
          {/* AI Analysis */}
          {lastAction && (
            <div style={{
              background: 'rgba(0,150,255,0.1)',
              border: '1px solid rgba(0,150,255,0.3)',
              padding: '8px',
              borderRadius: '4px',
              fontSize: '10px',
              marginBottom: '8px'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>🧠 AI:</div>
              <div>{lastAction}</div>
              {confidence > 0 && (
                <div style={{ marginTop: '3px', opacity: 0.8 }}>
                  {confidence}% confident
                </div>
              )}
            </div>
          )}
          
          {/* Quick Examples */}
          <div style={{
            fontSize: '9px',
            opacity: 0.6,
            lineHeight: 1.3
          }}>
            <strong>Always Awake Mode:</strong> Just speak naturally - no wake words needed!
          </div>
          </div>
        )}
      </div>
    </div>
  );
};