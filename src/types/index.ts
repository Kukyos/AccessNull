// Core types for the AccessPoint application

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
  | 'calibration'
  | 'menu'
  | 'prescriptions'
  | 'campus-info'
  | 'chat'
  | 'settings'
  | 'emergency';

export interface NavigationState {
  currentScreen: AppScreen;
  previousScreen: AppScreen | null;
}

export interface BlinkData {
  leftEyeClosed: number;  // 0-1, higher = more closed
  rightEyeClosed: number; // 0-1, higher = more closed
  isBlinking: boolean;
}
