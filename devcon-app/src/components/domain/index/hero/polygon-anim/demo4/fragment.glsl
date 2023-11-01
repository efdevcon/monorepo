uniform float time;
uniform float progress;
uniform sampler2D texture1;
uniform vec4 resolution;
varying vec2 vUv;
varying float vProgress;
varying float vProgress1;
float PI = 3.141592653589793238;
varying vec3 vBary;
void main()	{

	float width =2.5*vProgress1;
	vec3 d = fwidth(vBary);
	vec3 s = smoothstep(d * (width + 0.5), d * (width - 0.5), vBary);
	float alpha = max(max(s.x, s.y), s.z);
	vec3 color = vec3(alpha);


	vec2 newUV = (vUv - vec2(0.5))*resolution.zw + vec2(0.5);
	vec4 t = texture2D(texture1,newUV);
	float opa = smoothstep(1.,0.5,vProgress);
	opa = 1. - vProgress;
	gl_FragColor = vec4(vUv,0.0,opa);
	opa = smoothstep(0.5,1.,opa);
	gl_FragColor = vec4(t.rgb + 1.*color*vProgress1,opa);
	// gl_FragColor.rgb = mix(gl_FragColor.rgb,vec3(1.,0.,0.),1. - opa);
	// gl_FragColor = vec4(color,opa);
}