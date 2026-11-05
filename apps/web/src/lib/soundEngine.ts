/**
 * FocusForge Sound & Audio Engine
 * Zero-dependency browser Web Audio API synthesizer for:
 * - Multi-track ambient sound mixing (Lofi chords + Rain + Brown noise + Ambient drone + Alpha waves)
 * - Layer volume faders & curated focus presets
 * - Binaural Beats (Alpha 14Hz & Gamma 40Hz)
 * - Session Completion Bell Gongs & Break Chimes
 */

export type SoundMode =
  | 'none'
  | 'lofi_chill'
  | 'ambient_drone'
  | 'pink_noise'
  | 'brown_noise'
  | 'rain'
  | 'binaural_alpha'
  | 'binaural_gamma';

export type AmbientLayerKey = 'lofi' | 'rain' | 'brown' | 'ambient' | 'alpha';

export interface LayerConfig {
  name: string;
  enabled: boolean;
  volume: number; // 0.0 - 1.0
}

export function normalizeSoundMode(raw: string | null): SoundMode {
  if (!raw) return 'none';
  if (raw === 'lofi' || raw === 'lofi_chill') return 'lofi_chill';
  if (raw === 'drone' || raw === 'ambient_drone') return 'ambient_drone';
  if (raw === 'pink' || raw === 'pink_noise') return 'pink_noise';
  if (raw === 'brown' || raw === 'brown_noise') return 'brown_noise';
  if (raw === 'rain') return 'rain';
  if (raw === 'alpha' || raw === 'binaural_alpha') return 'binaural_alpha';
  if (raw === 'gamma' || raw === 'binaural_gamma') return 'binaural_gamma';
  return 'none';
}

interface RunningLayer {
  gainNode: GainNode;
  activeNodes: { stop?: () => void; disconnect?: () => void }[];
  intervalIds: number[];
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private volume: number = 0.75;
  private isMuted: boolean = false;
  private currentMode: SoundMode = 'none';

  // Multi-track layers
  private layers: Record<AmbientLayerKey, LayerConfig> = {
    lofi: { name: 'Lofi Chords', enabled: false, volume: 0.6 },
    rain: { name: 'Gentle Rain', enabled: false, volume: 0.5 },
    brown: { name: 'Brown Noise', enabled: false, volume: 0.4 },
    ambient: { name: 'Ethereal Drone', enabled: false, volume: 0.5 },
    alpha: { name: 'Alpha 14Hz', enabled: false, volume: 0.4 },
  };

  private runningLayers: Map<AmbientLayerKey, RunningLayer> = new Map();

