# Roadmap

## Ideathon MVP (submitted 24 Nov 2026), done
- [x] Side-panel agent loop that survives navigation
- [x] Numbered marks, "click N"
- [x] Spoken confirmation gate + secret-field refusal (code-enforced)
- [x] Offline instant commands (synonyms, typo tolerance)
- [x] ElevenLabs narration with browser fallback
- [x] Vision fallback (`look`) on Groq Llama 4 Scout
- [x] 5 languages for listening and replies
- [x] React-safe typing, scroll-aware snapshot, compact prompt

## Hack day (24 h)
1. **AWS backend**: API Gateway + Lambda proxy (keys off the client) → **Bedrock (Claude)** as planner and vision model. DynamoDB for user profile and macros. *(Best Use of AWS)*
2. **ElevenLabs Scribe** for speech-to-text (better on Indian accents and languages, no Google cloud), plus voice choice per user. *(Best Use of ElevenLabs)*
3. **Head pointer inside the extension**: port AccessPoint's MediaPipe forehead cursor + dwell/blink click into an offscreen document, so motor-impaired users can drive any site.
4. **Repair mode**: vision fills in missing aria-labels and alt text on the live page so the user's own screen reader works better too.
5. **Macros**: "do my usual" replays a recorded goal sequence (recharge, bill pay up to the confirmation gate).
6. **Simplify overlay**: big text, high contrast, decluttered reader view on demand.
7. iframes + shadow DOM in the snapshot.

## Later
- Single-switch scanning input
- On-device planner (Chrome built-in Gemini Nano) for offline, private use
- Caregiver mode: a family member gets a summary of what was done
