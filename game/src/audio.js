// WebAudio synthesizer: every sound is generated, no audio files, no network.
export function createAudio() {
  let ctx = null, master = null, engineOsc = null, engineGain = null, sirenTimer = 0;
  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.35; master.connect(ctx.destination);
      engineOsc = ctx.createOscillator(); engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 50;
      engineGain = ctx.createGain(); engineGain.gain.value = 0; engineOsc.connect(engineGain); engineGain.connect(master);
      engineOsc.start();
      return true;
    } catch { return false; }
  }
  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure()) return;
    try {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), ctx.currentTime + dur);
      g.gain.setValueAtTime(vol || 0.2, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + dur + 0.02);
    } catch {}
  }
  function noise(dur, vol, low) {
    if (!ensure()) return;
    try {
      const len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = low || 1200;
      const g = ctx.createGain(); g.gain.value = vol || 0.3;
      src.connect(f); f.connect(g); g.connect(master); src.start();
    } catch {}
  }
  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); },
    engine(speed01, on) {
      if (!ensure()) return;
      try { engineGain.gain.value = on ? 0.05 + speed01 * 0.09 : 0; engineOsc.frequency.value = 45 + speed01 * 110; } catch {}
    },
    siren(dt, wanted) {
      if (!ensure() || wanted < 1) return;
      sirenTimer -= dt;
      if (sirenTimer <= 0) { sirenTimer = 0.45; tone(wanted >= 3 ? 880 : 700, 0.42, 'sine', 0.05, wanted >= 3 ? 660 : 950); }
    },
    shoot() { noise(0.12, 0.5, 2600); tone(180, 0.08, 'square', 0.18, 60); },
    punch() { noise(0.08, 0.25, 500); },
    step() { noise(0.04, 0.06, 400); },
    pickup() { tone(660, 0.1, 'sine', 0.2); setTimeout(() => tone(990, 0.14, 'sine', 0.2), 90); },
    crash() { noise(0.25, 0.5, 700); tone(90, 0.2, 'square', 0.25, 40); },
    mission() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'triangle', 0.22), i * 110)); },
    fail() { tone(220, 0.5, 'sawtooth', 0.2, 110); },
    horn() { tone(370, 0.25, 'square', 0.12, 370); },
    cash() { tone(880, 0.08, 'sine', 0.18); setTimeout(() => tone(1320, 0.12, 'sine', 0.18), 70); },
  };
}
