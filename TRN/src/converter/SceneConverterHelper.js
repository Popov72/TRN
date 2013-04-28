TRN.extend(TRN.LevelConverter.prototype, {

	createNewJSONEmbed : function () {
		return {
			"metadata" : {
				"formatVersion" : 3
			},
			"scale" : 1.0,
			"materials": [],
			"vertices": [],
			"morphTargets": [],
			"normals": [],
			"colors": [],
			"uvs": [[]],
			"faces": []
		};
	},

	convertIntensity : function(intensity) {
		var l = intensity/8192.0;

		if (this.trlevel.rversion == 'TR3' || this.trlevel.rversion == 'TR4') {
			var b = ((intensity & 0x7C00) >> 10) << 3, g = ((intensity & 0x03E0) >> 5) << 3, r = (intensity & 0x001F) << 3;
			l = new THREE.Vector3(r/255, g/255, b/255);
		}

		return l;
	},

	makeFace : function (obj, vertices, isQuad, tiles2material, texture, tex, ofstvert, mapObjTexture2AnimTexture, fidx) {
		obj.faces.push(isQuad ? 139 : 138); // 1=quad / 2=has material / 8=has vertex uv / 128=has vertex color

		// vertex indices
		for (var v = 0; v < vertices.length; ++v) {
			obj.faces.push(vertices[fidx(v)] + ofstvert);
		}

		// material
		var imat, anmTexture = false, alpha = tex.attributes & 2 ? 'alpha' : '';
		if (mapObjTexture2AnimTexture && mapObjTexture2AnimTexture[texture]) {
			var animTexture = mapObjTexture2AnimTexture[texture];
			var matName = 'anmtext' + alpha + '_' + animTexture.idxAnimatedTexture + '_' + animTexture.pos;
			imat = tiles2material[matName];
			if (typeof(imat) == 'undefined') {
				imat = TRN.objSize(tiles2material);
				tiles2material[matName] = imat;
			}
			anmTexture = true;
		} else if (tex.attributes & 2) {
			imat = tiles2material['alpha' + tex.tile];
			if (typeof(imat) == 'undefined') {
				imat = TRN.objSize(tiles2material);
				tiles2material['alpha' + tex.tile] = imat;
			}
		} else {
			imat = tiles2material[tex.tile];
			if (typeof(imat) == 'undefined') {
				imat = TRN.objSize(tiles2material);
				tiles2material[tex.tile] = imat;
			}
		}
		obj.faces.push(imat); // index of material

		// texture coords
		var minU = 0, minV = 0;
		if (anmTexture) {
			minU = minV = 1;
			for (var tv = 0; tv < vertices.length; ++tv) {
				var u = (tex.vertices[fidx(tv)].Xpixel + 0.5) / 256.0;
				var v = (tex.vertices[fidx(tv)].Ypixel + 0.5) / 256.0;
				if (minU > u) minU = u;
				if (minV > v) minV = v;
			}
		}
		var numUVs = parseInt(obj.uvs[0].length / 2);
		for (var tv = 0; tv < vertices.length; ++tv) {
			obj.faces.push(numUVs++);
			var u = (tex.vertices[fidx(tv)].Xpixel + 0.5) / 256.0;
			var v = (tex.vertices[fidx(tv)].Ypixel + 0.5) / 256.0;
			obj.uvs[0].push(u - minU, v - minV);
		}

		// vertex colors
		for (var v = 0; v < vertices.length; ++v) {
			obj.faces.push(vertices[fidx(v)] + ofstvert);
		}
	},

	makeFaces : function (obj, facearrays, tiles2material, objectTextures, mapObjTexture2AnimTexture, ofstvert) {
		for (var a = 0; a < facearrays.length; ++a) {
			var lstface = facearrays[a];
			for (var i = 0; i < lstface.length; ++i) {
				var o = lstface[i];
				var vertices = o.vertices, texture = o.texture & 0x7FFF, twoSided = (o.texture & 0x8000) != 0, tex = objectTextures[texture];
				var isQuad = vertices.length == 4;
				this.makeFace(obj, vertices, isQuad, tiles2material, texture, tex, ofstvert, mapObjTexture2AnimTexture, function(idx) { return vertices.length-1-idx; });
				if (twoSided) {
					this.makeFace(obj, vertices, isQuad, tiles2material, texture, tex, ofstvert, mapObjTexture2AnimTexture, function(idx) { return idx; });
				}
			}
		}
	},

	makeMeshGeometry : function (mesh, meshnum, meshJSON, tiles2material, objectTextures, mapObjTexture2AnimTexture, ofstvert, attributes, skinidx, skinIndices, skinWeights) {
		var internallyLit = mesh.lights.length > 0;

		// push the vertices + vertex colors of the mesh
		for (var v = 0; v < mesh.vertices.length; ++v) {
			var vertex = mesh.vertices[v], lighting = internallyLit ? 1.0 - mesh.lights[v]/8192.0 : 1.0;

			var vcolor = parseInt(lighting*255);

			meshJSON.vertices.push(vertex.x, -vertex.y, -vertex.z);
			meshJSON.colors.push(vcolor + (vcolor << 8) + (vcolor << 16)); 	// not used => a specific calculation is done in the vertex shader 
																			// with the constant lighting for the mesh + the lighting at each vertex (passed to the shader via flags.z)

			if (attributes)  attributes.flags.value.push(new THREE.Vector4(0, 0, 0, lighting));
			if (skinIndices) skinIndices.push(skinidx, skinidx);
			if (skinWeights) skinWeights.push(1.0, 1.0);
		}

		this.makeFaces(meshJSON, [mesh.texturedRectangles, mesh.texturedTriangles], tiles2material, objectTextures, mapObjTexture2AnimTexture, ofstvert);

		return internallyLit;
	},

	makeMaterialList : function (tiles2material, attributes, matname, numLights) {
		if (!matname) matname = 'room';
		var lstMat = [];
		for (var tile in tiles2material) {
			var imat = tiles2material[tile];
			var isAnimText = tile.substr(0, 7) == 'anmtext';
			var isAlphaText = tile.substr(0, 5) == 'alpha';
			if (isAlphaText) tile = tile.substr(5);
			lstMat[imat] = {
				"material": this.getMaterial(matname, numLights),
				"attributes": attributes,
				"userData": {},
			};
			if (isAnimText) {
				isAlphaText = tile.substr(7, 5) == 'alpha';
				lstMat[imat].userData.animatedTexture = {
					"idxAnimatedTexture": parseInt(tile.split('_')[1]),
					"pos": parseInt(tile.split('_')[2])
				};
			} else {
				lstMat[imat].uniforms = {
					"map": { type: "t", value: "texture" + tile }
				};
			}
			lstMat[imat].hasAlpha = isAlphaText;

		}
		return lstMat;
	},

	findStatichMeshByID : function (objectID) {
		var gstaticMesh = null;
		for (var sg = 0; sg < this.trlevel.staticMeshes.length; ++sg) {
			if (this.trlevel.staticMeshes[sg].objectID == objectID) {
				return this.trlevel.staticMeshes[sg];
			}
		}
		return null;
	}

});

