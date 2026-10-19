export class AudioDirector {
  constructor() {
    this.context = null;
    this.master = null;
    this.noiseBuffer = null;
    this.started = false;
    this.ambientNodes = [];
    this.lastFootstep = 0;
  }

  async start() {
    if (this.started) {
      if (this.context?.state === 'suspended') await this.context.resume();
      return;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    try {
      this.context = new AudioContextClass();
      this.master = this.context.createGain();
      this.master.gain.value = .48;
      const compressor = this.context.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 16;
      compressor.ratio.value = 5;
      compressor.attack.value = .004;
      compressor.release.value = .23;
      this.master.connect(compressor);
      compressor.connect(this.context.destination);
      this.noiseBuffer = this.makeNoiseBuffer();
      this.started = true;
      await this.context.resume();
      this.startAmbient();
    } catch (error) {
      console.warn('Audio could not be initialized.', error);
    }
  }

  makeNoiseBuffer() {
    const length = this.context.sampleRate * 2;
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    let previous = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      previous = (previous + .035 * white) / 1.035;
      data[i] = previous * 3.5;
    }
    return buffer;
  }

  startAmbient() {
    const ctx = this.context;
    if (!ctx || this.ambientNodes.length) return;
    const bus = ctx.createGain();
    bus.gain.value = .25;
    bus.connect(this.master);
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 180;
    lowpass.connect(bus);
    [48.5, 73.2].forEach((frequency, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i ? 'triangle' : 'sine';
      osc.frequency.value = frequency;
      gain.gain.value = i ? .032 : .055;
      osc.connect(gain);
      gain.connect(lowpass);
      osc.start();
      this.ambientNodes.push(osc, gain);
    });
    const air = this.noiseSource();
    const airFilter = ctx.createBiquadFilter();
    airFilter.type = 'lowpass';
    airFilter.frequency.value = 440;
    const airGain = ctx.createGain();
    airGain.gain.value = .035;
    air.connect(airFilter);
    airFilter.connect(airGain);
    airGain.connect(bus);
    air.start();
    this.ambientNodes.push(air, airFilter, airGain, bus);
  }

  noiseSource() {
    const source = this.context.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;
    return source;
  }

  envelope(gain, now, peak, attack, decay, end = 0.0001) {
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + attack);
    gain.gain.exponentialRampToValueAtTime(Math.max(end, .0001), now + decay);
  }

  playShot(kind = 'rifle', { suppressed = false, distance = 0, player = true } = {}) {
    if (!this.started) return;
    const ctx = this.context;
    const now = ctx.currentTime;
    const attenuation = Math.max(.18, 1 - distance / 56) * (player ? 1 : .42);
    const muffling = suppressed ? .32 : 1;
    const base = kind === 'shotgun' ? 1.0 : kind === 'dmr' ? .86 : kind === 'pistol' ? .57 : kind === 'smg' ? .5 : .7;

    const blast = this.noiseSource();
    const blastFilter = ctx.createBiquadFilter();
    blastFilter.type = 'lowpass';
    blastFilter.frequency.setValueAtTime(suppressed ? 780 : kind === 'shotgun' ? 2100 : kind === 'smg' ? 2400 : 3200, now);
    blastFilter.frequency.exponentialRampToValueAtTime(suppressed ? 240 : 500, now + (kind === 'shotgun' ? .46 : .24));
    const blastGain = ctx.createGain();
    this.envelope(blastGain, now, .8 * base * attenuation * muffling, .002, kind === 'shotgun' ? .58 : .34);
    blast.connect(blastFilter);
    blastFilter.connect(blastGain);
    blastGain.connect(this.master);
    blast.start(now);
    blast.stop(now + (kind === 'shotgun' ? .62 : .4));

    const thump = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(kind === 'shotgun' ? 74 : kind === 'dmr' ? 91 : kind === 'pistol' ? 111 : kind === 'smg' ? 118 : 98, now);
    thump.frequency.exponentialRampToValueAtTime(37, now + .12);
    this.envelope(thumpGain, now, .32 * base * attenuation * muffling, .002, .19);
    thump.connect(thumpGain);
    thumpGain.connect(this.master);
    thump.start(now);
    thump.stop(now + .21);

    if (!suppressed) {
      const crack = ctx.createOscillator();
      const crackGain = ctx.createGain();
      crack.type = 'triangle';
      crack.frequency.setValueAtTime(kind === 'dmr' ? 1550 : kind === 'shotgun' ? 880 : 1250, now);
      crack.frequency.exponentialRampToValueAtTime(120, now + .072);
      this.envelope(crackGain, now, .075 * base * attenuation, .001, .095);
      crack.connect(crackGain);
      crackGain.connect(this.master);
      crack.start(now);
      crack.stop(now + .1);
    }

    if (player) this.playTail(kind, now, attenuation, suppressed);
  }

  playTail(kind, now, attenuation, suppressed) {
    const ctx = this.context;
    const delay = ctx.createDelay(.55);
    delay.delayTime.value = kind === 'shotgun' ? .22 : .16;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = suppressed ? 350 : 850;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.linearRampToValueAtTime(suppressed ? .012 : .055 * attenuation, now + .08);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .58);
    const source = this.noiseSource();
    source.connect(filter);
    filter.connect(delay);
    delay.connect(gain);
    gain.connect(this.master);
    source.start(now + .015);
    source.stop(now + .62);
  }

  playReload(stage = 'click') {
    if (!this.started) return;
    const ctx = this.context;
    const now = ctx.currentTime;
    const freqs = stage === 'mag-out' ? [460, 125] : stage === 'mag-in' ? [680, 245] : stage === 'shell' ? [1050, 480] : stage === 'pump' ? [370, 95] : [280, 185];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i ? 'triangle' : 'square';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * .57, now + .055);
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.linearRampToValueAtTime(i ? .075 : .028, now + .004);
      gain.gain.exponentialRampToValueAtTime(.0001, now + .09);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(now);
      osc.stop(now + .095);
    });
  }

  playDry() {
    if (!this.started) return;
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = 'square'; osc.frequency.value = 92;
    gain.gain.setValueAtTime(.075, now); gain.gain.exponentialRampToValueAtTime(.0001, now + .06);
    osc.connect(gain); gain.connect(this.master); osc.start(now); osc.stop(now + .065);
  }

  playImpact(head = false) {
    if (!this.started) return;
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(head ? 820 : 230, now);
    osc.frequency.exponentialRampToValueAtTime(head ? 260 : 82, now + .075);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.linearRampToValueAtTime(head ? .13 : .08, now + .003);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .12);
    osc.connect(gain); gain.connect(this.master); osc.start(now); osc.stop(now + .13);
  }

  playFootstep(crouched = false, sprinting = false) {
    if (!this.started) return;
    const now = this.context.currentTime;
    const source = this.noiseSource();
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = sprinting ? 420 : 240;
    const gain = this.context.createGain();
    const level = crouched ? .025 : sprinting ? .13 : .075;
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.linearRampToValueAtTime(level, now + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, now + (sprinting ? .14 : .21));
    source.connect(filter); filter.connect(gain); gain.connect(this.master);
    source.start(now); source.stop(now + .24);
    const sole = this.context.createOscillator();
    const soleGain = this.context.createGain();
    sole.type = 'sine'; sole.frequency.setValueAtTime(sprinting ? 61 : 48, now);
    soleGain.gain.setValueAtTime(level * .7, now); soleGain.gain.exponentialRampToValueAtTime(.0001, now + .1);
    sole.connect(soleGain); soleGain.connect(this.master); sole.start(now); sole.stop(now + .11);
  }

  playHurt() {
    if (!this.started) return;
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(170, now); osc.frequency.exponentialRampToValueAtTime(67, now + .32);
    gain.gain.setValueAtTime(.0001, now); gain.gain.linearRampToValueAtTime(.14, now + .025); gain.gain.exponentialRampToValueAtTime(.0001, now + .36);
    const filter = this.context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 360;
    osc.connect(filter); filter.connect(gain); gain.connect(this.master); osc.start(now); osc.stop(now + .38);
  }

  playExplosion() {
    if (!this.started) return;
    this.playShot('shotgun', { distance: 3, player: true });
    const now = this.context.currentTime;
    const noise = this.noiseSource();
    const filter = this.context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.setValueAtTime(180, now); filter.frequency.exponentialRampToValueAtTime(38, now + .85);
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(.36, now); gain.gain.exponentialRampToValueAtTime(.0001, now + 1.1);
    noise.connect(filter); filter.connect(gain); gain.connect(this.master); noise.start(now); noise.stop(now + 1.15);
  }

  playWave() {
    if (!this.started) return;
    const now = this.context.currentTime;
    [440, 660, 880].forEach((frequency, i) => {
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      osc.type = 'sine'; osc.frequency.value = frequency;
      gain.gain.setValueAtTime(.0001, now + i * .09);
      gain.gain.linearRampToValueAtTime(.11, now + i * .09 + .025);
      gain.gain.exponentialRampToValueAtTime(.0001, now + i * .09 + .45);
      osc.connect(gain); gain.connect(this.master); osc.start(now + i * .09); osc.stop(now + i * .09 + .48);
    });
  }

  playClick() {
    if (!this.started) return;
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(680, now); osc.frequency.exponentialRampToValueAtTime(420, now + .025);
    gain.gain.setValueAtTime(.045, now); gain.gain.exponentialRampToValueAtTime(.0001, now + .035);
    osc.connect(gain); gain.connect(this.master); osc.start(now); osc.stop(now + .04);
  }

  setMasterVolume(value) {
    if (this.master && this.context) this.master.gain.setTargetAtTime(value, this.context.currentTime, .08);
  }
}
