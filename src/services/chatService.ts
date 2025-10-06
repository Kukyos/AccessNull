/**
 * Chat Service - Direct Groq API integration
 * Extracted from NullChat backend for frontend-only usage
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';

// College information context (simplified for AccessPoint medical/campus focus)
const COLLEGE_INFO = `
Karunya Institute of Technology - Campus Information:

ACCESSIBILITY FACILITIES:
- Wheelchair ramps at all main entrances
- Accessible restrooms on every floor
- Elevator access in all buildings
- Reserved parking near entrances
- Audio announcements in main building
- Braille signage throughout campus

MEDICAL FACILITIES:
- On-campus health center (24/7)
- Emergency medical services
- Pharmacy in main building
- Mental health counseling available
- Accessible examination rooms

CAMPUS NAVIGATION:
- Main Building: Administrative offices, health center
- Library: Fully accessible with assistive technology
- Hostel: Ground floor accessible rooms available
- Cafeteria: Wide doorways, accessible seating

EMERGENCY CONTACTS:
- Campus Security: 1234567890
- Medical Emergency: 108
- Campus Health Center: 0987654321
`;

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
  if (language === 'hi') {
    return `You are AccessPoint, a helpful medical and campus accessibility assistant for students with disabilities. Always answer in Romanized Hindi (use English letters, not Devanagari script).

CAMPUS & MEDICAL INFORMATION:
${COLLEGE_INFO}

Instructions:
- Answer questions about campus accessibility, medical facilities, prescriptions, and emergency services
- Keep responses concise, clear, and supportive
- For specific medical advice, always suggest consulting the campus health center
- Be empathetic and helpful to students with disabilities
- Use Romanized Hindi only (no Devanagari script)
`;
  } else {
    return `You are AccessPoint, a helpful medical and campus accessibility assistant for students with disabilities. Always answer in clear, simple English.

CAMPUS & MEDICAL INFORMATION:
${COLLEGE_INFO}

Instructions:
- Answer questions about campus accessibility, medical facilities, prescriptions, and emergency services
- Keep responses concise, clear, and supportive
- For specific medical advice, always suggest consulting the campus health center
- Be empathetic and helpful to students with disabilities

Instructions:
- Answer questions about campus accessibility, medical facilities, prescriptions, and emergency services
- Keep responses concise, clear, and supportive
- For specific medical advice, always suggest consulting the campus health center
- Be empathetic and helpful to students with disabilities
`;
  }
}

export async function sendChatMessage(
  message: string,
  language: 'en' | 'hi' = 'en'
): Promise<ChatResponse> {
  try {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    
    if (!apiKey || apiKey === 'your_groq_api_key_here') {
      return {
        answer: 'Chat service is not configured. Please add your Groq API key to the environment variables.',
        confidence: 0,
        error: 'API key not configured'
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
