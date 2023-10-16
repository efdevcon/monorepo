uniform float time;
uniform float progress;
varying vec2 vUv;
varying vec4 vPosition;
varying float vProgress;
varying float vProgress1;
uniform vec2 pixels;

attribute float offset;
attribute float random;
attribute vec3 centroid1;
attribute vec3 control0;
attribute vec3 control1;
attribute vec3 bary;
varying vec3 vBary;

mat4 rotationMatrix(vec3 axis, float angle) {
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    
    return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
                oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
                oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
                0.0,                                0.0,                                0.0,                                1.0);
}

vec3 rotate(vec3 v, vec3 axis, float angle) {
  mat4 m = rotationMatrix(axis, angle);
  return (m * vec4(v, 1.0)).xyz;
}


float easeOutQuint(float t){
  return 1. + (--t) * t * t * t * t;
}
float easeOut(float t){
  return  t * t * t;
}

vec3 cubicBezier(vec3 p0, vec3 c0, vec3 c1, vec3 p1, float t) {
    float tn = 1.0 - t;

    return tn * tn * tn * p0 + 3.0 * tn * tn * t * c0 + 3.0 * tn * t * t * c1 + t * t * t * p1;
}

vec2 cubicBezier(vec2 p0, vec2 c0, vec2 c1, vec2 p1, float t) {
    float tn = 1.0 - t;

    return tn * tn * tn * p0 + 3.0 * tn * tn * t * c0 + 3.0 * tn * t * t * c1 + t * t * t * p1;
}

vec3 bezier4(vec3 a, vec3 b, vec3 c, vec3 d, float t) {
    return mix(mix(mix(a, b, t), mix(b, c, t), t), mix(mix(b, c, t), mix(c, d, t), t), t);
  }

  float easeInOutQuint(float t){
    return t < 0.5 ? 16.0 * t * t * t * t * t : 1.0 + 16.0 * (--t) * t * t * t * t;
  }

void main() {
  float PI = 3.141592653589793238;
  vUv = uv;
  vBary = bary;

  vec3 newpos = position;
  
  float o = 1. - offset;
  // float prog = clamp( (progress - o*0.999) /0.001,0.,1.);
  float prog = clamp( (progress - o*0.6) /0.4,0.,1.);
  vProgress =  prog;
  vProgress1 =  clamp( (progress - clamp(o - 0.1,-0.,1.)*0.9) /0.1,0.,1.);
  // newpos = bezier4(newpos, control0, control1, newpos, easeInOutQuint(prog));
  // newpos.z = abs(newpos.z);
  // prog = easeInOutQuint(prog);
  // newpos = rotate(newpos - centroid1, vec3(1.,0.,0.),-prog*PI) + centroid1 + vec3(0.,-1.,0.)*prog*0.;
  // newpos.y += prog*1.5*sin(PI*random);
  // newpos.x += prog*1.5*cos(PI*random);
  // newpos.x += sin(10.*offset)*prog;
  // newpos.y += 0.4*sin(time + offset);
  gl_Position = projectionMatrix * modelViewMatrix * vec4( newpos, 1.0 );
}