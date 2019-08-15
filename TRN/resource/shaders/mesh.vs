// for TR1 / TR2
uniform vec3 tintColor;
uniform vec3 flickerColor;
uniform float curTime;
uniform vec4 offsetRepeat;
uniform float rnd;
uniform float lighting;

attribute vec4 flags;

varying vec2 vUv;
varying vec3 vColor;

const vec3 vec3Unit = vec3(1.0, 1.0, 1.0);

void main() {
	vec3 pos = position;

	vUv = uv * offsetRepeat.zw + offsetRepeat.xy;

	float fcolor = max(0.0, 1.0 - 2.0 * max(0.0, lighting-flags.w));
	vColor = vec3(fcolor, fcolor, fcolor) * tintColor * mix(vec3Unit, flickerColor, step(0.5, rnd));

	float sum = position[0] + position[1] + position[2];
	float time = curTime * 0.00157;

	// perturb the vertex color (for underwater effect, for eg)
	float perturb = 0.5 * abs( sin(sum * 8.0 + time) ) + 0.5;
	vColor *= mix(1.0, perturb, flags.x);

	// perturb the vertex position
	pos.x += mix(0.0, 8.0 * sin(sum * 10.0 + time), flags.z);
	pos.y -= mix(0.0, 8.0 * sin(sum * 10.0 + time), flags.z);
	pos.z -= mix(0.0, 8.0 * sin(sum * 10.0 + time), flags.z);

	vec4 mvPosition;
	mvPosition = modelViewMatrix * vec4( pos, 1.0 );
	gl_Position = projectionMatrix * mvPosition;
}
