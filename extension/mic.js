// Side panels can't show the mic permission prompt, so we ask once from a normal tab.
// The grant belongs to the extension's origin, so the side panel inherits it.
navigator.mediaDevices.getUserMedia({ audio: true }).then(
  stream => {
    stream.getTracks().forEach(t => t.stop());
    document.getElementById('msg').textContent = 'Done. You can close this tab and go back to AccessNull.';
    chrome.runtime.sendMessage({ type: 'mic-granted' }).catch(() => {});
    setTimeout(() => window.close(), 1500);
  },
  () => (document.getElementById('msg').textContent = 'Microphone is blocked. Click the lock icon in the address bar, allow the microphone, then reload this page.')
);
