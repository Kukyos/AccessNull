/**
 * Universal Capability Detection Service
 * Automatically detects user capabilities without asking intrusive questions
 */

import type { 
  UserCapabilities, 
  CapabilityTest, 
  DetectionResult, 
  InputMethodState,
  MotorCapability,
  VisionCapability,
  HearingCapability,
  CognitiveCapability
} from '../types';

export class CapabilityDetectionService {
  
  /**
   * Main detection function - runs all capability tests
   */
  async detectCapabilities(): Promise<UserCapabilities> {
    console.log('🔍 Starting universal capability detection...');
    
    // Run parallel detection for different capability types
    const [motorResult, visionResult, hearingResult, cognitiveResult] = await Promise.all([
      this.detectMotorCapabilities(),
      this.detectVisionCapabilities(), 
      this.detectHearingCapabilities(),
      this.detectCognitiveCapabilities()
    ]);

    const capabilities: UserCapabilities = {
      motor: motorResult.value as MotorCapability,
      vision: visionResult.value as VisionCapability,
      hearing: hearingResult.value as HearingCapability,
      cognitive: cognitiveResult.value as CognitiveCapability,
      confidence: {
        motor: motorResult.confidence,
        vision: visionResult.confidence,
        hearing: hearingResult.confidence,
        cognitive: cognitiveResult.confidence
      },
      detectedAt: new Date(),
      userConfirmed: false
    };

    console.log('✅ Capability detection complete:', capabilities);
    return capabilities;
  }

  /**
   * Detect motor capabilities through various input tests
   */
  private async detectMotorCapabilities(): Promise<DetectionResult> {
    const tests: CapabilityTest[] = [
      {
        name: 'Touch/Mouse Precision',
        type: 'motor',
        method: 'touch',
        instructions: { text: 'Try tapping this button', visual: true },
        timeout: 5000,
        successCriteria: (result: unknown) => Boolean(result),
        confidenceWeight: 0.3
      },
      {
        name: 'Camera Availability',
        type: 'motor',
        method: 'face-tracking',
        instructions: { text: 'Checking camera for head tracking...', visual: true },
        timeout: 3000,
        successCriteria: (result: unknown) => Boolean(result),
        confidenceWeight: 0.4
      },
      {
        name: 'Voice Recognition',
        type: 'motor',
        method: 'voice-commands',
        instructions: { text: 'Say "hello" to test voice control', audio: 'Say hello to test voice control' },
        timeout: 5000,
        successCriteria: (result: unknown) => Boolean(result),
        confidenceWeight: 0.3
      }
    ];

    const results = await this.runTests(tests);
    
    // Determine motor capability based on test results
    let motorCapability: MotorCapability = 'full';
    let confidence = 0;

    const touchPassed = results.find(r => r.test === 'Touch/Mouse Precision')?.passed;
    const cameraPassed = results.find(r => r.test === 'Camera Availability')?.passed;
    const voicePassed = results.find(r => r.test === 'Voice Recognition')?.passed;

    if (touchPassed) {
      motorCapability = 'full';
      confidence = 0.9;
    } else if (cameraPassed) {
      motorCapability = 'head-only';
      confidence = 0.8;
    } else if (voicePassed) {
      motorCapability = 'voice-only';
      confidence = 0.7;
    } else {
      motorCapability = 'limited';
      confidence = 0.5;
    }

    return {
      capability: 'motor',
      value: motorCapability,
      confidence,
      testResults: results
    };
  }

