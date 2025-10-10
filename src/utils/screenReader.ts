// Screen Reader Utility for providing comprehensive page announcements
export class ScreenReader {
  private static instance: ScreenReader;
  private currentPage = '';
  private hasAnnouncedPage = false;
  private isAnnouncingIntro = false;
  private announcementQueue: Array<{ text: string; options: any }> = [];

  static getInstance(): ScreenReader {
    if (!ScreenReader.instance) {
      ScreenReader.instance = new ScreenReader();
    }
    return ScreenReader.instance;
  }

  speak(text: string, options: { rate?: number; volume?: number; priority?: 'low' | 'high'; skipDuringIntro?: boolean } = {}) {
    const { rate = 1.0, volume = 0.8, priority = 'low', skipDuringIntro = false } = options;
    
    // Skip hover TTS during intro announcement
    if (this.isAnnouncingIntro && skipDuringIntro) {
      return;
    }
    
    // Cancel existing speech if high priority
    if (priority === 'high') {
      speechSynthesis.cancel();
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.volume = volume;
    utterance.pitch = 1.0;
    
    speechSynthesis.speak(utterance);
    console.log('🔊 Screen Reader:', text);
  }

  isIntroActive(): boolean {
    return this.isAnnouncingIntro;
  }

  announceInstructionsPage() {
    if (this.currentPage === 'instructions' && this.hasAnnouncedPage) return;
    
    this.currentPage = 'instructions';
    this.hasAnnouncedPage = true;
    this.isAnnouncingIntro = true;

    const announcement = `
      Welcome to Karunya University AccessPoint - your accessible student portal.
      
      This page has accessibility controls on the left and instructions on the right.
      
      Available accessibility features:
      - Voice Assistant called Nullistant for hands-free navigation
      - Face Tracking to control cursor with head movements  
      - Text-to-Speech narrator for reading screen content
      
      Nullistant is already active in the top-right corner in Always Awake mode.
      You can say "Start" or "Begin" to enter the main portal.
      
      The toggle buttons on the left can be clicked to enable or disable features.
      Note: Only the face tracking cursor can click these buttons due to technical limitations.
      Use your head to move the green cursor and blink to click the toggles.
      
      Hover over any button to hear its detailed description.
      
      Click Continue when ready to proceed to the university portal.
    `;

    const utterance = new SpeechSynthesisUtterance(announcement);
    utterance.rate = 0.9;
    utterance.volume = 0.8;
    utterance.pitch = 1.0;
    
    // Set flag to false when intro is complete
    utterance.onend = () => {
      this.isAnnouncingIntro = false;
      console.log('🔊 Intro announcement complete - hover TTS now active');
    };
    
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
    console.log('🔊 Screen Reader Intro:', announcement);
  }

  announceMainPortal() {
    if (this.currentPage === 'main' && this.hasAnnouncedPage) return;
    
    this.currentPage = 'main';
    this.hasAnnouncedPage = true;
    this.isAnnouncingIntro = true;

    const announcement = `
      Welcome to the Karunya University main portal.
      
      The screen has a sidebar on the left and main content area on the right.
      
      Sidebar sections available:
      - Academics: Course schedules, grades, and academic information
      - Circulars: Latest university announcements and notices  
      - Facilities: Library, labs, and campus resources
      - Support: Health center, counseling, and student services
      - Chat: Talk to the university AI assistant for help
      - Emergency: Quick access to medical and emergency contacts
      
      Voice commands you can use:
      - "Show academics" to view course information
      - "Open circulars" for announcements
      - "Go to chat" to talk with the assistant
      - "Help" or "Emergency" for immediate assistance
      - "Go back" to return to previous screens
      
      You can also use face tracking - move your head to control the cursor and blink or open your mouth to click.
      The green highlight shows what will be clicked.
      
      Hover over any section to hear its detailed description.
    `;

    const utterance = new SpeechSynthesisUtterance(announcement);
    utterance.rate = 0.95;
    utterance.volume = 0.8;
    utterance.pitch = 1.0;
    
    // Set flag to false when intro is complete
    utterance.onend = () => {
      this.isAnnouncingIntro = false;
      console.log('🔊 Main portal intro complete - hover TTS now active');
    };
    
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
    console.log('🔊 Screen Reader Main Portal:', announcement);
  }

  announceChatScreen() {
    if (this.currentPage === 'chat' && this.hasAnnouncedPage) return;
    
    this.currentPage = 'chat';
    this.hasAnnouncedPage = true;

    const announcement = `
      You are now in the NullChat assistant screen.
      
      This is your AI-powered university assistant that can help with:
      - Course information and schedules
      - Faculty details and office hours
      - University facilities and services  
      - Admissions and enrollment questions
      - Campus events and announcements
      
      You can type your question or click the microphone to speak.
      The assistant supports both English and Hindi.
      
      Voice commands:
      - "Ask about courses" to get course information
      - "Show faculty details" for teacher information
      - "Go back" to return to the main menu
      - "Help" for more assistance options
    `;

    this.speak(announcement, { rate: 0.95, priority: 'high' });
  }

  announcePageChange(newPage: string) {
    this.currentPage = newPage;
    this.hasAnnouncedPage = false; // Reset so the new page can be announced
    
    // Brief navigation announcement
    switch (newPage) {
      case 'instructions':
        this.speak('Loading accessibility instructions page', { priority: 'high' });
        setTimeout(() => this.announceInstructionsPage(), 1500);
        break;
      case 'main':
        this.speak('Loading main university portal', { priority: 'high' });
        setTimeout(() => this.announceMainPortal(), 2000);
        break;
      case 'chat':
        this.speak('Opening university chat assistant', { priority: 'high' });
        setTimeout(() => this.announceChatScreen(), 1500);
        break;
      case 'emergency':
        this.speak('Emergency contact screen loaded. Quick access to medical help and emergency services.', { priority: 'high' });
        break;
      case 'settings':
        this.speak('Settings and configuration screen loaded.', { priority: 'high' });
        break;
    }
  }

  announceElementDetails(element: HTMLElement): string {
    const textContent = element.textContent?.trim();
    const tagName = element.tagName.toLowerCase();
    const className = element.className;
    
    // Smart contextual descriptions
    if (textContent?.includes('Academics') || className.includes('academics')) {
      return 'Academics section - access courses, schedules, and grades';
    } else if (textContent?.includes('Circulars') || className.includes('circular')) {
      return 'Circulars section - view university announcements and notices';
    } else if (textContent?.includes('Chat') || textContent?.includes('Assistant')) {
      return 'Chat assistant - talk to the university AI helper';
    } else if (textContent?.includes('Emergency') || className.includes('emergency')) {
      return 'Emergency contacts - immediate access to medical help';
    } else if (textContent?.includes('Support') || className.includes('support')) {
      return 'Student support services - counseling and assistance';
    } else if (textContent?.includes('Facilities') || className.includes('facilities')) {
      return 'Campus facilities - library, labs, and resources';
    } else if (textContent?.includes('Face Tracking')) {
      return 'Face tracking toggle - control cursor with head movements';
    } else if (textContent?.includes('Nullistant') || textContent?.includes('Voice')) {
      return 'Voice assistant controls - hands-free navigation';
    } else if (textContent && textContent.length > 0) {
      return `${textContent} - ${tagName}`;
    }
    
    return '';
  }
}