TRN.gameFormatDescr = {};

function replaceColouredPolys(out, tile) {
	if (out.rversion == 'TR4') return;

    // Build a new textile from the color palette
 	var newTile = new Uint16Array(256*256);
 	var ofst = 0, lgn = 0;
	for (var c = 0; c < 256; ++c) {
		var color = out.rversion == 'TR1' ? out.palette[c] : out.palette16[c];
		if (out.rversion == 'TR1') 
			color = ((color.r >> 1) << 10) + ((color.g >> 1) << 5) + (color.b >> 1) + 0x8000;
		else
			color = ((color.r >> 3) << 10) + ((color.g >> 3) << 5) + (color.b >> 3) + 0x8000;
		for (var j = 0; j < 3; ++j) {
			for (var i = 0; i < 3; ++i) {
				newTile[lgn * 256 + ofst + i + j * 256] = color;
			}
		}
        ofst += 3;
        if (ofst + 3 >= 256) {
            ofst = 0;
            lgn += 3;
		}
	}

    // Build new objectTexture structures for the 256 colors of the palette
    // There are 2 new sets of 256 objectTexture structs: one for tris and one for quads
	var numObjText = out.numObjectTextures;	
	for (var j = 0; j < 2; ++j) {
 		var ofst = 0, lgn = 0;
 		for (var c = 0; c < 256; ++c) {
 			var objText = {
 				"attributes": 0,
				"tile": tile,
				"vertices": [
					{ "Xcoordinate":+1, "Xpixel":ofst,   "Ycoordinate":+1, "Ypixel":lgn },
					{ "Xcoordinate":-1, "Xpixel":ofst+2, "Ycoordinate":+1, "Ypixel":lgn },
					{ "Xcoordinate":-1, "Xpixel":ofst+2, "Ycoordinate":-1, "Ypixel":lgn+2 },
					{ "Xcoordinate":0,  "Xpixel":0,      "Ycoordinate":0,  "Ypixel":0 }
				]
 			};
 			if (j == 1) {
 				objText.vertices[3].Xcoordinate = +1;
 				objText.vertices[3].Xpixel = ofst;
 				objText.vertices[3].Ycoordinate = -1;
 				objText.vertices[3].Ypixel = lgn+2;
 			}
 			out.objectTextures.push(objText);
 			numObjText++;
	        ofst += 3;
	        if (ofst + 3 >= 256) {
	            ofst = 0;
	            lgn += 3;
			}
 		}
	}

	var skyRemovePolyStart = out.confMgr.levelNumber(out.shortfilename.toLowerCase(), 'sky > removepoly > start', true, 0);
	var skyRemovePolyNum   = out.confMgr.levelNumber(out.shortfilename.toLowerCase(), 'sky > removepoly > num', true, 0);
	if (skyRemovePolyNum > 0) {
		var skyId = out.confMgr.levelNumber(out.shortfilename.toLowerCase(), 'sky > objectid', true, 0);
		if (skyId) {
			for (var m = 0; m < out.moveables.length; ++m) {
				var moveable = out.moveables[m];
				if (moveable.objectID == skyId) {
					out.meshes[moveable.startingMesh].colouredTriangles.splice(skyRemovePolyStart, skyRemovePolyNum);
					break;
				}
			}
		}
	}

    // Process the meshes and replace colored polys by textured ones
    for (var m = 0; m < out.meshes.length; ++m) {
    	var mesh = out.meshes[m];

    	// coloured rectangles
		for (var i = 0; i < mesh.colouredRectangles.length; ++i) {
			var poly = mesh.colouredRectangles[i];
			var index = out.rversion == 'TR1' ? poly.texture & 0xFF : poly.texture >> 8;
			poly.texture = numObjText - 256 + index;
			mesh.texturedRectangles.push(poly);
		}
		mesh.colouredRectangles = [];
		mesh.numColouredRectangles = 0;

    	// coloured triangles
		for (var i = 0; i < mesh.colouredTriangles.length; ++i) {
			var poly = mesh.colouredTriangles[i];
			var index = out.rversion == 'TR1' ? poly.texture & 0xFF : poly.texture >> 8;
			poly.texture = numObjText - 512 + index;
			mesh.texturedTriangles.push(poly);
		}
		mesh.colouredTriangles = [];
		mesh.numColouredTriangles = 0;
    }

    return newTile;
}

