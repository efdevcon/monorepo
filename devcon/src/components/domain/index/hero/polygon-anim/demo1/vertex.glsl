uniform float time;
uniform float progress;
uniform vec4 resolution;
varying vec2 vUv;
varying vec4 vPosition;
varying float vProgress;
varying float vProgress1;
uniform vec2 pixels;

attribute float offset;
attribute float random;
attribute vec3 centroid1;
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

float easeInOutQuint(float t){
  return t < 0.5 ? 16.0 * t * t * t * t * t : 1.0 + 16.0 * (--t) * t * t * t * t;
}
float easeOutQuint(float t){
  return 1. + (--t) * t * t * t * t;
}
float easeOut(float t){
  return  t * t * t;
}



void main() {
  float PI = 3.141592653589793238;
  vUv = uv;
  vBary = bary;

  vec3 newpos = position;
  
  float o = 1. - offset;
  // float prog = clamp( (progress - o*0.999) /0.001,0.,1.);
  float pr = (progress - 0.5)*(0.3 + resolution.y/resolution.x) + 0.5;
  pr = progress;
  float prog = clamp( (pr - o*0.6) /0.4,0.,1.);
  vProgress =  prog;
  vProgress1 =  clamp( (pr - (o - 0.1)*0.9) /0.1,0.,1.);
  // prog = easeInOutQuint(prog);
  // newpos = rotate(newpos - centroid1, vec3(1.,0.,0.),-prog*PI) + centroid1 + vec3(0.,-1.,0.)*prog*0.;
  newpos.y += easeOut(prog)*1.5*sin(PI*random);
  newpos.x += easeOut(prog)*1.5*cos(PI*random);
  // newpos.x += sin(10.*offset)*prog;
  // newpos.y += 0.4*sin(time + offset);
  gl_Position = projectionMatrix * modelViewMatrix * vec4( newpos, 1.0 );
}