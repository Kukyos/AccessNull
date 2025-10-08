/**
 * Translation Service - Google Translate API wrapper
 * For language detection and translation in chat
 */

const TRANSLATE_API_URL = 'https://translation.googleapis.com/language/translate/v2';

// Interfaces for future use
// interface TranslationResult {
//   translatedText: string;
//   detectedSourceLanguage?: string;
// }

// interface DetectionResult {
//   language: string;
//   confidence: number;
// }

/**
 * Detect the language of the given text
 * For demo purposes, we'll use a simple heuristic
 * In production, you'd use Google Translate API's detect endpoint
 */
export function detectLanguage(text: string): 'en' | 'hi' {
  // Simple heuristic: if text contains Devanagari characters, it's Hindi
  const devanagariRegex = /[\u0900-\u097F]/;
  if (devanagariRegex.test(text)) {
    return 'hi';
  }
  
  // Check for common Hindi words in Latin script
  const hindiWords = ['kya', 'hai', 'hain', 'mein', 'aap', 'ki', 'ka', 'ke', 'ko'];
  const lowerText = text.toLowerCase();
  const hasHindiWords = hindiWords.some(word => lowerText.includes(word));
  
  if (hasHindiWords) {
    return 'hi';
  }
  
  // Default to English
  return 'en';
}

/**
 * Translate text using Google Cloud Translation API
 * Falls back to original text if API is not configured
 */
export async function translateText(
  text: string,
  targetLanguage: 'en' | 'hi',
  sourceLanguage?: string
): Promise<string> {
  try {
    // Try localStorage first, then fall back to environment variable
    const apiKey = localStorage.getItem('user_google_api_key') || import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY;
    
    // If no API key or translation not needed, return original
    if (!apiKey || apiKey === 'your_api_key_here') {
      console.warn('Google Translate API key not configured, skipping translation');
      return text;
    }

    const requestBody: any = {
      q: text,
      target: targetLanguage,
      format: 'text'
    };

    if (sourceLanguage) {
      requestBody.source = sourceLanguage;
    }

    const response = await fetch(`${TRANSLATE_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Translation API error:', response.status, errorText);
      return text; // Fallback to original text
    }

    const data = await response.json();
    return data.data.translations[0].translatedText || text;
  } catch (error) {
    console.error('Translation error:', error);
    return text; // Fallback to original text
  }
}

/**
 * Romanize Hindi text (convert Devanagari to Latin script)
 * This is a simplified version - for production use a proper transliteration library
 */
export function romanizeHindi(text: string): string {
  // Basic Devanagari to Latin transliteration map
  const translitMap: Record<string, string> = {
    'क': 'ka', 'ख': 'kha', 'ग': 'ga', 'घ': 'gha', 'ङ': 'nga',
    'च': 'cha', 'छ': 'chha', 'ज': 'ja', 'झ': 'jha', 'ञ': 'nya',
    'ट': 'ta', 'ठ': 'tha', 'ड': 'da', 'ढ': 'dha', 'ण': 'na',
    'त': 'ta', 'थ': 'tha', 'द': 'da', 'ध': 'dha', 'न': 'na',
    'प': 'pa', 'फ': 'pha', 'ब': 'ba', 'भ': 'bha', 'म': 'ma',
    'य': 'ya', 'र': 'ra', 'ल': 'la', 'व': 'va', 'श': 'sha',
    'ष': 'sha', 'स': 'sa', 'ह': 'ha',
    'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo',
    'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', '्': '',
    'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
    'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
  };

  let result = '';
  for (const char of text) {
    result += translitMap[char] || char;
  }
  return result;
}
