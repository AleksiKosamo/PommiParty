import { logger } from './logger';

class AudioManager {
  private ctx: AudioContext | null = null;
  public muted = false;

  private getCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  private playTone(freq: number, type: OscillatorType, duration: number, vol = 0.1) {
    if (this.muted) return;
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      logger.warn('Audio failed', e);
    }
  }

  playTick(urgent: boolean) {
    if (urgent) {
      this.playTone(800, 'square', 0.05, 0.05);
    } else {
      this.playTone(400, 'sine', 0.1, 0.05);
    }
  }

  playAccept() {
    this.playTone(600, 'sine', 0.1, 0.1);
    setTimeout(() => this.playTone(800, 'sine', 0.2, 0.1), 100);
  }

  playReject() {
    this.playTone(150, 'sawtooth', 0.3, 0.1);
  }

  playExplosion() {
    if (this.muted) return;
    try {
      const ctx = this.getCtx();
      const duration = 1.5;
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + duration);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
    } catch (e) {
      logger.warn('Audio failed', e);
    }
  }
}

export const audio = new AudioManager();
