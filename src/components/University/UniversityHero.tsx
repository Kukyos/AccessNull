import React from 'react';
import { KarunyaTheme } from '../../theme/colors';

interface UniversityHeroProps {
  sidebarCollapsed: boolean;
  faceTrackingEnabled: boolean;
  accessibilityLevel: 'normal' | 'large' | 'extra-large';
}

export const UniversityHero: React.FC<UniversityHeroProps> = ({
  sidebarCollapsed,
  faceTrackingEnabled,
  accessibilityLevel
}) => {
  const sidebarWidth = sidebarCollapsed ? 80 : 320;
  const baseFontSize = 14;
  const titleSize = 36;
  const subtitleSize = 18;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: `${sidebarWidth}px`,
        right: 0,
        height: '300px',
        background: KarunyaTheme.gradients.hero,
        display: 'flex',
        alignItems: 'center',
        padding: '2rem',
        transition: 'left 0.3s ease',
        zIndex: 900
      }}
    >
      {/* Hero Content */}
      <div style={{
        flex: 1,
        color: 'white',
        textAlign: 'left'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1rem'
        }}>
          <img 
            src="/assets/images/university/karunya-logo.png" 
            alt="Karunya University"
            style={{
              height: '40px',
              objectFit: 'contain',
              filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.3))'
            }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <h1 style={{
            fontSize: `${titleSize}px`,
            fontWeight: 'bold',
            margin: 0,
            textShadow: '0 4px 20px rgba(0,0,0,0.3)',
            lineHeight: 1.2
          }}>
            Welcome to Karunya University
          </h1>
        </div>
        <p style={{
          fontSize: `${subtitleSize}px`,
          margin: '0 0 2rem 0',
          opacity: 0.9,
          textShadow: '0 2px 10px rgba(0,0,0,0.3)',
          maxWidth: '600px',
          lineHeight: 1.4
        }}>
          Your accessible gateway to academic excellence, campus resources, and university services.
        </p>
        
        {/* Quick Stats */}
        <div style={{
          display: 'flex',
          gap: '2rem',
          flexWrap: 'wrap'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            padding: '1rem 1.5rem',
            textAlign: 'center',
            minWidth: '120px'
          }}>
            <div style={{ 
              fontSize: `${baseFontSize + 8}px`, 
              fontWeight: 'bold',
              color: KarunyaTheme.colors.primary.orange[300]
            }}>
              12,000+
            </div>
            <div style={{ fontSize: `${baseFontSize - 2}px`, opacity: 0.8 }}>
              Students
            </div>
          </div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            padding: '1rem 1.5rem',
            textAlign: 'center',
            minWidth: '120px'
          }}>
            <div style={{ 
              fontSize: `${baseFontSize + 8}px`, 
              fontWeight: 'bold',
              color: KarunyaTheme.colors.primary.orange[300]
            }}>
              50+
            </div>
            <div style={{ fontSize: `${baseFontSize - 2}px`, opacity: 0.8 }}>
              Programs
            </div>
          </div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            padding: '1rem 1.5rem',
            textAlign: 'center',
            minWidth: '120px'
          }}>
            <div style={{ 
              fontSize: `${baseFontSize + 8}px`, 
              fontWeight: 'bold',
              color: KarunyaTheme.colors.primary.orange[300]
            }}>
              35+
            </div>
            <div style={{ fontSize: `${baseFontSize - 2}px`, opacity: 0.8 }}>
              Years
            </div>
          </div>
        </div>
      </div>

      {/* Campus Image Placeholder */}
      <div style={{
        width: '400px',
        height: '250px',
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `2px dashed ${KarunyaTheme.colors.primary.orange[400]}`,
        marginLeft: '2rem'
      }}>
        <div style={{
          textAlign: 'center',
          color: KarunyaTheme.colors.primary.orange[400],
          fontSize: `${baseFontSize}px`
        }}>
          <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🏛️</div>
          <div>Campus Image</div>
          <div style={{ fontSize: `${baseFontSize - 4}px`, opacity: 0.8 }}>
            (Replace with actual photo)
          </div>
        </div>
      </div>
    </div>
  );
};