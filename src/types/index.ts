// ===== UNIVERSAL ACCESSIBILITY TYPES =====

export interface Point2D {
  x: number;
  y: number;
}

export interface FaceLandmarks {
  forehead: Point2D;
  leftEye: Point2D;
  rightEye: Point2D;
  nose: Point2D;
}

export interface CursorState {
  position: Point2D;
  isHovering: boolean;
  dwellProgress: number; // 0-100
  target: HTMLElement | null;
}

export interface CalibrationSettings {
  sensitivity: number; // 0.1 - 2.0
  smoothing: number; // 0.1 - 0.9
  dwellTime: number; // milliseconds
  blinkEnabled: boolean;
  clickMethod: 'blink' | 'mouth' | 'eye-tracking' | 'voice' | 'switch'; // Multiple click trigger methods
}

export interface CameraError {
  code: 'PERMISSION_DENIED' | 'NOT_FOUND' | 'NOT_READABLE' | 'UNKNOWN';
  message: string;
}

export interface MediaPipeError {
  code: 'LOAD_FAILED' | 'DETECTION_FAILED' | 'NOT_INITIALIZED';
  message: string;
}

export type AppScreen = 
  | 'loading'
  | 'instructions'
  | 'capability-detection'
  | 'calibration'
  | 'menu'
  | 'prescriptions'
  | 'campus-info'
  | 'chat'
  | 'settings'
  | 'emergency'
  | 'accessibility-settings';

export interface NavigationState {
  currentScreen: AppScreen;
  previousScreen: AppScreen | null;
}

export interface BlinkData {
  leftEyeClosed: number;  // 0-1, higher = more closed
  rightEyeClosed: number; // 0-1, higher = more closed
  isBlinking: boolean;
  mouthOpen: number;      // 0-1, higher = more open
  isMouthOpen: boolean;
}

// ===== UNIVERSAL ACCESSIBILITY SYSTEM =====

export type MotorCapability = 'full' | 'limited' | 'head-only' | 'voice-only' | 'switch-only' | 'eye-only';
export type VisionCapability = 'full' | 'low-vision' | 'color-blind' | 'blind';
export type HearingCapability = 'full' | 'hard-of-hearing' | 'deaf';
export type CognitiveCapability = 'standard' | 'simplified' | 'assisted' | 'memory-support';

export interface UserCapabilities {
  motor: MotorCapability;
  vision: VisionCapability;
  hearing: HearingCapability;
  cognitive: CognitiveCapability;
  confidence: {
    motor: number; // 0-1
    vision: number;
    hearing: number;
    cognitive: number;
  };
  detectedAt: Date;
  userConfirmed: boolean;
}

export type InputMethod = 
  | 'face-tracking'
  | 'eye-tracking' 
  | 'voice-commands'
  | 'touch'
  | 'mouse'
  | 'keyboard'
  | 'switch-access'
  | 'blink'
  | 'mouth'
  | 'head-gesture';

export interface InputMethodState {
  type: InputMethod;
  available: boolean;
  active: boolean;
  confidence: number; // 0-1, how well is this working?
  errorCount: number;
  lastUsed: Date | null;
  isPrimary: boolean;
  fallbackFor: InputMethod[]; // What methods this can substitute for
}

export type UIMode = 
  | 'universal' // All features available
  | 'vision-first' // Optimized for blind/low-vision
  | 'hearing-first' // Optimized for deaf/hard-of-hearing
  | 'motor-first' // Optimized for motor impairments
  | 'cognitive-first' // Simplified for cognitive accessibility
  | 'high-contrast' // High contrast mode
  | 'large-text' // Large text mode
  | 'simplified' // Minimal complexity
  | 'voice-only' // Audio-only interface
  | 'touch-optimized'; // Large touch targets

export interface AccessibilitySettings {
  // Visual Settings
  highContrast: boolean;
  darkMode: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  reduceMotion: boolean;
  showCaptions: boolean;
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  screenReader: boolean;
  
  // Motor Settings
  dwellTime: number; // milliseconds
  clickConfirmation: boolean;
  tremorCompensation: boolean;
  stickyKeys: boolean;
  motorAssist: boolean;
  eyeTracking: boolean;
  voiceControl: boolean;
  
