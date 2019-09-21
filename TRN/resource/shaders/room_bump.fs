uniform float opacity;
uniform sampler2D map;
uniform sampler2D mapBump;
uniform vec4 offsetBump;

varying vec3 vColor;
varying vec2 vUv;

void main() {
	vec4 texelColor = texture2D( map, vUv );
	vec4 bumpColor = texture2D( mapBump, vUv + offsetBump.xy);
	float a = texelColor.a;
	texelColor = texelColor * (bumpColor + 0.25) * 1.25;
	texelColor.a = a;
	gl_FragColor = texelColor;
	if ( gl_FragColor.a < 0.5 ) discard;
	gl_FragColor = gl_FragColor * vec4( vColor, 1.0/*opacity*/ );
}
