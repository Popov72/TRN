#define WORD_SCALE ##world_scale##

#define NUM_DIRLIGHTS 		##num_dir_lights##
#define NUM_POINTLIGHTS 	##num_point_lights##
#define NUM_SPOTLIGHTS 	    ##num_spot_lights##
#define TR_VERSION			##tr_version##

#define saturate(a) clamp( a, 0.0, 1.0 )

uniform vec3 	tintColor;
uniform vec3 	flickerColor;
uniform float 	curTime;
uniform vec4 	offsetRepeat;
uniform float 	rnd;
uniform float 	lighting; /* not used */

uniform vec3 	ambientColor;

attribute vec4 _flags;

varying vec2 vUv;
varying vec3 vColor;

const vec3 vec3Unit = vec3(1.0, 1.0, 1.0);

uniform mat4 boneGlobalMatrices[ 64 ];

	uniform mat4 boneMatrices[ 64 ];
mat4 getBoneMatrix( const in float i ) {
		mat4 bone = boneMatrices[ int(i) ];
	return bone;
}

struct IncidentLight {
	vec3 color;
	vec3 direction;
};

struct GeometricContext {
	vec3 position;
	vec3 normal;
	/*vec3 viewDir;*/
};

vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}

float punctualLightIntensityToIrradianceFactor( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	if ( cutoffDistance > 0.0 && decayExponent > 0.0 ) {
		return pow( saturate( -lightDistance / cutoffDistance + 1.0 ), decayExponent );
	}
	return 1.0;
}

#if NUM_DIRLIGHTS > 0
	uniform vec3 directionalLight_direction[NUM_DIRLIGHTS];
	uniform vec3 directionalLight_color[NUM_DIRLIGHTS];
	void getDirectionalDirectLightIrradiance( in int directionalLight, const in GeometricContext geometry, out IncidentLight directLight ) {
		directLight.color = directionalLight_color[directionalLight];
		directLight.direction = transformDirection(directionalLight_direction[directionalLight], viewMatrix);
	}
#endif

#if NUM_POINTLIGHTS > 0
	uniform vec3 pointLight_position[NUM_POINTLIGHTS];
	uniform vec3 pointLight_color[NUM_POINTLIGHTS];
	uniform float pointLight_distance[NUM_POINTLIGHTS];
	void getPointDirectLightIrradiance( in int pointLight, const in GeometricContext geometry, out IncidentLight directLight ) {
		vec3 lVector = (viewMatrix*vec4(pointLight_position[pointLight], 1.0)).xyz - geometry.position;
		directLight.direction = normalize( lVector );
		float lightDistance = length( lVector );
		directLight.color = pointLight_color[pointLight];
		#if TR_VERSION < 4
			directLight.color *= min(pointLight_distance[pointLight] / lightDistance, 1.0);
		#else
			directLight.color *= punctualLightIntensityToIrradianceFactor( lightDistance, pointLight_distance[pointLight], 1.0/*pointLight.decay*/ );
		#endif
	}
#endif

#if NUM_SPOTLIGHTS > 0
	uniform vec3 spotLight_position[NUM_SPOTLIGHTS];
	uniform vec3 spotLight_color[NUM_SPOTLIGHTS];
	uniform float spotLight_distance[NUM_SPOTLIGHTS];
	uniform vec3 spotLight_direction[NUM_SPOTLIGHTS];
	uniform float spotLight_coneCos[NUM_SPOTLIGHTS];
	uniform float spotLight_penumbraCos[NUM_SPOTLIGHTS];
	void getSpotDirectLightIrradiance( in int spotLight, const in GeometricContext geometry, out IncidentLight directLight  ) {
		vec3 lVector = (viewMatrix*vec4(spotLight_position[spotLight], 1.0)).xyz - geometry.position;
		directLight.direction = normalize( lVector );
		float lightDistance = length( lVector );
		float angleCos = dot( directLight.direction, transformDirection(spotLight_direction[spotLight], viewMatrix) );
		if ( angleCos > spotLight_coneCos[spotLight] ) {
			float spotEffect = smoothstep( spotLight_coneCos[spotLight], spotLight_penumbraCos[spotLight], angleCos );
			directLight.color = spotLight_color[spotLight];
			directLight.color *= spotEffect * punctualLightIntensityToIrradianceFactor( lightDistance, spotLight_distance[spotLight], 1.0/*spotLight.decay*/ );
			//directLight.color *= spotEffect * min(spotLight_distance[spotLight] / lightDistance, 1.0);
		} else {
			directLight.color = vec3( 0.0 );
		}
	}
#endif

void main() {
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );

	vec4 skinVertex = vec4( position, 1.0 );
	vec4 skinned  = boneMatX * skinVertex * skinWeight.x;
		 skinned += boneMatY * skinVertex * skinWeight.y;

	vUv = uv * offsetRepeat.zw + offsetRepeat.xy;

	vColor = tintColor * mix(vec3Unit, flickerColor, step(0.5, rnd));

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

	mat4 skinMatrix  = skinWeight.x * boneMatX;
		 skinMatrix	+= skinWeight.y * boneMatY;

	vec4 skinnedNormal = skinMatrix * vec4( normal, 0.0 );

	vec3 objectNormal = skinnedNormal.xyz;

	vec3 transformedNormal = normalMatrix * objectNormal;

	transformedNormal = normalize( transformedNormal );

	vec3 vLightFront = vec3( 0.0 );

	GeometricContext geometry;

	geometry.position = mvPosition.xyz;
	geometry.normal = transformedNormal;
	/*geometry.viewDir = normalize( -mvPosition.xyz );*/

	IncidentLight directLight;
	vec3 directLightColor_Diffuse;
	float dotNL;

	#if NUM_DIRLIGHTS > 0
		for ( int i = 0; i < NUM_DIRLIGHTS; i ++ ) {
			getDirectionalDirectLightIrradiance( i, geometry, directLight );
			dotNL = dot( geometry.normal, directLight.direction );
			vLightFront += saturate( dotNL ) * directLight.color;
		}
	#endif

	#if NUM_POINTLIGHTS > 0
		for ( int i = 0; i < NUM_POINTLIGHTS; i ++ ) {
			getPointDirectLightIrradiance( i, geometry, directLight );
			dotNL = dot( geometry.normal, directLight.direction );
			#if TR_VERSION < 4
				dotNL = (dotNL + 1.0) / 2.0;
			#endif
			vLightFront += saturate( dotNL ) * directLight.color;
		}
	#endif

	#if NUM_SPOTLIGHTS > 0
		for ( int i = 0; i < NUM_SPOTLIGHTS; i ++ ) {
			getSpotDirectLightIrradiance( i, geometry, directLight );
			dotNL = dot( geometry.normal, directLight.direction );
			vLightFront += saturate( dotNL ) * directLight.color;
		}
	#endif

	vLightFront += ambientColor;
	vColor *= vLightFront;

	gl_Position = projectionMatrix * mvPosition;
}
