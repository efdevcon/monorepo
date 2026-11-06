// WebGL post-process that turns the flat text canvas into a picture on a
// curved, glowing, scanlined phosphor tube.

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform sampler2D uGlow;  // heavily downsampled copy of uTex for wide bloom
uniform vec2 uGlowRes;
uniform vec2 uRes;
uniform float uTime;
uniform float uBright;   // warm-up / overall brightness
uniform vec2 uSquash;    // power on/off deflection collapse (1 = normal)
uniform float uFlash;    // white-hot beam during collapse
uniform float uWobble;   // degauss wobble
uniform float uMotion;   // 0 under prefers-reduced-motion
uniform float uOn;       // 0 = tube off (just glass)
uniform vec3 uTint;
uniform float uScan;     // scanline period in output pixels
uniform float uCurve;    // barrel strength (gentler on portrait screens)
uniform float uRadius;   // corner radius of the glass, px (matches the CSS tube)
uniform float uMargin;   // unlit border between the raster and the glass edge, px
uniform float uShade;    // width of the depth shading inside the glass edge, px
uniform float uBloom;    // bloom strength (1 = desktop)
uniform float uVig;      // how much the vignette dims towards the edges (1 = desktop)

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

// Spherical bulge, measured in pixels so it curves equally in both directions
// whatever the tube's aspect. Scaled so the glass edge (raster + margin) just
// meets the tube at the middle of each side, where the bulge is widest.
vec2 barrel(vec2 uv) {
  vec2 c = uv * 2.0 - 1.0;
  float a2 = (uRes.x * uRes.x) / (uRes.y * uRes.y);
  float r2 = (c.x * c.x * a2 + c.y * c.y) / (a2 + 1.0);
  vec2 fit = (1.0 + 2.0 * uMargin / uRes) / (1.0 + uCurve * vec2(a2, 1.0) / (a2 + 1.0));
  c *= fit * (1.0 + uCurve * r2);
  return c * 0.5 + 0.5;
}

