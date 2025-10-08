import React from 'react';
import { KarunyaTheme } from '../../theme/colors';
import { KARUNYA_DEPARTMENTS, SAMPLE_CIRCULARS, CAMPUS_FACILITIES } from '../../data/universityData';

interface UniversityMainContentProps {
  currentSection: string;
  sidebarCollapsed: boolean;
  faceTrackingEnabled: boolean;
  accessibilityLevel: 'normal' | 'large' | 'extra-large';
  onSectionChange: (section: string) => void;
}

export const UniversityMainContent: React.FC<UniversityMainContentProps> = ({
  currentSection,
  sidebarCollapsed,
  faceTrackingEnabled,
  accessibilityLevel,
  onSectionChange
}) => {
  const sidebarWidth = sidebarCollapsed ? 80 : 320;
  const baseFontSize = 14;
  const titleSize = 20;
  const cardPadding = 16;

  const renderHomeContent = () => (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {/* Quick Actions */}
      <div style={{
        background: KarunyaTheme.gradients.surface,
        borderRadius: '16px',
        padding: `${cardPadding}px`,
        border: `1px solid ${KarunyaTheme.colors.primary.blue[200]}`
      }}>
        <h3 style={{
          fontSize: `${titleSize}px`,
          color: KarunyaTheme.colors.text.primary,
          margin: '0 0 1rem 0'
        }}>
          Quick Actions
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem'
        }}>
          {[
            { id: 'library', title: 'Digital Library', icon: '📚', desc: 'Access books and resources' },
            { id: 'circulars', title: 'Latest Circulars', icon: '📢', desc: 'University announcements' },
            { id: 'grades', title: 'Check Grades', icon: '📊', desc: 'View your academic progress' },
            { id: 'health', title: 'Health Center', icon: '🏥', desc: '24/7 medical support' }
          ].map((action) => (
            <button
              key={action.id}
              data-hoverable
              onClick={() => onSectionChange(action.id)}
              style={{
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(10px)',
                border: `1px solid ${KarunyaTheme.colors.primary.blue[200]}`,
                borderRadius: '12px',
                padding: `${cardPadding * 0.8}px`,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.7)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <div style={{ fontSize: `${titleSize + 8}px`, marginBottom: '0.5rem' }}>
                {action.icon}
              </div>
              <div style={{
                fontSize: `${baseFontSize + 2}px`,
                fontWeight: '600',
                color: KarunyaTheme.colors.text.primary,
                marginBottom: '0.25rem'
              }}>
                {action.title}
              </div>
              <div style={{
                fontSize: `${baseFontSize - 2}px`,
                color: KarunyaTheme.colors.text.secondary
              }}>
                {action.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Announcements */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.9)',
        borderRadius: '16px',
        padding: `${cardPadding}px`,
        border: `1px solid ${KarunyaTheme.colors.primary.orange[200]}`
      }}>
        <h3 style={{
          fontSize: `${titleSize}px`,
          color: KarunyaTheme.colors.text.primary,
          margin: '0 0 1rem 0',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          📢 Recent Announcements
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {SAMPLE_CIRCULARS.slice(0, 3).map((circular) => (
            <div
              key={circular.id}
              style={{
                background: 'rgba(59, 130, 246, 0.05)',
                borderRadius: '8px',
                padding: `${cardPadding * 0.6}px`,
                border: `1px solid ${KarunyaTheme.colors.primary.blue[100]}`
              }}
            >
              <div style={{
                fontSize: `${baseFontSize + 1}px`,
                fontWeight: '600',
                color: KarunyaTheme.colors.text.primary,
                marginBottom: '0.25rem'
              }}>
                {circular.title}
              </div>
              <div style={{
                fontSize: `${baseFontSize - 1}px`,
                color: KarunyaTheme.colors.text.secondary,
                lineHeight: 1.4
              }}>
                {circular.content.substring(0, 100)}...
              </div>
              <div style={{
                fontSize: `${baseFontSize - 3}px`,
                color: KarunyaTheme.colors.text.tertiary,
                marginTop: '0.5rem'
              }}>
                {circular.dateIssued.toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAcademicsContent = () => (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <h2 style={{
        fontSize: `${titleSize + 4}px`,
        color: KarunyaTheme.colors.text.primary,
        margin: 0
      }}>
        Academic Information
      </h2>
      
      {/* Departments */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.9)',
        borderRadius: '16px',
        padding: `${cardPadding}px`,
        border: `1px solid ${KarunyaTheme.colors.primary.blue[200]}`
      }}>
        <h3 style={{
          fontSize: `${titleSize}px`,
          color: KarunyaTheme.colors.text.primary,
          margin: '0 0 1rem 0'
        }}>
          Departments
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1rem'
        }}>
          {KARUNYA_DEPARTMENTS.map((dept) => (
            <div
              key={dept.id}
              style={{
                background: KarunyaTheme.gradients.surface,
                borderRadius: '12px',
                padding: `${cardPadding * 0.8}px`,
                border: `1px solid ${KarunyaTheme.colors.primary.blue[100]}`
              }}
            >
              <div style={{
                fontSize: `${baseFontSize + 3}px`,
                fontWeight: '600',
                color: KarunyaTheme.colors.text.primary,
                marginBottom: '0.5rem'
              }}>
                {dept.name}
              </div>
              <div style={{
                fontSize: `${baseFontSize}px`,
                color: KarunyaTheme.colors.text.secondary,
                marginBottom: '0.75rem',
                lineHeight: 1.4
              }}>
                {dept.description}
              </div>
              <div style={{
                fontSize: `${baseFontSize - 1}px`,
                color: KarunyaTheme.colors.text.tertiary
              }}>
                Head: {dept.head}
              </div>
              <div style={{
                fontSize: `${baseFontSize - 1}px`,
                color: KarunyaTheme.colors.text.tertiary
              }}>
                Contact: {dept.contactEmail}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderCircularsContent = () => (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <h2 style={{
        fontSize: `${titleSize + 4}px`,
        color: KarunyaTheme.colors.text.primary,
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        📢 University Circulars
      </h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {SAMPLE_CIRCULARS.map((circular) => (
          <div
            key={circular.id}
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              borderRadius: '16px',
              padding: `${cardPadding}px`,
              border: `1px solid ${KarunyaTheme.colors.primary.orange[200]}`,
              borderLeft: `4px solid ${
                circular.priority === 'urgent' ? KarunyaTheme.colors.academic.danger :
                circular.priority === 'high' ? KarunyaTheme.colors.academic.warning :
                KarunyaTheme.colors.primary.blue[500]
              }`
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '0.75rem'
            }}>
              <h3 style={{
                fontSize: `${baseFontSize + 3}px`,
                fontWeight: '600',
                color: KarunyaTheme.colors.text.primary,
                margin: 0,
                flex: 1
              }}>
                {circular.title}
              </h3>
              <span style={{
                background: circular.priority === 'urgent' ? KarunyaTheme.colors.academic.danger :
                          circular.priority === 'high' ? KarunyaTheme.colors.academic.warning :
                          KarunyaTheme.colors.primary.blue[500],
                color: 'white',
                padding: '0.25rem 0.75rem',
                borderRadius: '12px',
                fontSize: `${baseFontSize - 3}px`,
                fontWeight: '500',
                textTransform: 'uppercase'
              }}>
                {circular.priority}
              </span>
            </div>
            
            <p style={{
              fontSize: `${baseFontSize}px`,
              color: KarunyaTheme.colors.text.secondary,
              lineHeight: 1.5,
              margin: '0 0 1rem 0'
            }}>
              {circular.content}
            </p>
            
            <div style={{
              display: 'flex',
              gap: '1rem',
              fontSize: `${baseFontSize - 2}px`,
              color: KarunyaTheme.colors.text.tertiary
            }}>
              <span>📅 {circular.dateIssued.toLocaleDateString()}</span>
              <span>🏷️ {circular.category}</span>
              <span>👥 {circular.targetAudience}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderFacilitiesContent = () => (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <h2 style={{
        fontSize: `${titleSize + 4}px`,
        color: KarunyaTheme.colors.text.primary,
        margin: 0
      }}>
        Campus Facilities
      </h2>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '1.5rem'
      }}>
        {CAMPUS_FACILITIES.map((facility) => (
          <div
            key={facility.id}
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              borderRadius: '16px',
              padding: `${cardPadding}px`,
              border: `1px solid ${KarunyaTheme.colors.primary.blue[200]}`
            }}
          >
            <h3 style={{
              fontSize: `${baseFontSize + 3}px`,
              fontWeight: '600',
              color: KarunyaTheme.colors.text.primary,
              margin: '0 0 0.5rem 0'
            }}>
              {facility.name}
            </h3>
            
            <div style={{
              fontSize: `${baseFontSize - 1}px`,
              color: KarunyaTheme.colors.text.tertiary,
              marginBottom: '0.75rem'
            }}>
              📍 {facility.location}
            </div>
            
            <p style={{
              fontSize: `${baseFontSize}px`,
              color: KarunyaTheme.colors.text.secondary,
              lineHeight: 1.4,
              margin: '0 0 1rem 0'
            }}>
              {facility.description}
            </p>
            
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{
                fontSize: `${baseFontSize - 1}px`,
                fontWeight: '600',
                color: KarunyaTheme.colors.text.primary,
                marginBottom: '0.25rem'
              }}>
                ♿ Accessibility Features:
              </div>
              <div style={{
                fontSize: `${baseFontSize - 1}px`,
                color: KarunyaTheme.colors.text.secondary
              }}>
                {facility.accessibilityFeatures.join(', ')}
              </div>
            </div>
            
            <div>
              <div style={{
                fontSize: `${baseFontSize - 1}px`,
                fontWeight: '600',
                color: KarunyaTheme.colors.text.primary,
                marginBottom: '0.25rem'
              }}>
                🕒 Timings:
              </div>
              <div style={{
                fontSize: `${baseFontSize - 1}px`,
                color: KarunyaTheme.colors.text.secondary
              }}>
                Weekdays: {facility.timings.weekdays}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (currentSection) {
      case 'home':
        return renderHomeContent();
      case 'academics':
      case 'courses':
      case 'faculty':
        return renderAcademicsContent();
      case 'circulars':
        return renderCircularsContent();
      case 'facilities':
      case 'library':
        return renderFacilitiesContent();
      default:
        return (
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            color: KarunyaTheme.colors.text.secondary
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚧</div>
            <h2 style={{ fontSize: `${titleSize}px`, margin: '0 0 1rem 0' }}>
              Coming Soon
            </h2>
            <p style={{ fontSize: `${baseFontSize}px` }}>
              This section is under development. Please check back soon!
            </p>
          </div>
        );
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '300px', // Below hero
        left: `${sidebarWidth}px`,
        right: 0,
        bottom: 0,
        padding: '2rem',
        overflow: 'auto',
        background: 'rgba(248, 250, 252, 0.9)',
        backdropFilter: 'blur(10px)',
        transition: 'left 0.3s ease'
      }}
    >
      {renderContent()}
    </div>
  );
};