  /**
   * Detect vision capabilities through various indicators
   */
  private async detectVisionCapabilities(): Promise<DetectionResult> {
    const tests: CapabilityTest[] = [
      {
        name: 'Screen Reader Detection',
        type: 'vision',
        method: 'keyboard',
        instructions: { text: 'Checking for screen reader...', visual: true },
        timeout: 1000,
        successCriteria: (result: unknown) => Boolean(result),
        confidenceWeight: 0.4
      },
      {
        name: 'High Contrast Preference',
        type: 'vision',
        method: 'keyboard',
        instructions: { text: 'Checking display preferences...', visual: true },
        timeout: 1000,
        successCriteria: (result: unknown) => Boolean(result),
        confidenceWeight: 0.3
      },
      {
        name: 'Zoom Level Detection',
        type: 'vision',
        method: 'mouse',
        instructions: { text: 'Checking zoom level...', visual: true },
        timeout: 1000,
        successCriteria: (result: unknown) => Boolean(result),
        confidenceWeight: 0.3
      }
    ];

    const results = await this.runTests(tests);
    
    let visionCapability: VisionCapability = 'full';
    let confidence = 0.8;

    // Check for screen reader
    const hasScreenReader = this.detectScreenReader();
    const hasHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
    const zoomLevel = Math.round(window.devicePixelRatio * 100);

    if (hasScreenReader) {
      visionCapability = 'blind';
      confidence = 0.9;
    } else if (hasHighContrast || zoomLevel > 150) {
      visionCapability = 'low-vision';
      confidence = 0.7;
    } else {
      visionCapability = 'full';
      confidence = 0.8;
    }

    return {
      capability: 'vision',
      value: visionCapability,
      confidence,
      testResults: results
    };
  }

  /**
   * Detect hearing capabilities
   */
  private async detectHearingCapabilities(): Promise<DetectionResult> {
    const tests: CapabilityTest[] = [
      {
        name: 'Audio Context Available',
        type: 'hearing',
        method: 'voice-commands',
        instructions: { text: 'Testing audio capabilities...', visual: true },
        timeout: 2000,
        successCriteria: (result: unknown) => Boolean(result),
        confidenceWeight: 0.4
      },
      {
        name: 'Microphone Access',
        type: 'hearing',
        method: 'voice-commands',
        instructions: { text: 'Checking microphone...', visual: true },
        timeout: 3000,
        successCriteria: (result: unknown) => Boolean(result),
        confidenceWeight: 0.6
      }
    ];

    const results = await this.runTests(tests);
    
    let hearingCapability: HearingCapability = 'full';
    let confidence = 0.8;

    // Check reduced motion preference (can indicate vestibular disorders)
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const audioCapable = await this.testAudioCapabilities();

    if (!audioCapable) {
      hearingCapability = 'deaf';
      confidence = 0.7;
    } else if (reducedMotion) {
      hearingCapability = 'hard-of-hearing';
      confidence = 0.6;
    } else {
      hearingCapability = 'full';
      confidence = 0.8;
    }

    return {
      capability: 'hearing',
      value: hearingCapability,
      confidence,
      testResults: results
    };
  }

  /**
   * Detect cognitive capabilities (simplified heuristics)
   */
  private async detectCognitiveCapabilities(): Promise<DetectionResult> {
    const tests: CapabilityTest[] = [
      {
        name: 'Response Time Test',
        type: 'cognitive',
        method: 'touch',
        instructions: { text: 'Measuring response patterns...', visual: true },
        timeout: 5000,
        successCriteria: (result: unknown) => Boolean(result),
        confidenceWeight: 0.5
      }
    ];

    const results = await this.runTests(tests);
    
    // For now, default to standard unless specific indicators are found
    let cognitiveCapability: CognitiveCapability = 'standard';
    let confidence = 0.6;

    // Check for reduced motion (can indicate attention/processing preferences)
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (reducedMotion) {
      cognitiveCapability = 'simplified';
      confidence = 0.5;
    }

    return {
      capability: 'cognitive',
      value: cognitiveCapability,
      confidence,
      testResults: results
    };
  }

  /**
   * Run a set of capability tests
   */
  private async runTests(tests: CapabilityTest[]): Promise<Array<{
    test: string;
    passed: boolean;
    score: number;
    duration: number;
  }>> {
    const results = [];

    for (const test of tests) {
      const startTime = performance.now();
      try {
        const result = await this.runSingleTest(test);
        const duration = performance.now() - startTime;
        const passed = test.successCriteria(result);
        
        results.push({
          test: test.name,
          passed,
          score: passed ? 1 : 0,
          duration
        });
      } catch (error) {
        const duration = performance.now() - startTime;
        console.warn(`Test ${test.name} failed:`, error);
        results.push({
          test: test.name,
          passed: false,
          score: 0,
          duration
        });
      }
    }

    return results;
  }