  public initContext(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public async resumeAudioContext(): Promise<boolean> {
    try {
      this.initContext();
      if (this.ctx && this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      return this.ctx?.state === 'running';
    } catch {
      return false;
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
    this.notifyChange();
  }

  public getVolume(): number {
    return this.volume;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : this.volume, this.ctx.currentTime, 0.05);
    }
    this.notifyChange();
  }

  public isSoundMuted(): boolean {
    return this.isMuted;
  }

  public getMode(): SoundMode {
    return this.currentMode;
  }

  public isPlaying(): boolean {
    const hasRunningLayer = Array.from(this.runningLayers.values()).length > 0;
    return (hasRunningLayer || this.currentMode !== 'none') && !this.isMuted;
  }

  public getLayers(): Record<AmbientLayerKey, LayerConfig> {
    return { ...this.layers };
  }

  private notifyChange() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('focusforge-sound-changed', {
          detail: {
            mode: this.currentMode,
            isPlaying: this.isPlaying(),
            volume: this.volume,
            isMuted: this.isMuted,
            layers: this.getLayers(),
          },
        })
      );
    }
  }

  // --- Multi-track Layer Control ---
  public async setLayerState(key: AmbientLayerKey, enabled: boolean, volume?: number) {
    await this.resumeAudioContext();
    if (!this.ctx || !this.masterGain) return;

    if (volume !== undefined) {
      this.layers[key].volume = Math.max(0, Math.min(1, volume));
    }
    this.layers[key].enabled = enabled;

    if (enabled) {
      this.startLayer(key);
    } else {
      this.stopLayer(key);
    }

    // Update currentMode for display pill
    const activeKeys = (Object.keys(this.layers) as AmbientLayerKey[]).filter((k) => this.layers[k].enabled);
    if (activeKeys.length === 0) {
      this.currentMode = 'none';
    } else if (activeKeys.length === 1) {
      this.currentMode = this.layerKeyToMode(activeKeys[0]);
    } else {
      this.currentMode = 'lofi_chill'; // Multi-mix active
    }

    this.notifyChange();
  }

  public setLayerVolume(key: AmbientLayerKey, volume: number) {
    this.layers[key].volume = Math.max(0, Math.min(1, volume));
    const running = this.runningLayers.get(key);
    if (running && this.ctx) {
      running.gainNode.gain.setTargetAtTime(this.layers[key].volume, this.ctx.currentTime, 0.05);
    }
    this.notifyChange();
  }

  public async applyPreset(presetName: 'rainy_study' | 'deep_rumble' | 'zen_flow' | 'alpha_state' | 'clear') {
    await this.resumeAudioContext();
    this.stopAmbient();

    if (presetName === 'clear') {
      return;
    }

    if (presetName === 'rainy_study') {
      await this.setLayerState('rain', true, 0.55);
      await this.setLayerState('lofi', true, 0.45);
    } else if (presetName === 'deep_rumble') {
      await this.setLayerState('brown', true, 0.65);
      await this.setLayerState('ambient', true, 0.35);
    } else if (presetName === 'zen_flow') {
      await this.setLayerState('ambient', true, 0.6);
      await this.setLayerState('rain', true, 0.3);
    } else if (presetName === 'alpha_state') {
      await this.setLayerState('alpha', true, 0.5);
      await this.setLayerState('brown', true, 0.4);
    }
  }

  private layerKeyToMode(key: AmbientLayerKey): SoundMode {
    switch (key) {
      case 'lofi': return 'lofi_chill';
      case 'rain': return 'rain';
      case 'brown': return 'brown_noise';
      case 'ambient': return 'ambient_drone';
      case 'alpha': return 'binaural_alpha';
      default: return 'none';
    }
  }

  private stopLayer(key: AmbientLayerKey) {
    const running = this.runningLayers.get(key);
    if (running) {
      running.intervalIds.forEach((id) => clearInterval(id));
      running.activeNodes.forEach((node) => {
        try {
          if (node.stop) node.stop();
          if (node.disconnect) node.disconnect();
        } catch {}
      });
      try {
        running.gainNode.disconnect();
      } catch {}
      this.runningLayers.delete(key);
    }
  }

  private startLayer(key: AmbientLayerKey) {
    if (!this.ctx || !this.masterGain) return;
    this.stopLayer(key);

    const layerGain = this.ctx.createGain();
    layerGain.gain.setValueAtTime(this.layers[key].volume, this.ctx.currentTime);
    layerGain.connect(this.masterGain);

    const activeNodes: { stop?: () => void; disconnect?: () => void }[] = [];
    const intervalIds: number[] = [];

    switch (key) {
      case 'lofi':
        this.buildLofiNodes(layerGain, activeNodes, intervalIds);
        break;
      case 'rain':
        this.buildRainNodes(layerGain, activeNodes, intervalIds);
        break;
      case 'brown':
        this.buildBrownNoiseNodes(layerGain, activeNodes);
        break;
      case 'ambient':
        this.buildAmbientDroneNodes(layerGain, activeNodes);
        break;
      case 'alpha':
        this.buildBinauralNodes(220, 14, layerGain, activeNodes);
        break;
    }

    this.runningLayers.set(key, {
      gainNode: layerGain,
      activeNodes,
      intervalIds,
    });
  }

  // --- Stop All ---
  public stopAmbient() {
    (Object.keys(this.layers) as AmbientLayerKey[]).forEach((k) => {
      this.layers[k].enabled = false;
      this.stopLayer(k);
    });
    this.currentMode = 'none';
    this.notifyChange();
  }

  // Compatibility method
  public async playAmbient(rawMode: string) {
    const mode = normalizeSoundMode(rawMode);
    if (mode === 'none') {
      this.stopAmbient();
      return;
    }
    await this.resumeAudioContext();
    this.stopAmbient();

    switch (mode) {
      case 'lofi_chill':
        await this.setLayerState('lofi', true, 0.6);
        break;
      case 'ambient_drone':
        await this.setLayerState('ambient', true, 0.5);
        break;
      case 'brown_noise':
        await this.setLayerState('brown', true, 0.5);
        break;
      case 'rain':
        await this.setLayerState('rain', true, 0.5);
        break;
      case 'binaural_alpha':
        await this.setLayerState('alpha', true, 0.45);
        break;
    }
  }

  // --- Synthesis Sub-builders ---
  private buildLofiNodes(
    dest: GainNode,
    activeNodes: { stop?: () => void; disconnect?: () => void }[],
    intervalIds: number[]
  ) {
    if (!this.ctx) return;
    const ctx = this.ctx;

    // Vinyl crackle
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() < 0.002 ? (Math.random() * 2 - 1) * 0.4 : (Math.random() * 2 - 1) * 0.015;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const vinylFilter = ctx.createBiquadFilter();
    vinylFilter.type = 'bandpass';
    vinylFilter.frequency.value = 1400;
    vinylFilter.Q.value = 1.2;

    const vinylGain = ctx.createGain();
    vinylGain.gain.value = 0.12;

    whiteNoise.connect(vinylFilter);
    vinylFilter.connect(vinylGain);
    vinylGain.connect(dest);
    whiteNoise.start();

    activeNodes.push(whiteNoise, vinylFilter, vinylGain);

    // Warm Rhodes Chords progression
    const progressions = [
      [261.63, 329.63, 392.0, 493.88], // Cmaj7
      [220.0, 261.63, 329.63, 392.0],  // Am7
      [174.61, 220.0, 261.63, 329.63], // Fmaj7
      [196.0, 246.94, 293.66, 349.23], // G7
    ];

    let chordIdx = 0;
    const playNextChord = () => {
      if (!this.ctx) return;
      const chord = progressions[chordIdx % progressions.length];
      chordIdx++;

      chord.forEach((freq, noteIdx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const noteGain = this.ctx.createGain();
        const lpf = this.ctx.createBiquadFilter();

        osc.type = noteIdx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        lpf.type = 'lowpass';
        lpf.frequency.setValueAtTime(650, this.ctx.currentTime);

        const now = this.ctx.currentTime;
        const noteOffset = noteIdx * 0.04;
        noteGain.gain.setValueAtTime(0.0001, now + noteOffset);
        noteGain.gain.linearRampToValueAtTime(0.065, now + noteOffset + 0.15);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + noteOffset + 3.8);

        osc.connect(lpf);
        lpf.connect(noteGain);
        noteGain.connect(dest);

        osc.start(now + noteOffset);
        osc.stop(now + noteOffset + 4.0);
      });
    };

    playNextChord();
    const interval = window.setInterval(playNextChord, 4200);
    intervalIds.push(interval);
  }

  private buildRainNodes(
    dest: GainNode,
    activeNodes: { stop?: () => void; disconnect?: () => void }[],
    intervalIds: number[]
  ) {
    if (!this.ctx) return;
    const ctx = this.ctx;

    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.04 * white) / 1.04;
      lastOut = data[i];
      data[i] *= 1.8;
    }

    const rainNoise = ctx.createBufferSource();
    rainNoise.buffer = buffer;
    rainNoise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1100;

    const rainGain = ctx.createGain();
    rainGain.gain.value = 0.45;

    rainNoise.connect(filter);
    filter.connect(rainGain);
    rainGain.connect(dest);
    rainNoise.start();

    activeNodes.push(rainNoise, filter, rainGain);

    // Droplet pings
    const dropletInterval = window.setInterval(() => {
      if (!this.ctx) return;
      if (Math.random() < 0.6) {
        const dropOsc = this.ctx.createOscillator();
        const dropGain = this.ctx.createGain();
        const dropFreq = 1600 + Math.random() * 1200;

        dropOsc.type = 'sine';
        dropOsc.frequency.setValueAtTime(dropFreq, this.ctx.currentTime);
        dropOsc.frequency.exponentialRampToValueAtTime(dropFreq * 0.4, this.ctx.currentTime + 0.08);

        dropGain.gain.setValueAtTime(0.02, this.ctx.currentTime);
        dropGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.08);

        dropOsc.connect(dropGain);
        dropGain.connect(dest);

        dropOsc.start();
        dropOsc.stop(this.ctx.currentTime + 0.09);
      }
    }, 450);

    intervalIds.push(dropletInterval);
  }

  private buildBrownNoiseNodes(
    dest: GainNode,
    activeNodes: { stop?: () => void; disconnect?: () => void }[]
  ) {
    if (!this.ctx) return;
    const ctx = this.ctx;

    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 2.8;
    }

    const brownSource = ctx.createBufferSource();
    brownSource.buffer = buffer;
    brownSource.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 450;

    const gain = ctx.createGain();
    gain.gain.value = 0.4;

    brownSource.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    brownSource.start();

    activeNodes.push(brownSource, filter, gain);
  }

  private buildAmbientDroneNodes(
    dest: GainNode,
    activeNodes: { stop?: () => void; disconnect?: () => void }[]
  ) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const freqs = [110, 164.81, 220, 329.63]; // A2 chord drone

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, ctx.currentTime);

      gain.gain.setValueAtTime(0.05, ctx.currentTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      osc.start();

      activeNodes.push(osc, filter, gain);
    });
  }

  private buildBinauralNodes(
    carrier: number,
    beatFreq: number,
    dest: GainNode,
    activeNodes: { stop?: () => void; disconnect?: () => void }[]
  ) {
    if (!this.ctx) return;
    const ctx = this.ctx;

    const merger = ctx.createChannelMerger(2);
    const leftOsc = ctx.createOscillator();
    const rightOsc = ctx.createOscillator();
    const gain = ctx.createGain();

    leftOsc.type = 'sine';
    leftOsc.frequency.setValueAtTime(carrier, ctx.currentTime);

    rightOsc.type = 'sine';
    rightOsc.frequency.setValueAtTime(carrier + beatFreq, ctx.currentTime);

    gain.gain.value = 0.15;

    leftOsc.connect(merger, 0, 0);
    rightOsc.connect(merger, 0, 1);
    merger.connect(gain);
    gain.connect(dest);

    leftOsc.start();
    rightOsc.start();

    activeNodes.push(leftOsc, rightOsc, merger, gain);
  }

  // --- Bells & Chimes ---
  public async playSessionCompletionBell() {
    await this.resumeAudioContext();
    if (!this.ctx) return;

    const t0 = this.ctx.currentTime + 0.02;
    const fundamental = 392.0; // G4 singing bowl
    const harmonics = [1, 2.76, 5.4, 8.93];
    const amplitudes = [0.65, 0.35, 0.18, 0.08];

    harmonics.forEach((h, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(fundamental * h, t0);

      const amp = amplitudes[idx] * (this.isMuted ? 0 : Math.max(0.7, this.volume));
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(amp, t0 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.8);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t0);
      osc.stop(t0 + 4);
    });
  }

  public async playBreakFinishChime() {
    await this.resumeAudioContext();
    if (!this.ctx) return;

    const t0 = this.ctx.currentTime + 0.01;
    const notes = [523.25, 659.25, 783.99]; // C5 -> E5 -> G5
    notes.forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const startTime = t0 + i * 0.18;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      const amp = 0.55 * (this.isMuted ? 0 : Math.max(0.7, this.volume));
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(amp, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 1.8);
    });
  }
}

export const soundEngine = new SoundEngine();
export default soundEngine;