float roundRect(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float inside(vec2 p) {
  return step(0.0, p.x) * step(p.x, 1.0) * step(0.0, p.y) * step(p.y, 1.0);
}

vec3 tex(vec2 p) { return texture2D(uTex, p).rgb * inside(p); }

void main() {
  vec2 uv = barrel(vUv);
  // Texture is uploaded top-down; flip once here.
  vec2 p = vec2(uv.x, 1.0 - uv.y);

  // Deflection collapse: squeeze the raster towards the centre.
  p = (p - 0.5) / uSquash + 0.5;
  // Degauss wobble.
  p.x += sin(p.y * 26.0 + uTime * 38.0) * uWobble * 0.012;
  p.y += sin(p.x * 18.0 + uTime * 27.0) * uWobble * 0.006;

  vec2 texel = 1.0 / uRes;
  float ca = 1.25 * texel.x;
  vec3 col;
  col.r = tex(p + vec2(ca, 0.0)).r;
  col.g = tex(p).g;
  col.b = tex(p - vec2(ca, 0.0)).b;

  // Bloom: a golden-angle disc of taps around the sample.
  float glow = 0.0;
  for (int i = 0; i < 16; i++) {
    float fi = float(i);
    float a = fi * 2.39996;
    float r = (fi + 1.0) / 16.0 * 7.0;
    glow += dot(tex(p + vec2(cos(a), sin(a)) * r * texel), vec3(0.333));
  }
  glow /= 16.0;
  // Wide halo from the small texture: bilinear taps on it are already soft,
  // so a handful of them blur smoothly without ghosting.
  vec2 gt = 1.0 / uGlowRes;
  float wide = 0.0;
  for (int x = -1; x <= 1; x++)
    for (int y = -1; y <= 1; y++)
      wide += dot(texture2D(uGlow, p + vec2(float(x), float(y)) * gt * 1.2).rgb, vec3(0.333)) * inside(p);
  wide /= 9.0;

  vec3 c = col * uTint * 1.08 + uTint * (glow * 0.85 + wide * 0.35) * uBloom;
  // Phosphor saturates towards white at the core.
  c += vec3(dot(col, vec3(0.333))) * 0.18;

  // Beam during power transitions.
  float band = inside(p);
  c += uTint * uFlash * band + vec3(uFlash * 0.6) * band;

  // Scanlines, locked to screen pixels.
  float s = 0.5 + 0.5 * sin(gl_FragCoord.y * 6.28318 / uScan);
  c *= mix(0.58, 1.12, s);

  // Aperture grille.
  float m = mod(gl_FragCoord.x, 3.0);
  vec3 mask = m < 1.0 ? vec3(1.0, 0.82, 0.82) : m < 2.0 ? vec3(0.82, 1.0, 0.82) : vec3(0.82, 0.82, 1.0);
  c *= mask;

  // Slow rolling interference bar and mains flicker.
  float roll = fract(vUv.y * 0.6 + uTime * 0.065);
  c *= 1.0 + uMotion * 0.05 * smoothstep(0.0, 0.12, roll) * (1.0 - smoothstep(0.12, 0.3, roll));
  c *= 1.0 + uMotion * 0.018 * sin(uTime * 120.0);
  c += uMotion * (hash(gl_FragCoord.xy + fract(uTime) * 100.0) - 0.5) * 0.035 * uOn;

  c *= uBright;

  // Unlit glass: a faint grey-green with the phosphor's own sheen.
  float vig = mix(1.0, pow(clamp(16.0 * uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y), 0.0, 1.0), 0.35), uVig);
  vec3 glass = vec3(0.05, 0.058, 0.054) * (0.6 + 0.4 * vig);
  c = glass + c * vig + uTint * 0.018 * uOn * vig;

  // Glass edge: a rounded rect in the same warped space as the raster, so
  // the content and the glass share one curvature.
  float d = roundRect((uv - 0.5) * uRes, uRes * 0.5 + uMargin, uRadius);
  float edge = 1.0 - smoothstep(-1.5, 0.0, d);
  // Depth shading and a thin lit rim, both following that curved edge so the
  // bow of the glass reads against the gasket. The rim catches light from above.
  float inner = max(-d, 0.0);
  c *= mix(0.4, 1.0, smoothstep(0.0, uShade, inner));
  float rim = exp(-inner / max(1.0, uRes.y * 0.003));
  c += vec3(0.09, 0.1, 0.095) * rim * mix(0.3, 1.0, smoothstep(0.4, 1.0, vUv.y));
  gl_FragColor = vec4(c * edge, 1.0);
}`

export interface CRTState {
  bright: number
  squashX: number
  squashY: number
  flash: number
  wobble: number
  on: number
  tint: [number, number, number]
}

/** The tube's shape for a canvas size: shared by the shader and the hit test. */
export function tubeShape(width: number, height: number, flat: boolean) {
  return flat
    ? // Phones: a third of the desktop curve, a narrow shading band and half the
      // unlit margin and a faint vignette, so text near the sides stays at full
      // brightness; a little less bloom for the bigger glyphs.
      { curve: 0.035, margin: Math.round(height * 0.006), shade: Math.min(width, height) * 0.025, bloom: 0.8, vig: 0.15 }
    : { curve: height > width ? 0.05 : 0.11, margin: Math.round(height * 0.012), shade: height * 0.07, bloom: 1, vig: 1 }
}

/**
 * Where a point on the glass shows the raster: the shader's barrel() in canvas
 * pixels (x and y from the top left), so taps land where the text appears.
 */
export function warp(x: number, y: number, width: number, height: number, flat: boolean) {
  const { curve, margin } = tubeShape(width, height, flat)
  const cx = (x / width) * 2 - 1
  const cy = (y / height) * 2 - 1
  const a2 = (width * width) / (height * height)
  const r2 = (cx * cx * a2 + cy * cy) / (a2 + 1)
  const k = 1 + curve * r2
  const fx = (1 + (2 * margin) / width) / (1 + (curve * a2) / (a2 + 1))
  const fy = (1 + (2 * margin) / height) / (1 + curve / (a2 + 1))
  return { x: ((cx * fx * k + 1) / 2) * width, y: ((cy * fy * k + 1) / 2) * height }
}

export class CRT {
  readonly ok: boolean
  /** Corner radius of the tube, in canvas pixels. */
  radius = 0
  /** Phone-sized tube (≤ 640 px): the flatter shape (see tubeShape). */
  flat = false
  private gl!: WebGLRenderingContext
  private uni: Record<string, WebGLUniformLocation | null> = {}
  private texture!: WebGLTexture
  private glowTex!: WebGLTexture
  private mid = document.createElement('canvas')
  private midCtx = this.mid.getContext('2d')!
  private glow = document.createElement('canvas')
  private glowCtx = this.glow.getContext('2d')!
  private motion: number

  constructor(
    readonly canvas: HTMLCanvasElement,
    reducedMotion: boolean,
  ) {
    this.motion = reducedMotion ? 0 : 1
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false })
    this.ok = !!gl && this.init(gl)
  }

  private init(gl: WebGLRenderingContext) {
    this.gl = gl
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s))
        return null
      }
      return s
    }
    const vs = compile(gl.VERTEX_SHADER, VERT)
    const fs = compile(gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return false
    const prog = gl.createProgram()!
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'aPos')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    for (const n of ['uTex', 'uGlow', 'uGlowRes', 'uRes', 'uTime', 'uBright', 'uSquash', 'uFlash', 'uWobble', 'uMotion', 'uOn', 'uTint', 'uScan', 'uCurve', 'uRadius', 'uMargin', 'uShade', 'uBloom', 'uVig'])
      this.uni[n] = gl.getUniformLocation(prog, n)

    const makeTex = (unit: number) => {
      const t = gl.createTexture()!
      gl.activeTexture(gl.TEXTURE0 + unit)
      gl.bindTexture(gl.TEXTURE_2D, t)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      return t
    }
    this.texture = makeTex(0)
    this.glowTex = makeTex(1)
    gl.uniform1i(this.uni.uTex, 0)
    gl.uniform1i(this.uni.uGlow, 1)
    return true
  }

  upload(source: HTMLCanvasElement) {
    const gl = this.gl
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source)

    // Two-step downsample (1/4 then 1/16) keeps the halo smooth.
    const gw = Math.max(1, Math.round(source.width / 16))
    const gh = Math.max(1, Math.round(source.height / 16))
    if (this.glow.width !== gw) {
      this.mid.width = gw * 4
      this.mid.height = gh * 4
      this.glow.width = gw
      this.glow.height = gh
    }
    this.midCtx.drawImage(source, 0, 0, gw * 4, gh * 4)
    this.glowCtx.drawImage(this.mid, 0, 0, gw, gh)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.glowTex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, this.glow)
    gl.uniform2f(this.uni.uGlowRes, gw, gh)
  }

  render(time: number, s: CRTState, dpr: number) {
    const gl = this.gl
    const { width, height } = this.canvas
    gl.viewport(0, 0, width, height)
    gl.uniform2f(this.uni.uRes, width, height)
    gl.uniform1f(this.uni.uTime, time)
    gl.uniform1f(this.uni.uBright, s.bright)
    gl.uniform2f(this.uni.uSquash, Math.max(s.squashX, 0.0005), Math.max(s.squashY, 0.0005))
    gl.uniform1f(this.uni.uFlash, s.flash)
    gl.uniform1f(this.uni.uWobble, s.wobble * this.motion)
    gl.uniform1f(this.uni.uMotion, this.motion)
    gl.uniform1f(this.uni.uOn, s.on)
    gl.uniform3f(this.uni.uTint, ...s.tint)
    gl.uniform1f(this.uni.uScan, 3 * dpr)
    const shape = tubeShape(width, height, this.flat)
    gl.uniform1f(this.uni.uCurve, shape.curve)
    gl.uniform1f(this.uni.uRadius, this.radius)
    gl.uniform1f(this.uni.uMargin, shape.margin)
    gl.uniform1f(this.uni.uShade, shape.shade)
    gl.uniform1f(this.uni.uBloom, shape.bloom)
    gl.uniform1f(this.uni.uVig, shape.vig)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }
}