function loadLevel(data, fname) {
	var ds = new DataStream(data);
	ds.endianness = DataStream.LITTLE_ENDIAN;

	var out = ds.readStruct([
		'version', 'uint32'
	]);

	var version = out.version;
	var rversion = 'Unknown';
	switch(version) {
		case 0x00000020: rversion = 'TR1'; break;
		case 0x0000002D: rversion = 'TR2'; break;
		case 0xFF080038: rversion = 'TR3'; break;
		case 0xFF180034: rversion = 'TR3'; break;
		case 0xFF180038: rversion = 'TR3'; break;
		case 0x00345254: rversion = 'TR4'; break;
	}
	ds.seek(0);

	var rversionLoader = rversion;
	if (fname.toLowerCase().indexOf('.tub') >= 0) {
		rversionLoader = 'TR1TUB';
	}

	var out = ds.readStruct(TRN.gameFormatDescr[rversionLoader].part1);

	var savepos = ds.position;
	ds.position += out.numMeshData*2;

	out.numMeshPointers = ds.readUint32();
	out.meshPointers = ds.readUint32Array(out.numMeshPointers);
	out.meshes = [];

	var savepos2 = ds.position;
	for (var m = 0; m < out.numMeshPointers; ++m) {
		ds.position = savepos + out.meshPointers[m];

		var mesh = ds.readStruct(TRN.gameFormatDescr[rversionLoader].part2);
		
		out.meshes[m] = mesh;
		out.meshes[m].dummy = out.meshPointers[m] == 0;
		//if (out.meshPointers[m] == 0) console.log(mesh)
	}
	
	ds.position = savepos2;
	
	var nextPart = ds.readStruct(TRN.gameFormatDescr[rversionLoader].part3);
	
	for (var attr in nextPart) {
		out[attr] = nextPart[attr]
	}

	// -------------------
	// --- post processing
	
	out.filename = fname;
	out.shortfilename = fname.substring(0, fname.indexOf('.'));
	out.rversion = rversion;
	out.version = TRN.toHexString32(version);
	out.textile = [];

	out.confMgr = new TRN.ConfigMgr(out.rversion);

	var numTotTextiles = 0;
	if (out.textile8 && !out.textile16) numTotTextiles += out.textile8.length;
	if (out.textile16) numTotTextiles += out.textile16.length;

	var numTextiles = 0;
	if (out.textile8 && !out.textile16) {
		for (var t = 0; t < out.textile8.length; ++t, ++numTextiles) {
			jQuery('body').append('<canvas id="TRN_textile' + numTextiles + '" width="256" height="256" style="border: 1px solid black;display:block"></canvas>');
			var canvas = jQuery('#TRN_textile' + numTextiles);
			var context = canvas[0].getContext('2d');
			var imageData = context.createImageData(canvas[0].width, canvas[0].height);
			for (var j = 0; j < 256; ++j) {
				for (var i = 0; i < 256; ++i) {
					var pix = out.textile8[t][j*256+i];
					var a = pix ? 0xFF : 0x00, r = out.palette[pix].r << 2, g = out.palette[pix].g << 2, b = out.palette[pix].b << 2;
					imageData.data[j*256*4+i*4+0]=r;
					imageData.data[j*256*4+i*4+1]=g;
					imageData.data[j*256*4+i*4+2]=b;
					imageData.data[j*256*4+i*4+3]=a;
				}
			}
			context.putImageData(imageData, 0, 0);
			out.textile[numTextiles] = canvas[0].toDataURL('image/png');
			canvas.remove();
			if (showTiles) {
				jQuery('body').append('<span onclick="saveData(\'' + out.shortfilename + '_tile' + numTextiles + '\',\'' + out.textile[numTextiles] + '\')">' +
					'<img alt="' + out.shortfilename + '_tile' + numTextiles + '.png" style="border:1px solid red" src="' + out.textile[numTextiles] + 
					'"/><span style="position:relative;left:-140px;top:-140px;background-color:white">' + numTextiles + '</span></span>');
			}
		}
	}

	if (!out.textile16) out.textile16 = [];
	out.textile16.push(replaceColouredPolys(out, numTotTextiles));

	for (var t = 0; t < out.textile16.length; ++t, ++numTextiles) {
		jQuery('body').append('<canvas id="TRN_textile' + numTextiles + '" width="256" height="256" style="border: 1px solid black;display:block"></canvas>');
		var canvas = jQuery('#TRN_textile' + numTextiles);
		var context = canvas[0].getContext('2d');
		var imageData = context.createImageData(canvas[0].width, canvas[0].height);
		for (var j = 0; j < 256; ++j) {
			for (var i = 0; i < 256; ++i) {
				var pix = out.textile16[t][j*256+i];
				var a = pix & 0x8000, r = ((pix & 0x7c00) >> 10) << 3, g = ((pix & 0x03e0) >> 5) << 3, b = (pix & 0x001f) << 3;
				if (a) a = 0xFF;
				imageData.data[j*256*4+i*4+0]=r;
				imageData.data[j*256*4+i*4+1]=g;
				imageData.data[j*256*4+i*4+2]=b;
				imageData.data[j*256*4+i*4+3]=a;
			}
		}
		context.putImageData(imageData, 0, 0);
		out.textile[numTextiles] = canvas[0].toDataURL('image/png');
		canvas.remove();
		if (showTiles) {
			jQuery('body').append('<span onclick="saveData(\'' + out.shortfilename + '_tile' + numTextiles + '\',\'' + out.textile[numTextiles] + '\')">' +
				'<img alt="' + out.shortfilename + '_tile' + numTextiles + '.png" style="border:1px solid red" src="' + out.textile[numTextiles] + 
				'"/><span style="position:relative;left:-140px;top:-140px;background-color:white">' + numTextiles + '</span></span>');
		}
	}

	delete out.palette;
	delete out.textile8;
	delete out.textile16;

	TRN.flatten(out, 'rooms.roomData.rectangles.vertices');
	TRN.flatten(out, 'rooms.roomData.triangles.vertices');
	TRN.flatten(out, 'floorData');
	TRN.flatten(out, 'meshPointers');
	TRN.flatten(out, 'meshes.lights');
	TRN.flatten(out, 'meshes.texturedRectangles.vertices');
	TRN.flatten(out, 'meshes.texturedTriangles.vertices');
	TRN.flatten(out, 'meshes.colouredRectangles.vertices');
	TRN.flatten(out, 'meshes.colouredTriangles.vertices');
	TRN.flatten(out, 'frames');
	TRN.flatten(out, 'overlaps');
	TRN.flatten(out, 'zones');
	TRN.flatten(out, 'animatedTextures');
	TRN.flatten(out, 'lightmap');
	TRN.flatten(out, 'demoData');
	TRN.flatten(out, 'soundMap');
	TRN.flatten(out, 'sampleIndices');

	return { ok:(ds.position==ds.byteLength), json:out };
}

function saveData(filename, data) {
  var a = document.createElement('a');
  a.setAttribute('href', data);
  a.setAttribute('download', filename);
  a.click();
};
