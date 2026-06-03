import { logger } from './logger';
import { AUDIO_CONFIG } from './config';

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

  setMuted(muted: boolean) {
    this.muted = muted;
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  private playTone(freq: number, type: OscillatorType, duration: number, vol = AUDIO_CONFIG.DEFAULT_VOLUME) {
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
      this.playTone(AUDIO_CONFIG.TICK_URGENT_FREQ, 'square', AUDIO_CONFIG.TONE_DURATION_SHORT, 0.05);
    } else {
      this.playTone(AUDIO_CONFIG.TICK_NORMAL_FREQ, 'sine', AUDIO_CONFIG.TONE_DURATION_MEDIUM, 0.05);
    }
  }

  playAccept() {
    this.playTone(AUDIO_CONFIG.ACCEPT_FREQ_1, 'sine', AUDIO_CONFIG.TONE_DURATION_MEDIUM, AUDIO_CONFIG.DEFAULT_VOLUME);
    setTimeout(() => this.playTone(AUDIO_CONFIG.ACCEPT_FREQ_2, 'sine', AUDIO_CONFIG.TONE_DURATION_LONG, AUDIO_CONFIG.DEFAULT_VOLUME), 100);
  }

  playReject() {
    this.playTone(AUDIO_CONFIG.REJECT_FREQ, 'sawtooth', AUDIO_CONFIG.TONE_DURATION_LONG, AUDIO_CONFIG.DEFAULT_VOLUME);
  }

  playExplosion() {
    if (this.muted) return;
    try {
      const ctx = this.getCtx();
      const duration = AUDIO_CONFIG.TONE_DURATION_LONG * 5;
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
