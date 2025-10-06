/**
 * Debug version of AccessibilityDashboard
 * This will help us identify what's causing the loading issue
 */

import React, { useState, useEffect } from 'react';

interface DebugLog {
  timestamp: string;
  level: 'info' | 'error' | 'warn';
  message: string;
  error?: any;
}

export const DebugAccessibilityDashboard: React.FC = () => {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [loadingSteps, setLoadingSteps] = useState<string[]>([]);

  const addLog = (level: 'info' | 'error' | 'warn', message: string, error?: any) => {
    const log: DebugLog = {
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      error: error?.toString()
    };
    setLogs(prev => [...prev, log]);
    console.log(`[${level.toUpperCase()}] ${message}`, error);
  };

  useEffect(() => {
    addLog('info', 'DebugAccessibilityDashboard mounted');
    
    const testImports = async () => {
      const steps = [
        'Testing basic React imports',
        'Testing types import', 
        'Testing capabilityDetectionService',
        'Testing visualAccessibilityService',
        'Testing motorAccessibilityService',
        'Testing hearingAccessibilityService',
        'Testing cognitiveAccessibilityService',
        'Testing eyeTrackingService',
        'Testing enhancedVoiceCommandService'
      ];

      for (let i = 0; i < steps.length; i++) {
        setLoadingSteps(prev => [...prev, steps[i]]);
        addLog('info', `Step ${i + 1}: ${steps[i]}`);
        
        try {
          switch (i) {
            case 0:
              // Basic React - should work
              addLog('info', 'React imports working');
              break;
              
            case 1:
              // Test types import
              await import('../types'); // Just test the import, don't destructure
              addLog('info', 'Types import successful');
              break;
              
            case 2:
              // Test capability detection service
              const { capabilityDetectionService } = await import('../services/capabilityDetectionService');
              addLog('info', 'CapabilityDetectionService imported successfully');
              break;
              
            case 3:
              // Test visual accessibility service
              const { visualAccessibilityService } = await import('../services/visualAccessibilityService');
              addLog('info', 'VisualAccessibilityService imported successfully');
              break;
              
            case 4:
              // Test motor accessibility service
              const { motorAccessibilityService } = await import('../services/motorAccessibilityService');
              addLog('info', 'MotorAccessibilityService imported successfully');
              break;
              
            case 5:
              // Test hearing accessibility service - SKIP FOR NOW (causes infinite loop)
              addLog('warn', 'HearingAccessibilityService SKIPPED - causes infinite visual notification loop');
              break;
              
            case 6:
              // Test cognitive accessibility service
              const { cognitiveAccessibilityService } = await import('../services/cognitiveAccessibilityService');
              addLog('info', 'CognitiveAccessibilityService imported successfully');
              break;
              
            case 7:
              // Test eye tracking service
              const { eyeTrackingService } = await import('../services/eyeTrackingService');
              addLog('info', 'EyeTrackingService imported successfully');
              break;
              
            case 8:
              // Test enhanced voice command service
              const { enhancedVoiceCommandService } = await import('../services/enhancedVoiceCommandService');
              addLog('info', 'EnhancedVoiceCommandService imported successfully');
              break;
          }
          
          // Small delay to see progress
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          addLog('error', `Failed at step ${i + 1}: ${steps[i]}`, error);
          break;
        }
      }
      
      addLog('info', 'Import testing completed');
    };

    testImports();
  }, []);

  return (
    <div style={{ 
      color: 'white', 
      padding: '2rem', 
      fontFamily: 'monospace',
      backgroundColor: 'rgba(0,0,0,0.8)',
      borderRadius: '1rem',
      maxHeight: '80vh',
      overflow: 'auto',
      overflowY: 'scroll',
      scrollbarWidth: 'thin',
      scrollbarColor: '#666 #333'
    }}>
      <h2 style={{ color: '#4CAF50', marginBottom: '1rem' }}>🔧 Accessibility Debug Console</h2>
      
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ color: '#2196F3' }}>Loading Steps:</h3>
        {loadingSteps.map((step, index) => (
          <div key={index} style={{ 
            padding: '0.25rem 0', 
            color: '#81C784',
            fontSize: '0.9rem'
          }}>
            ✓ {step}
          </div>
        ))}
      </div>

      <div>
        <h3 style={{ color: '#FF9800' }}>Debug Logs:</h3>
        <div style={{ 
          maxHeight: '300px', 
          overflow: 'auto',
          overflowY: 'scroll',
          border: '1px solid #444',
          padding: '1rem',
          borderRadius: '0.5rem',
          backgroundColor: 'rgba(0,0,0,0.5)',
          scrollbarWidth: 'thin',
          scrollbarColor: '#666 #333'
        }}>
          {logs.map((log, index) => (
            <div key={index} style={{ 
              marginBottom: '0.5rem',
              color: log.level === 'error' ? '#f44336' : 
                     log.level === 'warn' ? '#ff9800' : '#4caf50'
            }}>
              <span style={{ opacity: 0.7 }}>[{log.timestamp}]</span> 
              <span style={{ fontWeight: 'bold', marginLeft: '0.5rem' }}>
                {log.level.toUpperCase()}:
              </span> 
              <span style={{ marginLeft: '0.5rem' }}>{log.message}</span>
              {log.error && (
                <div style={{ 
                  marginLeft: '2rem', 
                  fontSize: '0.8rem', 
                  opacity: 0.8,
                  marginTop: '0.25rem'
                }}>
                  Error: {log.error}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      <div style={{ marginTop: '2rem', fontSize: '0.8rem', opacity: 0.7 }}>
        <p>This debug component will help identify which service is causing the loading issue.</p>
        <p>Check the console (F12) for additional error details.</p>
      </div>
    </div>
  );
};