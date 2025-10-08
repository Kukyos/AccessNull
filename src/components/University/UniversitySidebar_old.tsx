import React from 'react';
import { KarunyaTheme } from '../../theme/colors';

interface UniversitySidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  currentSection: string;
  onSectionChange: (section: string) => void;
  faceTrackingEnabled: boolean;
  accessibilityLevel: 'normal' | 'large' | 'extra-large';
}

const sidebarSections = [
  {
    id: 'home',
    title: 'Home',
    icon: '🏠',
    description: 'University Overview'
  },
  {
    id: 'chat',
    title: 'NullChat',
    icon: '💬',
    description: 'University AI Assistant'
  },
  {
    id: 'academics',
    title: 'Academics',
    icon: '📚',
    description: 'Courses & Programs',
    subsections: [
      { id: 'courses', title: 'Course Catalog', icon: '📖' },
      { id: 'schedule', title: 'Class Schedule', icon: '📅' },
      { id: 'grades', title: 'Grades & Results', icon: '📊' },
      { id: 'faculty', title: 'Faculty Directory', icon: '👨‍🏫' },
      { id: 'admissions', title: 'Admissions Office', icon: '🎓' },
      { id: 'departments', title: 'Academic Departments', icon: '🏛️' },
      { id: 'research', title: 'Research Programs', icon: '🔬' },
      { id: 'internships', title: 'Internship Portal', icon: '💼' },
      { id: 'thesis', title: 'Thesis Guidelines', icon: '📜' },
      { id: 'academic-calendar', title: 'Academic Calendar', icon: '📆' },
      { id: 'exam-center', title: 'Examination Center', icon: '✏️' },
      { id: 'academic-policies', title: 'Academic Policies', icon: '📑' }
    ]
  },
  {
    id: 'resources',
    title: 'Resources',
    icon: '🔧',
    description: 'University Services',
    subsections: [
      { id: 'library', title: 'Digital Library', icon: '📚' },
      { id: 'labs', title: 'Lab Resources', icon: '🔬' },
      { id: 'facilities', title: 'Campus Facilities', icon: '🏢' },
      { id: 'accessibility', title: 'Accessibility Services', icon: '♿' },
      { id: 'it-services', title: 'IT Services', icon: '💻' },
      { id: 'counseling', title: 'Counseling Center', icon: '🧠' },
      { id: 'health-center', title: 'Health Center', icon: '🏥' },
      { id: 'dining', title: 'Dining Services', icon: '🍽️' },
      { id: 'housing', title: 'Housing & Residence', icon: '🏠' },
      { id: 'transportation', title: 'Transportation', icon: '🚌' },
      { id: 'financial-aid', title: 'Financial Aid', icon: '💰' },
      { id: 'career-services', title: 'Career Services', icon: '💼' }
    ]
  },
  {
    id: 'circulars',
    title: 'Circulars',
    icon: '📢',
    description: 'Official Announcements'
  },
  {
    id: 'events',
    title: 'Events',
    icon: '🎉',
    description: 'Campus Activities'
  },
  {
    id: 'support',
    title: 'Support',
    icon: '🆘',
    description: 'Help & Services',
    subsections: [
      { id: 'health', title: 'Health Center', icon: '🏥' },
      { id: 'counseling', title: 'Counseling', icon: '💬' },
      { id: 'technical', title: 'API Settings', icon: '�' },
      { id: 'emergency', title: 'Emergency', icon: '🚨' }
    ]
  }
];

