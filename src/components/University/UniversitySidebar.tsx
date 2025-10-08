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
      { id: 'internships', title: 'Internship Portal', icon: '💼' }
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
      { id: 'dining', title: 'Dining Services', icon: '🍽️' }
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
      { id: 'technical', title: 'API Settings', icon: '⚙️' },
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

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  // Responsive sizing
  const baseButtonSize = accessibilityLevel === 'extra-large' ? 18 : 
                        accessibilityLevel === 'large' ? 16 : 14;
  const iconSize = accessibilityLevel === 'extra-large' ? 22 : 
                  accessibilityLevel === 'large' ? 20 : 18;
  const padding = accessibilityLevel === 'extra-large' ? 16 : 
                 accessibilityLevel === 'large' ? 14 : 12;

  const sidebarWidth = isCollapsed ? 80 : 320;

  return (
    <>
      {/* Global Styles */}
      <style>
        {`
          /* Global smooth scrolling */
          * {
            scroll-behavior: smooth;
          }
          
          html {
            scroll-behavior: smooth;
          }
          
          @keyframes slideInLeft {
            from {
              opacity: 0;
              transform: translateX(-30px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes scaleIn {
            from {
              transform: scale(0.9);
              opacity: 0;
            }
            to {
              transform: scale(1);
              opacity: 1;
            }
          }
          
          .sidebar-main {
            position: fixed;
            left: 0;
            top: 0;
            bottom: 0;
            width: ${sidebarWidth}px;
            background: ${KarunyaTheme.gradients.sidebar};
            backdrop-filter: blur(20px);
            border-right: 1px solid ${KarunyaTheme.colors.primary.blue[300]};
            z-index: 1000;
            transition: all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1);
            overflow: hidden;
            box-shadow: 0 0 40px rgba(0, 0, 0, 0.2);
            display: flex;
            flex-direction: column;
            scroll-behavior: smooth;
          }
          
          .sidebar-header {
            padding: ${padding}px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            animation: fadeIn 0.6s ease;
          }
          
          .toggle-btn {
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05));
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            padding: 12px;
            color: white;
            cursor: pointer;
            font-size: 16px;
            transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 44px;
            min-height: 44px;
            position: relative;
            overflow: hidden;
          }
          
          .toggle-btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            transition: left 0.6s;
          }
          
          .toggle-btn:hover {
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.15));
            transform: scale(1.05);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
          }
          
          .toggle-btn:hover::before {
            left: 100%;
          }
          
          .toggle-btn:active {
            transform: scale(0.95);
          }
          
          .sidebar-title {
            margin: ${padding}px 0 0 0;
            opacity: ${isCollapsed ? '0' : '1'};
            transform: translateX(${isCollapsed ? '-20px' : '0'});
            transition: all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1);
            transition-delay: ${isCollapsed ? '0s' : '0.2s'};
          }
          
          .sidebar-logo {
            padding: ${padding}px;
            text-align: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            opacity: ${isCollapsed ? '0' : '1'};
            transform: scale(${isCollapsed ? '0.8' : '1'});
            transition: all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1);
            transition-delay: ${isCollapsed ? '0s' : '0.3s'};
          }
          
          .logo-container {
            width: 140px;
            height: 70px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto;
            border: 1px solid rgba(255, 255, 255, 0.2);
            padding: 8px;
            overflow: hidden;
            transition: all 0.4s ease;
            position: relative;
          }
          
          .logo-container:hover {
            transform: scale(1.02);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
            background: rgba(255, 255, 255, 0.15);
          }
          
          .navigation-area {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            padding: ${padding}px 0;
            scrollbar-width: thin;
            scrollbar-color: rgba(255, 255, 255, 0.4) transparent;
            scroll-behavior: smooth;
            -webkit-overflow-scrolling: touch;
            scroll-snap-type: y proximity;
          }
          
          .navigation-area::-webkit-scrollbar {
            width: 8px;
          }
          
          .navigation-area::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 4px;
            margin: 4px 0;
          }
          
          .navigation-area::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.2));
            border-radius: 4px;
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
          
          .navigation-area::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0.4));
            transform: scaleY(1.1);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          }
          
          .navigation-area::-webkit-scrollbar-thumb:active {
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.6));
          }
          
          .nav-section {
            animation: slideInLeft 0.6s cubic-bezier(0.25, 0.8, 0.25, 1);
            animation-fill-mode: both;
            scroll-snap-align: start;
            scroll-margin-top: 8px;
          }
          
          .section-btn {
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
            transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
            position: relative;
            border-left: 3px solid transparent;
            margin: 2px 0;
          }
          
          .section-btn::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            width: 0;
            height: 100%;
            background: linear-gradient(90deg, rgba(255, 255, 255, 0.1), transparent);
            transition: width 0.4s ease;
            z-index: 0;
          }
          
          .section-btn:hover::before {
            width: 100%;
          }
          
          .section-btn:hover {
            transform: translateX(8px);
            background: rgba(255, 255, 255, 0.08);
            border-left-color: ${KarunyaTheme.colors.primary.orange[400]};
          }
          
          .section-btn.active {
            background: linear-gradient(90deg, rgba(234, 88, 12, 0.3), rgba(234, 88, 12, 0.1));
            border-left-color: ${KarunyaTheme.colors.primary.orange[400]};
            box-shadow: 0 4px 20px rgba(234, 88, 12, 0.2);
            transform: translateX(6px);
          }
          
          .section-icon {
            font-size: ${iconSize}px;
            min-width: ${iconSize + 4}px;
            text-align: center;
            transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
            z-index: 1;
          }
          
          .section-btn:hover .section-icon {
            transform: scale(1.2) rotate(10deg);
          }
          
          .section-content {
            flex: 1;
            opacity: ${isCollapsed ? '0' : '1'};
            transform: translateX(${isCollapsed ? '-20px' : '0'});
            transition: all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1);
            z-index: 1;
          }
          
          .section-title {
            font-weight: 600;
            margin: 0;
            font-size: ${baseButtonSize}px;
          }
          
          .section-desc {
            margin: 2px 0 0 0;
            font-size: ${baseButtonSize - 2}px;
            opacity: 0.7;
            transition: opacity 0.3s ease;
          }
          
          .section-btn:hover .section-desc {
            opacity: 1;
          }
          
          .expand-arrow {
            font-size: 12px;
            transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
            opacity: ${isCollapsed ? '0' : '0.7'};
            z-index: 1;
          }
          
          .expand-arrow.expanded {
            transform: rotate(180deg);
            opacity: 1;
          }
          
          .subsections {
            max-height: 0;
            overflow: hidden;
            transition: all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1);
            background: rgba(0, 0, 0, 0.3);
            margin: 0;
          }
          
          .subsections.expanded {
            max-height: 600px;
            padding: 8px 0;
          }
          
          .subsection-btn {
            width: 100%;
            background: transparent;
            border: none;
            padding: ${padding * 0.6}px ${padding}px ${padding * 0.6}px ${padding + 32}px;
            color: rgba(255, 255, 255, 0.8);
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: ${baseButtonSize - 1}px;
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            border-left: 2px solid transparent;
            position: relative;
          }
          
          .subsection-btn::before {
            content: '';
            position: absolute;
            left: 24px;
            top: 50%;
            width: 6px;
            height: 1px;
            background: rgba(255, 255, 255, 0.3);
            transition: all 0.3s ease;
          }
          
          .subsection-btn:hover {
            background: rgba(255, 255, 255, 0.05);
            color: white;
            transform: translateX(6px);
            border-left-color: ${KarunyaTheme.colors.primary.orange[400]};
          }
          
          .subsection-btn:hover::before {
            width: 12px;
            background: ${KarunyaTheme.colors.primary.orange[400]};
          }
          
          .subsection-icon {
            font-size: ${iconSize - 2}px;
            opacity: 0.7;
            transition: all 0.3s ease;
          }
          
          .subsection-btn:hover .subsection-icon {
            opacity: 1;
            transform: scale(1.1);
          }
        `}
      </style>

      <div className="sidebar-main">
        {/* Header */}
        <div className="sidebar-header">
          <button className="toggle-btn" onClick={onToggle} data-hoverable>
            {isCollapsed ? '▶' : '◀'}
          </button>
          
          {!isCollapsed && (
            <div className="sidebar-title">
              <h2 style={{
                color: 'white',
                fontSize: `${baseButtonSize + 4}px`,
                fontWeight: '600',
                margin: 0,
              }}>
                Karunya University
              </h2>
              <p style={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: `${baseButtonSize - 2}px`,
                margin: '4px 0 0 0',
              }}>
                Student Portal
              </p>
            </div>
          )}
        </div>

        {/* Logo */}
        {!isCollapsed && (
          <div className="sidebar-logo">
            <div className="logo-container">
              <img 
                src="/assets/images/university/karunya-logo.png" 
                alt="Karunya University"
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  filter: 'brightness(1.1)'
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.parentElement!.innerHTML = `
                    <div style="color: ${KarunyaTheme.colors.primary.orange[400]}; font-size: ${baseButtonSize - 2}px; text-align: center; font-weight: 600; line-height: 1.2;">
                      KARUNYA<br/>UNIVERSITY
                    </div>
                  `;
                }}
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="navigation-area">
          {sidebarSections.map((section, index) => (
            <div key={section.id} className="nav-section" style={{ animationDelay: `${0.1 + index * 0.05}s` }}>
              <button
                className={`section-btn ${currentSection === section.id ? 'active' : ''}`}
                onClick={() => {
                  onSectionChange(section.id);
                  if (section.subsections) {
                    toggleSection(section.id);
                  }
                }}
                data-hoverable
              >
                <span className="section-icon">{section.icon}</span>
                
                {!isCollapsed && (
                  <div className="section-content">
                    <div className="section-title">{section.title}</div>
                    <div className="section-desc">{section.description}</div>
                  </div>
                )}
                
                {section.subsections && !isCollapsed && (
                  <span className={`expand-arrow ${expandedSections.includes(section.id) ? 'expanded' : ''}`}>
                    ▼
                  </span>
                )}
              </button>

              {/* Subsections */}
              {section.subsections && !isCollapsed && (
                <div className={`subsections ${expandedSections.includes(section.id) ? 'expanded' : ''}`}>
                  {section.subsections.map((subsection) => (
                    <button
                      key={subsection.id}
                      className="subsection-btn"
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