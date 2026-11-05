// Every sound is synthesised with WebAudio: no samples to download, and it
// can only start after the power button press (a user gesture).

export class Sound {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private noise!: AudioBuffer
  muted = false
  /** Suppresses transient effects while the boot is being fast-forwarded. */
  quiet = false
  /** The power sound playing (clunk or zap): a new one cuts it short, so two never overlap. */
  powerVoice: GainNode | null = null

  start() {
    if (this.ctx) return
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    this.ctx = new Ctx()
    this.master = this.ctx.createGain()
    this.master.gain.value = this.muted ? 0 : 0.9
    this.master.connect(this.ctx.destination)
    const len = this.ctx.sampleRate * 2
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const d = this.noise.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  }

  setMuted(m: boolean) {
    this.muted = m
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.03)
  }

  private get t() {
    return this.ctx!.currentTime
  }

  private noiseSource() {
    const src = this.ctx!.createBufferSource()
    src.buffer = this.noise
    src.loop = true
    src.loopStart = Math.random()
    return src
  }

  private env(g: GainNode, peak: number, attack: number, decay: number, at = this.t) {
    g.gain.setValueAtTime(0, at)
    g.gain.linearRampToValueAtTime(peak, at + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay)
  }

  /** A fresh output for a power sound, fading out the one before. */
  private powerOut() {
    const old = this.powerVoice
    if (old) {
      old.gain.cancelScheduledValues(this.t)
      old.gain.setTargetAtTime(0, this.t, 0.015)
      setTimeout(() => old.disconnect(), 150)
    }
    const v = this.ctx!.createGain()
    v.connect(this.master)
    this.powerVoice = v
    return v
  }

  /** Relay clunk + degauss "bwonng". */
  powerOn() {
    if (!this.ctx) return
    const ctx = this.ctx
    const out = this.powerOut()
    // Clunk
    const n = this.noiseSource()
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 900
    const ng = ctx.createGain()
    this.env(ng, 0.7, 0.002, 0.09)
    n.connect(lp).connect(ng).connect(out)
    n.start()
    n.stop(this.t + 0.2)

    // Degauss: a decaying mains-frequency buzz.
    const o = ctx.createOscillator()
    o.type = 'sawtooth'
    o.frequency.value = 50
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = 380
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, this.t + 0.05)
    g.gain.linearRampToValueAtTime(0.32, this.t + 0.12)
    g.gain.exponentialRampToValueAtTime(0.0001, this.t + 1.3)
    o.connect(f).connect(g).connect(out)
    o.start(this.t + 0.05)
    o.stop(this.t + 1.4)
  }

  powerOff() {
    if (!this.ctx) return
    const out = this.powerOut()
    // Discharge zap.
    const o = this.ctx.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(900, this.t)
    o.frequency.exponentialRampToValueAtTime(60, this.t + 0.35)
    const g = this.ctx.createGain()
    this.env(g, 0.12, 0.005, 0.35)
    o.connect(g).connect(out)
    o.start()
    o.stop(this.t + 0.5)
  }

  /** Arcing inside the case: crackles that bunch up, over a rising buzz. */
  arc(dur: number) {
    if (!this.ctx) return
    const ctx = this.ctx
    for (let i = 0; i < 70; i++) {
      const at = this.t + dur * Math.sqrt(Math.random())
      const n = this.noiseSource()
      const hp = ctx.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = 1800 + Math.random() * 4000
      const g = ctx.createGain()
      this.env(g, 0.12 + Math.random() * 0.35, 0.001, 0.004 + Math.random() * 0.03, at)
      n.connect(hp).connect(g).connect(this.master)
      n.start(at)
      n.stop(at + 0.06)
    }
    const o = ctx.createOscillator()
    o.type = 'sawtooth'
    o.frequency.setValueAtTime(100, this.t)
    o.frequency.linearRampToValueAtTime(150, this.t + dur)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 1400
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, this.t)
    g.gain.exponentialRampToValueAtTime(0.1, this.t + dur)
    g.gain.linearRampToValueAtTime(0, this.t + dur + 0.02)
    o.connect(lp).connect(g).connect(this.master)
    o.start()
    o.stop(this.t + dur + 0.05)
  }

  /** Something big lets go: a bang and a thump (a power sound, so it cuts any other). */
  pop() {
    if (!this.ctx) return
    const ctx = this.ctx
    const out = this.powerOut()
    const n = this.noiseSource()
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 3200
    const ng = ctx.createGain()
    this.env(ng, 0.9, 0.001, 0.4)
    n.connect(lp).connect(ng).connect(out)
    n.start()
    n.stop(this.t + 0.5)
    const o = ctx.createOscillator()
    o.frequency.setValueAtTime(130, this.t)
    o.frequency.exponentialRampToValueAtTime(32, this.t + 0.35)
    const og = ctx.createGain()
    this.env(og, 0.7, 0.002, 0.45)
    o.connect(og).connect(out)
    o.start()
    o.stop(this.t + 0.5)
  }

  /** The single short POST beep: all good. */
  beep() {
    if (!this.ctx || this.quiet) return
    const o = this.ctx.createOscillator()
    o.type = 'square'
    o.frequency.value = 1000
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.0001, this.t)
    g.gain.linearRampToValueAtTime(0.08, this.t + 0.005)
    g.gain.setValueAtTime(0.08, this.t + 0.16)
    g.gain.linearRampToValueAtTime(0.0001, this.t + 0.17)
    o.connect(g).connect(this.master)
    o.start()
    o.stop(this.t + 0.2)
  }

  /** Mechanical keyswitch. */
  key() {
    if (!this.ctx || this.quiet) return
    const n = this.noiseSource()
    const hp = this.ctx.createBiquadFilter()
    hp.type = 'bandpass'
    hp.frequency.value = 2400 + Math.random() * 1600
    hp.Q.value = 1.4
    const g = this.ctx.createGain()
    this.env(g, 0.35 + Math.random() * 0.15, 0.001, 0.035)
    n.connect(hp).connect(g).connect(this.master)
    n.start()
    n.stop(this.t + 0.06)
    // Bottom-out thock.
    const o = this.ctx.createOscillator()
    o.frequency.value = 160 + Math.random() * 40
    const og = this.ctx.createGain()
    this.env(og, 0.09, 0.001, 0.04)
    o.connect(og).connect(this.master)
    o.start()
    o.stop(this.t + 0.06)
  }

  /** A burst of hard-drive head seeks. */
  seek(count = 6, spread = 0.5) {
    if (!this.ctx || this.quiet) return
    for (let i = 0; i < count; i++) {
      const at = this.t + Math.random() * spread
      const n = this.noiseSource()
      const bp = this.ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 1800 + Math.random() * 2500
      bp.Q.value = 3
      const g = this.ctx.createGain()
      this.env(g, 0.25 + Math.random() * 0.3, 0.001, 0.012 + Math.random() * 0.02, at)
      n.connect(bp).connect(g).connect(this.master)
      n.start(at)
      n.stop(at + 0.05)
    }
  }
}