export const UniversitySidebar: React.FC<UniversitySidebarProps> = ({
  isCollapsed,
  onToggle,
  currentSection,
  onSectionChange,
  faceTrackingEnabled,
  accessibilityLevel
}) => {
  const [expandedSections, setExpandedSections] = React.useState<string[]>([]);
  const scrollableRef = React.useRef<HTMLDivElement>(null);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const baseButtonSize = 14;
  const iconSize = 18;
  const padding = 12;



  return (
    <>
      {/* Global sidebar animations */}
      <style>
        {`
          .sidebar-container {
            position: fixed;
            left: 0;
            top: 0;
            bottom: 0;
            width: ${isCollapsed ? '80px' : '320px'};
            background: ${KarunyaTheme.gradients.sidebar};
            backdrop-filter: blur(20px);
            border-right: 1px solid ${KarunyaTheme.colors.primary.blue[300]};
            z-index: 1000;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            overflow: hidden;
            box-shadow: 4px 0 20px rgba(0, 0, 0, 0.15);
          }
          
          .sidebar-header {
            padding: ${padding}px;
            border-bottom: 1px solid ${KarunyaTheme.colors.primary.blue[300]};
            display: flex;
            align-items: center;
            gap: 12px;
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
          }
          
          .sidebar-toggle {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid ${KarunyaTheme.colors.primary.blue[300]};
            border-radius: 12px;
            padding: ${padding * 0.8}px;
            color: white;
            cursor: pointer;
            font-size: ${iconSize}px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 40px;
            min-height: 40px;
          }
          
          .sidebar-toggle:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: scale(1.05);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          }
          
          .sidebar-toggle:active {
            transform: scale(0.95);
          }
          
          .sidebar-title {
            opacity: ${isCollapsed ? '0' : '1'};
            transform: translateX(${isCollapsed ? '-20px' : '0'});
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            transition-delay: ${isCollapsed ? '0s' : '0.1s'};
            white-space: nowrap;
            overflow: hidden;
          }
          
          .sidebar-logo {
            padding: ${padding}px;
            text-align: center;
            border-bottom: 1px solid ${KarunyaTheme.colors.primary.blue[300]};
            opacity: ${isCollapsed ? '0' : '1'};
            transform: translateY(${isCollapsed ? '-10px' : '0'});
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            transition-delay: ${isCollapsed ? '0s' : '0.2s'};
          }
          
          .sidebar-scrollable {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            padding: ${padding}px 0;
            scrollbar-width: thin;
            scrollbar-color: rgba(255, 255, 255, 0.4) rgba(255, 255, 255, 0.1);
          }
          
          .sidebar-scrollable::-webkit-scrollbar {
            width: 8px;
          }
          
          .sidebar-scrollable::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 4px;
            margin: 8px 0;
          }
          
          .sidebar-scrollable::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.3);
            border-radius: 4px;
            transition: background 0.3s ease;
          }
          
          .sidebar-scrollable::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.5);
          }
          
          .section-button {
            width: 100%;
            background: transparent;
            border: none;
            padding: ${padding}px;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: ${baseButtonSize}px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
          }
          
          .section-button:hover {
            background: rgba(255, 255, 255, 0.1);
            transform: translateX(4px);
            padding-left: ${padding + 4}px;
          }
          
          .section-button.active {
            background: linear-gradient(135deg, rgba(234, 88, 12, 0.4), rgba(234, 88, 12, 0.2));
            border-left: 4px solid ${KarunyaTheme.colors.primary.orange[400]};
            box-shadow: 0 4px 12px rgba(234, 88, 12, 0.3);
          }
          
          .section-icon {
            font-size: ${iconSize}px;
            min-width: ${iconSize + 4}px;
            text-align: center;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .section-button:hover .section-icon {
            transform: scale(1.1) rotate(5deg);
          }
          
          .section-text {
            opacity: ${isCollapsed ? '0' : '1'};
            transform: translateX(${isCollapsed ? '-20px' : '0'});
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            white-space: nowrap;
            overflow: hidden;
          }
          
          .expand-arrow {
            margin-left: auto;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            opacity: ${isCollapsed ? '0' : '1'};
          }
          
          .expand-arrow.expanded {
            transform: rotate(180deg);
          }
          
          .subsections {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            background: rgba(0, 0, 0, 0.2);
          }
          
          .subsections.expanded {
            max-height: 500px;
          }
          
          .subsection-button {
            width: 100%;
            background: transparent;
            border: none;
            padding: ${padding * 0.7}px ${padding}px ${padding * 0.7}px ${padding + 24}px;
            color: rgba(255, 255, 255, 0.8);
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: ${baseButtonSize - 1}px;
            transition: all 0.3s ease;
            border-left: 2px solid transparent;
          }
          
          .subsection-button:hover {
            background: rgba(255, 255, 255, 0.05);
            color: white;
            padding-left: ${padding + 28}px;
            border-left-color: ${KarunyaTheme.colors.primary.orange[400]};
          }
          
          .subsection-icon {
            font-size: ${iconSize - 2}px;
            min-width: ${iconSize}px;
            opacity: 0.7;
            transition: all 0.3s ease;
          }
          
          .subsection-button:hover .subsection-icon {
            opacity: 1;
            transform: scale(1.05);
          }
          
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateX(-20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          
          .section-button {
            animation: slideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .section-button:nth-child(1) { animation-delay: 0.1s; }
          .section-button:nth-child(2) { animation-delay: 0.15s; }
          .section-button:nth-child(3) { animation-delay: 0.2s; }
          .section-button:nth-child(4) { animation-delay: 0.25s; }
          .section-button:nth-child(5) { animation-delay: 0.3s; }
          .section-button:nth-child(6) { animation-delay: 0.35s; }
        `}
      </style>

      <div className="sidebar-container">
        {/* Header */}
        <div className="sidebar-header">
          <button
            className="sidebar-toggle"
            onClick={onToggle}
            data-hoverable
          >
            {isCollapsed ? '▶️' : '◀️'}
          </button>
          
          <div className="sidebar-title">
            <h2 style={{
              color: 'white',
              fontSize: `${baseButtonSize + 4}px`,
              fontWeight: 'bold',
              margin: 0,
            }}>
              Karunya University
            </h2>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: `${baseButtonSize - 2}px`,
              margin: 0,
            }}>
              Student Portal
            </p>
          </div>
        </div>

        {/* Logo */}
        <div className="sidebar-logo">
          <div style={{
            width: '140px',
            height: '70px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
            border: `1px solid ${KarunyaTheme.colors.primary.blue[200]}`,
            padding: '8px',
            overflow: 'hidden',
            transition: 'all 0.3s ease'
          }}>
            <img 
              src="/assets/images/university/karunya-logo.png" 
              alt="Karunya University Logo"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                filter: 'brightness(1.1)',
                transition: 'transform 0.3s ease'
              }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = `
                  <span style="color: ${KarunyaTheme.colors.primary.orange[400]}; font-size: ${baseButtonSize - 4}px; text-align: center; font-weight: bold;">
                    KARUNYA<br/>UNIVERSITY
                  </span>
                `;
              }}
            />
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="sidebar-scrollable">
          {sidebarSections.map((section, index) => (
            <div key={section.id} style={{ animationDelay: `${0.1 + index * 0.05}s` }}>
              <button
                className={`section-button ${currentSection === section.id ? 'active' : ''}`}
                onClick={() => {
                  onSectionChange(section.id);
                  if (section.subsections) {
                    toggleSection(section.id);
                  }
                }}
                data-hoverable
              >
                <span className="section-icon">{section.icon}</span>
                <div className="section-text">
                  <div style={{ fontWeight: 'bold', fontSize: `${baseButtonSize}px` }}>
                    {section.title}
                  </div>
                  <div style={{ 
                    fontSize: `${baseButtonSize - 2}px`, 
                    opacity: 0.8,
                    marginTop: '2px'
                  }}>
                    {section.description}
                  </div>
                </div>
                {section.subsections && (
                  <span className={`expand-arrow ${expandedSections.includes(section.id) ? 'expanded' : ''}`}>
                    ▼
                  </span>
                )}
              </button>

              {/* Subsections */}
              {section.subsections && (
                <div className={`subsections ${expandedSections.includes(section.id) ? 'expanded' : ''}`}>
                  {section.subsections.map((subsection) => (
                    <button
                      key={subsection.id}
                      className="subsection-button"
                      onClick={() => onSectionChange(subsection.id)}
                      data-hoverable
                    >
                      <span className="subsection-icon">{subsection.icon}</span>
                      <span>{subsection.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
      {/* Header */}
      <div style={{
        padding: `${padding}px`,
        borderBottom: `1px solid ${KarunyaTheme.colors.primary.blue[300]}`,
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <button
          data-hoverable
          onClick={onToggle}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: `1px solid ${KarunyaTheme.colors.primary.blue[300]}`,
            borderRadius: '8px',
            padding: `${padding * 0.8}px`,
            color: 'white',
            cursor: 'pointer',
            fontSize: `${iconSize}px`,
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {isCollapsed ? '▶️' : '◀️'}
        </button>
        
        {!isCollapsed && (
          <div>
            <h2 style={{
              color: 'white',
              fontSize: `${baseButtonSize + 4}px`,
              fontWeight: 'bold',
              margin: 0,
              whiteSpace: 'nowrap'
            }}>
              Karunya University
            </h2>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: `${baseButtonSize - 2}px`,
              margin: 0,
              whiteSpace: 'nowrap'
            }}>
              Student Portal
            </p>
          </div>
        )}
      </div>

      {/* Karunya Logo */}
      {!isCollapsed && (
        <div style={{
          padding: `${padding}px`,
          textAlign: 'center',
          borderBottom: `1px solid ${KarunyaTheme.colors.primary.blue[300]}`
        }}>
          <div style={{
            width: '140px',
            height: '70px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
            border: `1px solid ${KarunyaTheme.colors.primary.blue[200]}`,
            padding: '8px',
            overflow: 'hidden'
          }}>
            <img 
              src="/assets/images/university/karunya-logo.png" 
              alt="Karunya University Logo"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                filter: 'brightness(1.1)' // Slightly brighten for better visibility on dark background
              }}
              onError={(e) => {
                // Fallback if image fails to load
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = `
                  <span style="color: ${KarunyaTheme.colors.primary.orange[400]}; font-size: ${baseButtonSize - 4}px; text-align: center;">
                    KARUNYA<br/>UNIVERSITY
                  </span>
                `;
              }}
            />
          </div>
        </div>
      )}

      {/* Scrollbar Styles */}
      <style>
        {`
          .sidebar-scrollable::-webkit-scrollbar {
            width: 12px;
          }
          .sidebar-scrollable::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 6px;
            margin: 4px;
          }
          .sidebar-scrollable::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.4);
            border-radius: 6px;
            border: 2px solid transparent;
            background-clip: content-box;
          }
          .sidebar-scrollable::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.6);
            background-clip: content-box;
          }
          .sidebar-scrollable {
            scrollbar-width: thin;
            scrollbar-color: rgba(255, 255, 255, 0.4) rgba(255, 255, 255, 0.1);
          }
        `}
      </style>

      {/* Navigation Sections */}
      <div 
        className="sidebar-scrollable"
        style={{
          flex: 1,
          overflowY: 'scroll',
          overflowX: 'hidden',
          padding: `${padding}px 0`
        }}
      >
        {sidebarSections.map((section) => (
          <div key={section.id}>
            <button
              data-hoverable
              onClick={() => {
                onSectionChange(section.id);
                if (section.subsections) {
                  toggleSection(section.id);
                }
              }}
              style={{
                width: '100%',
                background: currentSection === section.id ? 'rgba(234, 88, 12, 0.3)' : 'transparent',
                border: 'none',
                padding: `${padding}px`,
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: `${baseButtonSize}px`,
                transition: 'all 0.3s ease',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => {
                if (currentSection !== section.id) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (currentSection !== section.id) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <span style={{ fontSize: `${iconSize}px` }}>{section.icon}</span>
              {!isCollapsed && (
                <>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500' }}>{section.title}</div>
                    <div style={{ 
                      fontSize: `${baseButtonSize - 4}px`, 
                      opacity: 0.8,
                      marginTop: '2px'
                    }}>
                      {section.description}
                    </div>
                  </div>
                  {section.subsections && (
                    <span style={{ 
                      fontSize: `${baseButtonSize}px`,
                      transform: expandedSections.includes(section.id) ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s ease'
                    }}>
                      ▶️
                    </span>
                  )}
                </>
              )}
            </button>

            {/* Subsections */}
            {!isCollapsed && section.subsections && expandedSections.includes(section.id) && (
              <div style={{ marginLeft: `${padding * 2}px` }}>
                {section.subsections.map((subsection) => (
                  <button
                    key={subsection.id}
                    data-hoverable
                    onClick={() => onSectionChange(subsection.id)}
                    style={{
                      width: '100%',
                      background: currentSection === subsection.id ? 'rgba(234, 88, 12, 0.2)' : 'transparent',
                      border: 'none',
                      padding: `${padding * 0.7}px ${padding}px`,
                      color: 'rgba(255, 255, 255, 0.9)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: `${baseButtonSize - 2}px`,
                      transition: 'all 0.3s ease',
                      textAlign: 'left'
                    }}
                    onMouseEnter={(e) => {
                      if (currentSection !== subsection.id) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentSection !== subsection.id) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <span style={{ fontSize: `${iconSize - 4}px` }}>{subsection.icon}</span>
                    {subsection.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      {!isCollapsed && (
        <div style={{
          padding: `${padding}px`,
          borderTop: `1px solid ${KarunyaTheme.colors.primary.blue[300]}`,
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: `${baseButtonSize - 4}px`,
          textAlign: 'center'
        }}>
          <div>AccessPoint v2.0</div>
          <div>University Edition</div>
        </div>
      )}
    </div>
  );
};