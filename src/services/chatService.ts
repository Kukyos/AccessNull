/**
 * Chat Service - Direct Groq API integration
 * Extracted from NullChat backend for frontend-only usage
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';

// Import university data for comprehensive context
import { KARUNYA_CONTEXT } from '../data/universityData';

// College information context - now using comprehensive university data
const COLLEGE_INFO = KARUNYA_CONTEXT;

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  answer: string;
  confidence: number;
  error?: string;
}

function getSystemPrompt(language: 'en' | 'hi'): string {
  const commonInstructions = `
SPECIFIC TOPICS YOU CAN HELP WITH:

ACADEMICS:
- Course information, prerequisites, and credit requirements
- Academic calendar and important dates
- Examination schedules and results
- Assignment deadlines and submission guidelines
- Faculty office hours and contact information
- Department-specific requirements and policies

ADMISSIONS & ENROLLMENT:
- Admission procedures and requirements
- Application deadlines and documentation
- Fee structure and payment methods
- Scholarship opportunities and eligibility
- Transfer credits and course equivalencies

CAMPUS FACILITIES:
- Library hours, resources, and digital access
- Laboratory booking and usage policies
- Hostel accommodation and mess facilities
- Sports and recreational facilities
- Transportation and parking information

STUDENT SERVICES:
- Health center services and medical support
- Counseling and mental health resources
- Career guidance and placement assistance
- Academic advisoring and tutoring support
- Accessibility services and accommodations

ADMINISTRATIVE:
- Registration procedures and deadlines
- Document verification and transcript requests
- Fee payment and financial assistance
- Student ID cards and campus access
- Official university communications

Always provide specific contact information when available and direct students to the appropriate office or online portal for official procedures.
`;

  if (language === 'hi') {
    return `Aap NullChat hain, Karunya University ke intelligent assistant jo students ki har university-related query mein madad karte hain. Hamesha Romanized Hindi mein jawab dein (English letters use karein, Devanagari script nahi).

KARUNYA UNIVERSITY INFORMATION:
${COLLEGE_INFO}

${commonInstructions}

Guidelines:
- Academic, courses, faculty, admissions, facilities, circulars, events aur campus life ke baare mein sawal ka jawab dein
- Disability wale students ke liye accessibility services aur support ke baare mein information provide karein
- Course selection, academic calendar, examination schedules aur grades mein help karein
- Students ko appropriate department contacts aur resources guide karein  
- Medical advice ke liye campus health center direct karein
- Technical issues ke liye IT support suggest karein
- Responses helpful, accurate aur student-friendly rakhein
- Sirf Romanized Hindi use karein (Devanagari script bilkul nahi)
- Student success ke liye encouraging aur supportive rahein
`;
  } else {
    return `You are NullChat, Karunya University's intelligent assistant specialized in helping students with all university-related queries. Always answer in clear, simple English.

KARUNYA UNIVERSITY INFORMATION:
${COLLEGE_INFO}

${commonInstructions}

Guidelines:
- Answer questions about academics, courses, faculty, admissions, facilities, circulars, events, and campus life
- Provide information about accessibility services and support for students with disabilities
- Help with course selection, academic calendar, examination schedules, and grades
- Guide students to appropriate department contacts and resources
- For specific medical advice, direct to the campus health center
- For technical issues, direct to IT support
- Keep responses helpful, accurate, and student-friendly
- Be encouraging and supportive of student success
- When asked about circulars or announcements, mention that the latest ones are available in the Circulars section
- For facility information, provide details about timings, accessibility features, and contact information
- Always end with "Is there anything else I can help you with regarding Karunya University?"
`;
  }
}

export async function sendChatMessage(
  message: string,
  language: 'en' | 'hi' = 'en'
): Promise<ChatResponse> {
  try {
    // Try localStorage first, then fall back to environment variable
    const apiKey = localStorage.getItem('user_groq_api_key') || import.meta.env.VITE_GROQ_API_KEY;
    
    if (!apiKey || apiKey === 'your_groq_api_key_here') {
      return {
        answer: '🔑 **NullChat needs configuration!**\n\n' +
                '**To enable chat:**\n' +
                '1. Click "Support" → "API Settings" in the sidebar\n' +
                '2. Get a free Groq API key at: https://console.groq.com/keys\n' +
                '3. Enter your key (starts with "gsk_") and click Save\n\n' +
                '**Why do I need this?**\n' +
                'NullChat uses Groq\'s free AI service for intelligent responses about Karunya University. Your API key stays private in your browser only.',
        confidence: 0,
        error: 'API key not configured - please visit API Settings'
      };
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: getSystemPrompt(language) },
      { role: 'user', content: message }
    ];

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        max_tokens: 300,
        temperature: 0.7,
        top_p: 0.9,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', response.status, errorText);
      return {
        answer: `Sorry, I'm having trouble connecting right now. Please try again later.`,
        confidence: 0,
        error: `API error: ${response.status}`
      };
    }

    const data = await response.json();
    const answer = data.choices[0]?.message?.content?.trim() || 'No response generated';

    return {
      answer,
      confidence: 0.9,
    };
  } catch (error) {
    console.error('Chat service error:', error);
    return {
      answer: 'Sorry, an error occurred while processing your message. Please try again.',
      confidence: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Helper to generate conversation history for context (future enhancement)
export function formatConversationHistory(messages: Array<{ role: string; content: string }>): ChatMessage[] {
  return messages.map(msg => ({
    role: msg.role as 'system' | 'user' | 'assistant',
    content: msg.content
  }));
}
