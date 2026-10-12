/**
 * Digital Soundbox Synthesizer using Web Audio API
 * Produces an authentic fintech audio chime on payment settlements
 * Zero external audio files required!
 */

export const isSoundboxEnabled = () => {
  const saved = localStorage.getItem('vyaparflow-soundbox');
  return saved === null ? true : saved === 'true';
};

export const setSoundboxEnabled = (enabled) => {
  localStorage.setItem('vyaparflow-soundbox', enabled ? 'true' : 'false');
};

export const playPaymentSuccessChime = () => {
  if (!isSoundboxEnabled()) return;

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const now = ctx.currentTime;

    // First tone (G5 - 784 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(783.99, now);

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.25, now + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.35);

    // Second tone (C6 - 1046.5 Hz) - higher resolving note
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1046.50, now + 0.15);

    gain2.gain.setValueAtTime(0, now + 0.15);
    gain2.gain.linearRampToValueAtTime(0.3, now + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.15);
    osc2.stop(now + 0.65);
  } catch (e) {
    console.warn('Audio chime play prevented:', e);
  }
};
