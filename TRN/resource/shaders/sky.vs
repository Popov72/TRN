varying vec2 vUv;

#define BONE_TEXTURE

#ifdef BONE_TEXTURE

    uniform highp sampler2D boneTexture;
    uniform int boneTextureSize;

    mat4 getBoneMatrix( const in float i ) {

        float j = i * 4.0;
        float x = mod( j, float( boneTextureSize ) );
        float y = floor( j / float( boneTextureSize ) );

        float dx = 1.0 / float( boneTextureSize );
        float dy = 1.0 / float( boneTextureSize );

        y = dy * ( y + 0.5 );

        vec4 v1 = texture2D( boneTexture, vec2( dx * ( x + 0.5 ), y ) );
        vec4 v2 = texture2D( boneTexture, vec2( dx * ( x + 1.5 ), y ) );
        vec4 v3 = texture2D( boneTexture, vec2( dx * ( x + 2.5 ), y ) );
        vec4 v4 = texture2D( boneTexture, vec2( dx * ( x + 3.5 ), y ) );

        mat4 bone = mat4( v1, v2, v3, v4 );

        return bone;

    }

#else
	uniform mat4 boneMatrices[ 64 ];
	mat4 getBoneMatrix( const in float i ) {
		mat4 bone = boneMatrices[ int(i) ];
		return bone;
	}
#endif

void main() {
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );

	vec4 skinVertex = vec4( position, 1.0 );
	vec4 skinned  = boneMatX * skinVertex * skinWeight.x
	 	          + boneMatY * skinVertex * skinWeight.y;

	vUv = uv;

	gl_Position = projectionMatrix * modelViewMatrix * skinned;
}
