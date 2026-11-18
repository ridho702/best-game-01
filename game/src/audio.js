// All of Glowfall's sound, synthesized live with WebAudio — no audio files.
// Every effect is a short oscillator or noise burst, so the game stays silent
// until the player interacts (browsers block audio before a gesture) and the
// mute toggle silences it all.

export class Sfx {
  constructor() {
    this.context = null;
    this.muted = false;
  }

  /** Create the audio context on the first user gesture; safe to call any time. */
  unlock() {
    if (!this.context) {
      try {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        if (Ctor) this.context = new Ctor();
      } catch {
        this.context = null;
      }
    }
    if (this.context && this.context.state === 'suspended') this.context.resume();
  }

  tone(freq, dur, type, vol, slideTo) {
    if (this.muted || !this.context) return;
    const ctx = this.context;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + dur);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  noise(dur, vol, lowpass) {
    if (this.muted || !this.context) return;
    const ctx = this.context;
    const now = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(now);
  }

  shoot(kind) {
    if (kind === 'mortar') this.tone(180, 0.16, 'sine', 0.10, 70);
    else if (kind === 'prism') this.tone(880, 0.09, 'sawtooth', 0.05, 1400);
    else if (kind === 'frost') this.tone(1200, 0.12, 'sine', 0.05, 700);
    else this.tone(660, 0.06, 'square', 0.04, 440);
  }

  pop() {
    this.noise(0.12, 0.12, 1800);
    this.tone(320, 0.1, 'triangle', 0.07, 90);
  }

  coin() {
    this.tone(990, 0.07, 'sine', 0.06);
    this.tone(1320, 0.1, 'sine', 0.05);
  }

  leak() {
    this.tone(140, 0.35, 'sawtooth', 0.12, 60);
  }

  build() {
    this.tone(220, 0.1, 'triangle', 0.09, 440);
    this.tone(440, 0.14, 'triangle', 0.07, 660);
  }

  upgrade() {
    this.tone(523, 0.09, 'sine', 0.08);
    this.tone(659, 0.09, 'sine', 0.08);
    this.tone(784, 0.16, 'sine', 0.08);
  }

  horn() {
    this.tone(196, 0.35, 'sawtooth', 0.07, 196);
    this.tone(294, 0.35, 'sawtooth', 0.05, 294);
  }

  win() {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.25, 'triangle', 0.09), i * 130);
    });
  }

  lose() {
    [392, 330, 262, 196].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.3, 'sawtooth', 0.07), i * 160);
    });
  }
}