  // Hearing Settings
  visualAlerts: boolean;
  vibrationEnabled: boolean;
  soundAmplification: number; // 0-200%
  signLanguagePreference: 'ASL' | 'BSL' | 'ISL' | 'none';
  hearingAssist: boolean;
  
  // Cognitive Settings
  simplifiedInterface: boolean;
  showHelp: boolean;
  confirmActions: boolean;
  stepByStep: boolean;
  cognitiveAssist: boolean;
  
  // Voice Settings
  voiceSpeed: number; // 0.5-2.0
  voicePitch: number; // 0-2
  voiceVolume: number; // 0-100
  speechLanguage: 'en' | 'hi' | 'auto';
  
  // Input Method Preferences
  primaryInput: InputMethod;
  secondaryInput: InputMethod;
  inputMethods: InputMethodState[];
}

export interface EyeTrackingData {
  x: number; // Screen coordinates
  y: number;
  confidence: number; // 0-1
  isTracking: boolean;
  calibrated: boolean;
  gazeDuration: number; // milliseconds on current target
}

export interface VoiceCommand {
  command: string;
  action: string;
  parameters?: Record<string, unknown>;
  confirmation?: boolean; // Requires voice confirmation
  context?: AppScreen[]; // Which screens this command works on
}

export interface HapticPattern {
  pattern: number[]; // Vibration pattern in milliseconds
  intensity?: number; // 0-100
  repeat?: number;
}

export interface AlertConfig {
  visual: boolean;
  audio: boolean;
  haptic: boolean;
  speech: boolean;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  autoRead: boolean; // For screen readers
}

export interface AccessibilityAlert {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'emergency';
  config: AlertConfig;
  timestamp: Date;
  acknowledged: boolean;
  speakImmediately?: boolean;
}

// ===== CAPABILITY DETECTION =====

export interface CapabilityTest {
  name: string;
  type: 'motor' | 'vision' | 'hearing' | 'cognitive';
  method: InputMethod;
  instructions: {
    text: string;
    audio?: string;
    visual?: boolean;
  };
  timeout: number; // milliseconds
  successCriteria: (result: unknown) => boolean;
  confidenceWeight: number; // How much this test affects confidence score
}

export interface DetectionResult {
  capability: keyof UserCapabilities;
  value: string;
  confidence: number;
  testResults: Array<{
    test: string;
    passed: boolean;
    score: number;
    duration: number;
  }>;
}

// ===== SCREEN READER INTEGRATION =====

export interface ScreenReaderAnnouncement {
  text: string;
  priority: 'polite' | 'assertive' | 'off';
  interrupt?: boolean;
  region?: string; // ARIA live region
}

export interface ARIAProperties {
  label?: string;
  describedBy?: string;
  expanded?: boolean;
  hasPopup?: boolean;
  live?: 'polite' | 'assertive' | 'off';
  atomic?: boolean;
  relevant?: 'additions' | 'removals' | 'text' | 'all';
}

// ===== EMERGENCY SYSTEM =====

export interface EmergencyConfig {
  enabled: boolean;
  triggers: InputMethod[]; // Which input methods can trigger emergency
  contacts: Array<{
    name: string;
    phone: string;
    sms: boolean;
    call: boolean;
    priority: number;
  }>;
  location: {
    enabled: boolean;
    shareWithContacts: boolean;
    shareWithServices: boolean;
  };
  medical: {
    conditions: string[];
    medications: string[];
    allergies: string[];
    emergencyNotes: string;
  };
}

export interface EmergencyTrigger {
  method: InputMethod;
  pattern: unknown; // Specific pattern for this input method
  confirmationRequired: boolean;
  timeout: number; // How long to wait for confirmation
}

// ===== COMPONENT PROPS =====

export interface UniversalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  voiceCommand?: string;
  hapticFeedback?: HapticPattern;
  ariaLabel?: string;
  tooltip?: string;
  confirmAction?: boolean;
}

export interface AdaptiveCardProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'glass' | 'outlined' | 'elevated';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  children?: React.ReactNode;
  ariaLabel?: string;
  voiceCommand?: string;
}

// ===== ERROR HANDLING =====

export interface AccessibilityError {
  code: string;
  message: string;
  inputMethod?: InputMethod;
  recoveryActions?: string[];
  fallbackMethods?: InputMethod[];
  timestamp: Date;
  userImpact: 'low' | 'medium' | 'high' | 'critical';
}
