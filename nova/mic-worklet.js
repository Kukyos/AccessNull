// Microphone → 16-bit PCM frames of 100 ms (1600 samples at 16 kHz), plus a loudness value for the voice line.
class Pcm extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Int16Array(1600); this.n = 0; this.sum = 0; }
  process([input]) {
    const ch = input[0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) {
      const s = Math.max(-1, Math.min(1, ch[i]));
      this.sum += s * s;
      this.buf[this.n++] = s < 0 ? s * 0x8000 : s * 0x7fff;
      if (this.n === this.buf.length) {
        this.port.postMessage({ pcm: this.buf.buffer.slice(0), rms: Math.sqrt(this.sum / this.n) });
        this.n = 0; this.sum = 0;
      }
    }
    return true;
  }
}
registerProcessor('pcm', Pcm);
