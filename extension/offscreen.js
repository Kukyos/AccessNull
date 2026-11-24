// AccessNull — voice output. An offscreen document, because service workers can't play audio
// and page audio would cut off on every navigation.
import { speak, hush } from './voice.js';

chrome.runtime.onMessage.addListener((msg, _s, reply) => {
  if (msg.target !== 'offscreen') return;
  if (msg.type === 'hush') return hush();
  if (msg.type === 'speak') {
    speak(msg.text, msg.settings).then(() => reply(true));
    return true; // reply when the line has finished playing
  }
});
