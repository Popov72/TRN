uniform float opacity;
uniform sampler2D map;

varying vec3 vColor;
varying vec2 vUv;

const vec3 fogColor = vec3(0.0, 0.0, 0.0);
const float fogNear = 14000.0;
const float fogFar = 21000.0;

void main() {
	vec4 texelColor = texture2D( map, vUv );
	gl_FragColor = texelColor;
	if ( gl_FragColor.a < 0.5 ) discard;
	gl_FragColor = gl_FragColor * vec4( vColor, 1.0/*opacity*/ );

	float depth = gl_FragCoord.z / gl_FragCoord.w;
	float fogFactor = smoothstep( fogNear, fogFar, depth );
	gl_FragColor = mix( gl_FragColor, vec4( fogColor, gl_FragColor.w ), fogFactor );
}
