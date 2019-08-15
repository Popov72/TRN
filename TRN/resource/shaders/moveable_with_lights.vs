uniform vec3 tintColor;
uniform vec3 flickerColor;
uniform float curTime;
uniform vec4 offsetRepeat;
uniform float rnd;
uniform float lighting;

uniform vec3 ambientColor;
#define NUM_POINT_LIGHTS ##num_lights##
#if NUM_POINT_LIGHTS > 0
	uniform vec3 pointLightColor[ NUM_POINT_LIGHTS ];
	uniform vec3 pointLightPosition[ NUM_POINT_LIGHTS ];
	uniform float pointLightDistance[ NUM_POINT_LIGHTS ];
#endif

attribute vec4 flags;

varying vec2 vUv;
varying vec3 vColor;

const vec3 vec3Unit = vec3(1.0, 1.0, 1.0);
/*#define BONE_TEXTURE
#define N_BONE_PIXEL_X 64.0
#define N_BONE_PIXEL_Y 64.0*/
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

	vColor = tintColor * mix(vec3Unit, flickerColor, step(0.5, rnd));

	float sum = position[0] + position[1] + position[2];
	float time = curTime * 0.00157;

	// perturb the vertex color (for underwater effect, for eg)
	float perturb = 0.5 * abs( sin(sum * 8.0 + time) ) + 0.5;
	vColor *= mix(1.0, perturb, flags.x);

	// perturb the vertex position
	vec4 pos = skinned;

	pos.x += mix(0.0, 8.0 * sin(sum * 10.0 + time), flags.z);
	pos.y -= mix(0.0, 8.0 * sin(sum * 10.0 + time), flags.z);
	pos.z -= mix(0.0, 8.0 * sin(sum * 10.0 + time), flags.z);

	vec4 mvPosition;
	mvPosition = modelViewMatrix * pos;

	#if NUM_POINT_LIGHTS == 0
		vColor *= ambientColor;
	#endif

	#if NUM_POINT_LIGHTS > 0

		mat4 skinMatrix = skinWeight.x * boneMatX;
		skinMatrix 	+= skinWeight.y * boneMatY;

		vec4 skinnedNormal = skinMatrix * vec4( normal, 0.0 );

		vec3 objectNormal = skinnedNormal.xyz;

		vec3 transformedNormal = normalMatrix * objectNormal;

		transformedNormal = normalize( transformedNormal );

		vec3 vLightFront = vec3( 0.0 );

		for( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {

			vec4 lPosition = viewMatrix * vec4( pointLightPosition[ i ], 1.0 );
			vec3 lVector = lPosition.xyz - mvPosition.xyz;

			float /*lDistance = 1.0, */fdist = min(pointLightDistance[ i ] / length(lVector), 1.0);
			/*if ( pointLightDistance[ i ] > 0.0 )
				lDistance = 1.0 - min( ( fdist / pointLightDistance[ i ] ), 1.0 );*/

			lVector = normalize( lVector );
			float dotProduct = dot( transformedNormal, lVector );

			dotProduct = (dotProduct + 1.0) / 2.0;

			vec3 pointLightWeighting = vec3( max( dotProduct, 0.0 ) );

			vLightFront += pointLightColor[ i ] * pointLightWeighting * fdist/*lDistance*/;

		}

		vLightFront += ambientColor;
		vColor *= vLightFront;

	#endif

	gl_Position = projectionMatrix * mvPosition;
}
