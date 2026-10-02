// Placeholder audio (section 13), synthesized with Web Audio so the offline build needs no files.
// Fire crackle near the hearth and wind away from it are mixed by camera distance.
// Stingers warn of dusk, wave arrival, and wall breaches.
import type { World } from '../sim/world';

export type Stinger = 'dusk' | 'wave' | 'breach';

export interface GameAudio {
  update(world: World, cameraDistance: number, volume: number): void;
  stinger(kind: Stinger): void;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function createAudio(): GameAudio {
  let ctx: AudioContext | null = null;
  let master: GainNode;
  let fire: GainNode;
  let wind: GainNode;
  let noise: AudioBuffer;

  const start = () => {
    if (ctx) return;
    ctx = new AudioContext();
    master = ctx.createGain();
    master.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const loop = (type: BiquadFilterType, freq: number) => {
      const src = ctx!.createBufferSource();
      const filter = ctx!.createBiquadFilter();
      const gain = ctx!.createGain();
      src.buffer = noise;
      src.loop = true;
      filter.type = type;
      filter.frequency.value = freq;
      gain.gain.value = 0;
      src.connect(filter).connect(gain).connect(master);
      src.start();
      return { filter, gain };
    };
    fire = loop('bandpass', 700).gain;
    const w = loop('lowpass', 450);
    wind = w.gain;
    // A slow wobble makes the wind gust.
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = 0.13;
    depth.gain.value = 250;
    lfo.connect(depth).connect(w.filter.frequency);
    lfo.start();
  };
  // Browsers only allow sound after the player interacts with the page.
  window.addEventListener('pointerdown', start, { once: true });
  window.addEventListener('keydown', start, { once: true });

  const burst = (seconds: number, type: BiquadFilterType, freq: number, level: number) => {
    if (!ctx) return;
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = noise;
    filter.type = type;
    filter.frequency.value = freq;
    gain.gain.setValueAtTime(level, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + seconds);
    src.connect(filter).connect(gain).connect(master);
    src.start(ctx.currentTime, Math.random(), seconds);
  };

  const tone = (freq: number, type: OscillatorType, at: number, seconds: number, level: number) => {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.001, ctx.currentTime + at);
    gain.gain.exponentialRampToValueAtTime(level, ctx.currentTime + at + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + at + seconds);
    osc.connect(gain).connect(master);
    osc.start(ctx.currentTime + at);
    osc.stop(ctx.currentTime + at + seconds);
  };

  return {
    update(world, distance, volume) {
      if (!ctx) return;
      master.gain.value = volume;
      const near = 1 - smooth(6, 30, distance);
      fire.gain.value = world.hearth.lit ? 0.3 * near : 0;
      wind.gain.value = 0.06 + 0.3 * smooth(4, 32, distance);
      // Random pops on top of the fire hiss.
      if (world.hearth.lit && near > 0.05 && Math.random() < 0.12) burst(0.04, 'highpass', 2500, 0.5 * near);
    },
    stinger(kind) {
      if (kind === 'dusk') {
        tone(196, 'sine', 0, 0.9, 0.25);
        tone(147, 'sine', 0.6, 1.2, 0.25);
      }
      if (kind === 'wave') {
        tone(98, 'sawtooth', 0, 1.6, 0.12);
        tone(104, 'sawtooth', 0, 1.6, 0.12);
      }
      if (kind === 'breach') burst(0.5, 'lowpass', 300, 0.8);
    },
  };
}
