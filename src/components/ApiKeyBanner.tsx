import React from 'react';
import { Info, Settings, ExternalLink } from 'lucide-react';

interface ApiKeyBannerProps {
  onOpenSettings: () => void;
}

export default function ApiKeyBanner({ onOpenSettings }: ApiKeyBannerProps) {
  const hasGroqKey = localStorage.getItem('user_groq_api_key');
  const hasGoogleKey = localStorage.getItem('user_google_api_key');

  // Don't show if both keys are configured
  if (hasGroqKey && hasGoogleKey) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50">
      <div className="max-w-4xl mx-auto bg-blue-600 text-white rounded-lg shadow-lg border border-blue-500">
        <div className="px-4 py-3">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                API Configuration Required
              </p>
              <p className="text-xs text-blue-100 mt-1">
                {!hasGroqKey && !hasGoogleKey && "Configure your free API keys to unlock AI chat and enhanced voice features."}
                {!hasGroqKey && hasGoogleKey && "Configure your Groq API key to enable AI chat functionality."}
                {hasGroqKey && !hasGoogleKey && "Optionally configure Google Cloud API for enhanced voice features."}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-100 hover:text-white underline"
              >
                Get Groq Key
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                onClick={onOpenSettings}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-700 hover:bg-blue-800 rounded text-xs font-medium transition-colors"
              >
                <Settings className="w-3 h-3" />
                Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}