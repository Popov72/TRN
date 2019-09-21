/*
	Read the raw level files (meaning the .phd / .tub / .tr2 / ... files)
	The result is a JSON tree with all data read
*/

TRN.gameFormatDescr = {};

TRN.Loader = {
	replaceColouredPolys : function(out, tile) {
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
	},

	unzip : function(ds, struct, dlength) {
		// unzip chunk of data
		//console.log(ds, struct, dlength);
		var arr = new Uint8Array(dlength);
		DataStream.memcpy(arr.buffer, 0, ds.buffer, ds.byteOffset+ds.position, dlength);
		var unzipped = pako.inflate(arr);

		// recreate a buffer and replace the compressed data with the uncompressed one
		var buf = new Uint8Array(ds.byteLength + unzipped.length - dlength), ofst = 0;
		var src = new Uint8Array(ds.buffer, 0, ds.byteOffset + ds.position);
		buf.set(src, ofst);
		ofst += src.length;
		buf.set(unzipped, ofst);
		ofst += unzipped.length;
		src = new Uint8Array(ds.buffer, ds.byteOffset + ds.position + dlength);
		buf.set(src, ofst);
		ds.buffer = buf.buffer.slice(buf.byteOffset, buf.byteLength + buf.byteOffset);
		buf = src = unzipped = arr = null;
	},

	loadRawLevel : function(data, fname) {
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

		try {
			var out = ds.readStruct(TRN.gameFormatDescr[rversionLoader].part1);

			//console.log('first part ok', out);

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

			//console.log('second part ok', out);
			
			var nextPart = ds.readStruct(TRN.gameFormatDescr[rversionLoader].part3);
			
			//console.log('third part ok', out);

			for (var attr in nextPart) {
				out[attr] = nextPart[attr]
			}
		} catch (e) {
			console.log('An error occurred while parsing the level! ds.failurePosition=', ds.failurePosition);
			console.log(ds);
			throw e;
		}

		// -------------------
		// --- post processing
		//console.log(out.numRoomTextiles, out.numObjTextiles, out.numBumpTextiles);

		var idx = fname.lastIndexOf('\\'), idx2 = fname.lastIndexOf('/');
		out.filename = fname.substring(1+Math.max(idx, idx2));
		out.shortfilename = fname.substring(0, fname.indexOf('.'));
		out.rversion = rversion;
		out.version = TRN.Helper.toHexString32(version);
		out.textile = [];
		out.animatedTexturesUVCount = out.animatedTexturesUVCount || 0;

		out.confMgr = new TRN.ConfigMgr(out.rversion);

		if (out.textile32misc != undefined) {
			out.textile32 = out.textile32.concat(out.textile32misc);
			delete out.textile32misc;
		}

		var numTotTextiles = 0;
		if (out.textile8 && !out.textile16) numTotTextiles += out.textile8.length;
		if (out.textile16) numTotTextiles += out.textile16.length;
		if (out.textile32) numTotTextiles += out.textile32.length;

		out.atlas = {
			width : 256,
			height : 256,
			make : true,
			imageData : null,
			numColPerRow : 4,
			curRow : 0,
			curCol : 0
		}

		if (out.atlas.make) {

			out.atlas.width = out.atlas.numColPerRow * 256;
			out.atlas.height = (Math.floor((numTotTextiles+1) / out.atlas.numColPerRow) + (((numTotTextiles+1) % out.atlas.numColPerRow) == 0 ? 0 : 1)) * 256;

			jQuery('body').append('<canvas id="TRN_alltextiles" width="' + out.atlas.width + '" height="' + out.atlas.height + '" style="border: 1px solid black;display:block"></canvas>');
			var canvas = jQuery('#TRN_alltextiles');
			var context = canvas[0].getContext('2d');
			
			out.atlas.imageData = context.createImageData(canvas[0].width, canvas[0].height);
		}

		// Handle 8-bit textures
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
						if (out.atlas.make) {
							out.atlas.imageData.data[(j+out.atlas.curRow*256)*4*out.atlas.width+(i+out.atlas.curCol*256)*4+0]=r;
							out.atlas.imageData.data[(j+out.atlas.curRow*256)*4*out.atlas.width+(i+out.atlas.curCol*256)*4+1]=g;
							out.atlas.imageData.data[(j+out.atlas.curRow*256)*4*out.atlas.width+(i+out.atlas.curCol*256)*4+2]=b;
							out.atlas.imageData.data[(j+out.atlas.curRow*256)*4*out.atlas.width+(i+out.atlas.curCol*256)*4+3]=a;
						}
					}
				}
				context.putImageData(imageData, 0, 0);
				out.textile[numTextiles] = canvas[0].toDataURL('image/png');
				canvas.remove();
				if (showTiles) {
					jQuery('body').append('<span onclick="TRN.Loader.saveData(\'' + out.shortfilename + '_tile' + numTextiles + '\',\'' + out.textile[numTextiles] + '\')">' +
						'<img alt="' + out.shortfilename + '_tile' + numTextiles + '.png" style="border:1px solid red" src="' + out.textile[numTextiles] + 
						'"/><span style="position:relative;left:-140px;top:-140px;background-color:white">' + numTextiles + '</span></span>');
				}
				if (out.atlas.make) {
					out.atlas.curCol++;
					if (out.atlas.curCol == out.atlas.numColPerRow) {
						out.atlas.curCol = 0;
						out.atlas.curRow++;
					}
				}
			}
		}

		// Handle 16-bit textures
		if (!out.textile16) out.textile16 = [];
		var newtile = TRN.Loader.replaceColouredPolys(out, numTotTextiles);
		if (newtile != undefined) out.textile16.push(newtile);

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
					if (out.atlas.make) {
						out.atlas.imageData.data[(j+out.atlas.curRow*256)*4*out.atlas.width+(i+out.atlas.curCol*256)*4+0]=r;
						out.atlas.imageData.data[(j+out.atlas.curRow*256)*4*out.atlas.width+(i+out.atlas.curCol*256)*4+1]=g;
						out.atlas.imageData.data[(j+out.atlas.curRow*256)*4*out.atlas.width+(i+out.atlas.curCol*256)*4+2]=b;
						out.atlas.imageData.data[(j+out.atlas.curRow*256)*4*out.atlas.width+(i+out.atlas.curCol*256)*4+3]=a;
					}
				}
			}
			context.putImageData(imageData, 0, 0);
			out.textile[numTextiles] = canvas[0].toDataURL('image/png');
			canvas.remove();
			if (showTiles) {
				jQuery('body').append('<span onclick="TRN.Loader.saveData(\'' + out.shortfilename + '_tile' + numTextiles + '\',\'' + out.textile[numTextiles] + '\')">' +
					'<img alt="' + out.shortfilename + '_tile' + numTextiles + '.png" style="border:1px solid red" src="' + out.textile[numTextiles] + 
					'"/><span style="position:relative;left:-140px;top:-140px;background-color:white">' + numTextiles + '</span></span>');
			}
			if (out.atlas.make) {
				out.atlas.curCol++;
				if (out.atlas.curCol == out.atlas.numColPerRow) {
					out.atlas.curCol = 0;
					out.atlas.curRow++;
				}
			}
		}

		// Handle 32-bit textures
		if (!out.textile32) out.textile32 = [];

		for (var t = 0; t < out.textile32.length; ++t, ++numTextiles) {
			jQuery('body').append('<canvas id="TRN_textile' + numTextiles + '" width="256" height="256" style="border: 1px solid black;display:block"></canvas>');
			var canvas = jQuery('#TRN_textile' + numTextiles);
			var context = canvas[0].getContext('2d');
			var imageData = context.createImageData(canvas[0].width, canvas[0].height);
			for (var j = 0; j < 256; ++j) {
				for (var i = 0; i < 256; ++i) {
					var pix = out.textile32[t][j*256+i];
					var a = ((pix & 0xff000000) >> 24) & 0xFF, r = (pix & 0x00ff0000) >> 16, g = (pix & 0x0000ff00) >> 8, b = (pix & 0x000000ff);
					imageData.data[j*256*4+i*4]=r;
					imageData.data[j*256*4+i*4+1]=g;
					imageData.data[j*256*4+i*4+2]=b;
					imageData.data[j*256*4+i*4+3]=a;
					if (out.atlas.make) {
						out.atlas.imageData.data[(j+out.atlas.curRow*256)*4*out.atlas.width+(i+out.atlas.curCol*256)*4+0]=r;
						out.atlas.imageData.data[(j+out.atlas.curRow*256)*4*out.atlas.width+(i+out.atlas.curCol*256)*4+1]=g;
						out.atlas.imageData.data[(j+out.atlas.curRow*256)*4*out.atlas.width+(i+out.atlas.curCol*256)*4+2]=b;
						out.atlas.imageData.data[(j+out.atlas.curRow*256)*4*out.atlas.width+(i+out.atlas.curCol*256)*4+3]=a;
					}
				}
			}
			context.putImageData(imageData, 0, 0);
			out.textile[numTextiles] = canvas[0].toDataURL('image/png');
			canvas.remove();
			if (showTiles) {
				jQuery('body').append('<span onclick="TRN.Loader.saveData(\'' + out.shortfilename + '_tile' + numTextiles + '\',\'' + out.textile[numTextiles] + '\')">' +
					'<img alt="' + out.shortfilename + '_tile' + numTextiles + '.png" style="border:1px solid red" src="' + out.textile[numTextiles] + 
					'"/><span style="position:relative;left:-140px;top:-140px;background-color:white">' + numTextiles + '</span></span>');
			}
			if (out.atlas.make) {
				out.atlas.curCol++;
				if (out.atlas.curCol == out.atlas.numColPerRow) {
					out.atlas.curCol = 0;
					out.atlas.curRow++;
				}
			}
		}

		if (out.atlas.make) {
			var canvas = jQuery('#TRN_alltextiles');
			var context = canvas[0].getContext('2d');

			var dataSky = out.textile[out.textile.length-1];

			context.putImageData(out.atlas.imageData, 0, 0);
			var data = canvas[0].toDataURL('image/png');
			out.textile = [data];
			canvas.remove();

			if (rversion == 'TR4') out.textile.push(dataSky); // the sky textile must always be the last of the out.textile array

			if (showTiles) {
				jQuery(document.body).css('overflow', 'auto');

				jQuery('body').append('<span onclick="TRN.Loader.saveData(\'' + out.shortfilename + '_atlas\',\'' + data + '\')">' +
					'<img title="' + canvas[0].width + 'x' + canvas[0].height + '" alt="' + out.shortfilename + '_atlas.png" style="border:1px solid red" src="' + data + '"/></span>');
			}

			for (var i = 0; i < out.objectTextures.length; ++i) {
				var objText = out.objectTextures[i];
				var tile = objText.tile & 0x7FFF, b16 = objText.tile & 0x8000;

				var row = Math.floor(tile / out.atlas.numColPerRow), col = tile - row * out.atlas.numColPerRow;

                objText.tile = 0 + b16;
                objText.origTile = tile;

				for (var j = 0; j < objText.vertices.length; ++j) {
					var vert = objText.vertices[j];

					vert.Xpixel = parseInt(vert.Xpixel) + col * 256;
					vert.Ypixel = parseInt(vert.Ypixel) + row * 256;
				}
			}
		}

		delete out.palette;
		delete out.textile8;
		delete out.textile16;
		delete out.textile32;

		TRN.Helper.flatten(out, 'rooms.roomData.rectangles.vertices');
		TRN.Helper.flatten(out, 'rooms.roomData.triangles.vertices');
		TRN.Helper.flatten(out, 'floorData');
		TRN.Helper.flatten(out, 'meshPointers');
		TRN.Helper.flatten(out, 'meshes.lights');
		TRN.Helper.flatten(out, 'meshes.texturedRectangles.vertices');
		TRN.Helper.flatten(out, 'meshes.texturedTriangles.vertices');
		TRN.Helper.flatten(out, 'meshes.colouredRectangles.vertices');
		TRN.Helper.flatten(out, 'meshes.colouredTriangles.vertices');
		TRN.Helper.flatten(out, 'frames');
		TRN.Helper.flatten(out, 'spr');
		TRN.Helper.flatten(out, 'overlaps');
		TRN.Helper.flatten(out, 'zones');
		TRN.Helper.flatten(out, 'animatedTextures');
		TRN.Helper.flatten(out, 'lightmap');
		TRN.Helper.flatten(out, 'tex');
		TRN.Helper.flatten(out, 'demoData');
		TRN.Helper.flatten(out, 'soundMap');
		TRN.Helper.flatten(out, 'sampleIndices');

		return { ok:(ds.position==ds.byteLength), json:out };
	},

	saveData : function(filename, data) {
	  var a = document.createElement('a');
	  a.setAttribute('href', data);
	  a.setAttribute('download', filename);
	  a.click();
	}
}
