var TRN = {};

TRN.ObjectID = {
	"Lara" : 0
}

TRN.baseFrameRate = 30.0;

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
