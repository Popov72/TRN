#define WORD_SCALE ##world_scale##

uniform vec3 tintColor;
uniform vec3 flickerColor;
uniform float curTime;
uniform vec4 offsetRepeat;
uniform float rnd;
uniform float lighting;

attribute vec4 _flags;

varying vec2 vUv;
varying vec3 vColor;

const vec3 vec3Unit = vec3(1.0, 1.0, 1.0);

#ifdef BONE_TEXTURE
	uniform sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		float j = i * 4.0;
		float x = mod( j, N_BONE_PIXEL_X );
		float y = floor( j / N_BONE_PIXEL_X );
		const float dx = 1.0 / N_BONE_PIXEL_X;
		const float dy = 1.0 / N_BONE_PIXEL_Y;
		y = dy * ( y + 0.5 );
		vec4 v1 = texture2D( boneTexture, vec2( dx * ( x + 0.5 ), y ) );
		vec4 v2 = texture2D( boneTexture, vec2( dx * ( x + 1.5 ), y ) );
		vec4 v3 = texture2D( boneTexture, vec2( dx * ( x + 2.5 ), y ) );
		vec4 v4 = texture2D( boneTexture, vec2( dx * ( x + 3.5 ), y ) );
		mat4 bone = mat4( v1, v2, v3, v4 );
		return bone;
	}
#else
	uniform mat4 boneGlobalMatrices[ 64 ];
	mat4 getBoneMatrix( const in float i ) {
		mat4 bone = boneGlobalMatrices[ int(i) ];
		return bone;
	}
#endif

void main() {
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );

	vec4 skinVertex = vec4( position, 1.0 );
	vec4 skinned  = boneMatX * skinVertex * skinWeight.x;
	skinned 	  += boneMatY * skinVertex * skinWeight.y;

	vUv = uv * offsetRepeat.zw + offsetRepeat.xy;

	float fcolor = max(0.0, 1.0 - 2.0 * max(0.0, lighting-_flags.w));
	vColor = vec3(fcolor, fcolor, fcolor) * tintColor * mix(vec3Unit, flickerColor, step(0.5, rnd));

	float sum = (position[0] + position[1] + position[2])/WORD_SCALE;
	float time = curTime * 0.00157;

	// perturb the vertex color (for underwater effect, for eg)
	float perturb = 0.5 * abs( sin(sum * 8.0 + time) ) + 0.5;
	vColor *= mix(1.0, perturb, _flags.x);

	// perturb the vertex position
	vec4 pos = skinned;

	pos.x += mix(0.0, 8.0 * WORD_SCALE * sin(sum * 10.0 + time), _flags.z);
	pos.y -= mix(0.0, 8.0 * WORD_SCALE * sin(sum * 10.0 + time), _flags.z);
	pos.z -= mix(0.0, 8.0 * WORD_SCALE * sin(sum * 10.0 + time), _flags.z);

	vec4 mvPosition;
	mvPosition = modelViewMatrix * pos;
	gl_Position = projectionMatrix * mvPosition;
}
