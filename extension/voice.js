// AccessNull — voice in (Web Speech recognition) and voice out (ElevenLabs, browser TTS fallback).

let audio = null;
let queue = Promise.resolve();
export let speaking = false;

// Queued so narration never talks over itself. Returns a promise that resolves when this line finishes.
export function speak(text, settings) {
  if (!text) return Promise.resolve();
  queue = queue.then(() => say(text, settings)).catch(() => {});
  return queue;
}

export function hush() {
  audio?.pause();
  speechSynthesis.cancel();
  queue = Promise.resolve();
  speaking = false;
}

async function say(text, settings) {
  speaking = true;
  try {
    if (settings.elevenKey) {
      try {
        return await eleven(text, settings);
      } catch (e) {
        console.warn('ElevenLabs failed, using browser voice', e);
      }
    }
    await browserVoice(text, settings.lang);
  } finally {
    speaking = false;
  }
}

async function eleven(text, settings) {
  const voice = settings.voiceId || '21m00Tcm4TlvDq8EGXA3';
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'xi-api-key': settings.elevenKey },
    body: JSON.stringify({ text, model_id: 'eleven_flash_v2_5' }), // flash: lowest latency, multilingual
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}`);
  const url = URL.createObjectURL(await res.blob());
  audio = new Audio(url);
  audio.playbackRate = settings.rate || 1;
  await new Promise(resolve => {
    audio.onended = audio.onerror = audio.onpause = resolve;
    audio.play().catch(resolve);
  });
  URL.revokeObjectURL(url);
}

function browserVoice(text, lang) {
  return new Promise(resolve => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang || 'en-IN';
    u.onend = u.onerror = resolve;
    speechSynthesis.speak(u);
  });
}

// ---------- listening ----------
// Continuous recognition; Chrome ends sessions on its own every so often, so we restart.
export function listener({ lang, onText, onState, onDenied }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, on = false;
  return {
    get on() { return on; },
    start() {
      if (on || !SR) return;
      rec = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = lang();
      rec.onresult = e => {
        const r = e.results[e.results.length - 1];
        onText(r[0].transcript.trim(), r.isFinal);
      };
      rec.onerror = e => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          on = false;
          onState(false);
          onDenied();
        }
      };
      rec.onend = () => on && setTimeout(() => on && rec.start(), 120);
      on = true;
      rec.start();
      onState(true);
    },
    stop() {
      on = false;
      rec?.stop();
      onState(false);
    },
  };
}