  /**
   * Run a single capability test
   */
  private async runSingleTest(test: CapabilityTest): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Test ${test.name} timed out`));
      }, test.timeout);

      try {
        switch (test.method) {
          case 'touch':
          case 'mouse':
            resolve(this.testTouchInput());
            break;
          case 'face-tracking':
            this.testCameraAccess().then(resolve).catch(reject);
            break;
          case 'voice-commands':
            this.testVoiceInput().then(resolve).catch(reject);
            break;
          case 'keyboard':
            resolve(this.testKeyboardInput());
            break;
          default:
            resolve(true);
        }
      } catch (error) {
        reject(error);
      } finally {
        clearTimeout(timeout);
      }
    });
  }

  // ===== INDIVIDUAL TEST METHODS =====

  private testTouchInput(): boolean {
    // Check if touch is available
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  private async testCameraAccess(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      // Clean up immediately
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch {
      return false;
    }
  }

  private async testVoiceInput(): Promise<boolean> {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }

  private testKeyboardInput(): boolean {
    return true; // Assume keyboard is always available
  }

  private detectScreenReader(): boolean {
    // Multiple detection methods for screen readers
    return !!(
      // Check for common screen reader user agents
      navigator.userAgent.includes('NVDA') ||
      navigator.userAgent.includes('JAWS') ||
      navigator.userAgent.includes('VoiceOver') ||
      // Check for speech synthesis (often used by screen readers)
      ('speechSynthesis' in window && window.speechSynthesis.getVoices().length > 0) ||
      // Check for accessibility APIs
      (window as unknown as { speechSynthesis?: unknown }).speechSynthesis
    );
  }

  private async testAudioCapabilities(): Promise<boolean> {
    try {
      // Check if Web Audio API is available
      const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof window.AudioContext }).webkitAudioContext;
      if (!AudioContext) return false;

      // Try to create audio context
      const context = new AudioContext();
      await context.close();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get available input methods based on detected capabilities
   */
  async getAvailableInputMethods(capabilities: UserCapabilities): Promise<InputMethodState[]> {
    const methods: InputMethodState[] = [];

    // Face tracking
    if (await this.testCameraAccess()) {
      methods.push({
        type: 'face-tracking',
        available: true,
        active: capabilities.motor === 'head-only',
        confidence: capabilities.confidence.motor,
        errorCount: 0,
        lastUsed: null,
        isPrimary: capabilities.motor === 'head-only',
        fallbackFor: ['touch', 'mouse']
      });
    }

    // Voice commands
    if (await this.testVoiceInput() && capabilities.hearing !== 'deaf') {
      methods.push({
        type: 'voice-commands',
        available: true,
        active: capabilities.motor === 'voice-only',
        confidence: capabilities.confidence.hearing,
        errorCount: 0,
        lastUsed: null,
        isPrimary: capabilities.motor === 'voice-only',
        fallbackFor: ['touch', 'face-tracking', 'keyboard']
      });
    }

    // Touch/Mouse
    if (this.testTouchInput() && capabilities.motor === 'full') {
      methods.push({
        type: 'touch',
        available: true,
        active: capabilities.motor === 'full',
        confidence: capabilities.confidence.motor,
        errorCount: 0,
        lastUsed: null,
        isPrimary: capabilities.motor === 'full',
        fallbackFor: []
      });
    }

    // Keyboard (always available)
    methods.push({
      type: 'keyboard',
      available: true,
      active: capabilities.vision === 'blind',
      confidence: 0.9,
      errorCount: 0,
      lastUsed: null,
      isPrimary: capabilities.vision === 'blind',
      fallbackFor: ['touch', 'mouse', 'face-tracking']
    });

    return methods;
  }
}

// Singleton instance
export const capabilityDetectionService = new CapabilityDetectionService();