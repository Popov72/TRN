var TRN = {};

TRN.ObjectID = {
	"Lara" : 0,
    "Ponytail" : 2,
    "LaraJoints" : 9
};

TRN.Consts = {
    "worldScale" : 1.0/*/512*/ ,
	"objNameForPistolAnim" : "pistolanim",
	"leftThighIndex" : 0,
	"rightThighIndex" : 0,
	"leftHandIndex" : 0,
	"rightHandIndex" : 0,
	"uvRotateTileHeight" : 64,
	"moveableScrollAnimTileHeight" : 128
};

TRN.baseFrameRate = 30.0;

if (typeof(THREE) != "undefined") {

// replaces the loadTexture in three js by our own one =>  url can be something like data:XXX and not only a real url
THREE.ImageUtils.loadTexture = function ( url, mapping, onLoad, onError ) {

	var image = new Image();
	var texture = new THREE.Texture( image, mapping );

	var loader = new THREE.ImageLoader();

	loader.addEventListener( 'load', function ( event ) {

		texture.image = event.content;
		texture.needsUpdate = true;

		if ( onLoad ) onLoad( texture );

	} );

	loader.addEventListener( 'error', function ( event ) {

		if ( onError ) onError( event.message );

	} );

	var isRawData = url.substr(0, 5) == 'data:';

	if (!isRawData) {
		loader.crossOrigin = this.crossOrigin;
		texture.sourceFile = url;
	} else {
		texture.sourceFile = '';
	}

	loader.load( url, image );

	return texture;

};

// replaces this function in three js => it takes into account the sphere center
THREE.Frustum.prototype.intersectsObject = function () {

	var center = new THREE.Vector3();

	return function ( object ) {

		// this method is expanded inlined for performance reasons.

		var matrix = object.matrixWorld;
		var planes = this.planes;
		var negRadius = - object.geometry.boundingSphere.radius * matrix.getMaxScaleOnAxis();

		//center.getPositionFromMatrix( matrix );
		center.copy(object.geometry.boundingSphere.center);
		center.applyMatrix4(matrix);

		for ( var i = 0; i < 6; i ++ ) {

			var distance = planes[ i ].distanceToPoint( center );

			if ( distance < negRadius ) {

				return false;

			}

		}

		return true;

	};

}();

}

// stolen from threejs !
TRN.extend = function ( obj, source ) {

	if ( Object.keys ) {

		var keys = Object.keys( source );

		for (var i = 0, il = keys.length; i < il; i++) {

			var prop = keys[i];
			Object.defineProperty( obj, prop, Object.getOwnPropertyDescriptor( source, prop ) );

		}

	} else {

		var safeHasOwnProperty = {}.hasOwnProperty;

		for ( var prop in source ) {

			if ( safeHasOwnProperty.call( source, prop ) ) {

				obj[prop] = source[prop];

			}

		}

	}

	return obj;

};
