// Web Audio API Synthesizer for Dog & Cat Sounds

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play a synthesized Dog Bark
 */
export function playBark(type: "happy" | "deep" | "playful" = "happy") {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Base pitch depending on type
    const baseFreq = type === "deep" ? 140 : type === "playful" ? 380 : 260;

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, now + 0.15);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.7, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  } catch (e) {
    console.error("Audio synth error:", e);
  }
}

/**
 * Play a synthesized Cat Meow
 */
export function playMeow(type: "cute" | "demanding" | "purr" = "cute") {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    if (type === "purr") {
      // Purr sound simulation (low frequency modulated noise/oscillator)
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const masterGain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(75, now);

      lfo.type = "square";
      lfo.frequency.setValueAtTime(22, now); // 22Hz purr rumble
      lfoGain.gain.setValueAtTime(30, now);

      lfo.connect(osc.frequency);

      masterGain.gain.setValueAtTime(0, now);
      masterGain.gain.linearRampToValueAtTime(0.4, now + 0.1);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc.connect(masterGain);
      masterGain.connect(ctx.destination);

      lfo.start(now);
      osc.start(now);
      lfo.stop(now + 1.2);
      osc.stop(now + 1.2);
      return;
    }

    // Meow modulation
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const startFreq = type === "demanding" ? 450 : 600;
    const peakFreq = type === "demanding" ? 850 : 950;
    const endFreq = type === "demanding" ? 350 : 400;

    osc.type = "triangle";
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(peakFreq, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.45);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.05);
    gain.gain.setValueAtTime(0.5, now + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.52);
  } catch (e) {
    console.error("Audio synth error:", e);
  }
}

/**
 * Play Squeaky Toy Sound
 */
export function playSqueak() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(2200, now);
    osc.frequency.exponentialRampToValueAtTime(3100, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(1800, now + 0.16);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.6, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  } catch (e) {
    console.error("Audio synth error:", e);
  }
}

/**
 * Play Whistle Sound
 */
export function playWhistle() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.setValueAtTime(1800, now + 0.1);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.38);
  } catch (e) {
    console.error("Audio synth error:", e);
  }
}

/**
 * Play a rhythmic sequence of animal sounds (Barks or Meows) for Human -> Pet translation
 */
export function playAnimalSentence(
  species: "dog" | "cat",
  sequence: string[] = ["happy", "playful", "happy"]
) {
  const safeSequence = sequence.length > 0 ? sequence.slice(0, 5) : ["happy", "playful", "happy"];
  safeSequence.forEach((step, index) => {
    const delayMs = index * (species === "dog" ? 340 : 540);
    setTimeout(() => {
      if (species === "dog") {
        const barkType =
          step === "deep" || step === "playful" || step === "happy" ? step : "happy";
        playBark(barkType);
      } else {
        const meowType =
          step === "demanding" || step === "purr" || step === "cute" ? step : "cute";
        playMeow(meowType);
      }
    }, delayMs);
  });
}

