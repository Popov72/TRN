TRN.extend(TRN.SceneConverter.prototype, {

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

	getMaterial : function (objType, numLights) {
		var matName = '';
		if (typeof(numLights) == 'undefined') numLights = -1;

		switch(objType) {
			case 'room':
				matName = 'TR_room';
				if (!this.sc.materials[matName]) {
					this.sc.materials[matName] = {
						"type": "ShaderMaterial",
						"parameters": {
							"uniforms": {
								"map": { type: "t", value: "" },
								"ambientColor": { type: "v3", value: new THREE.Vector3(1.0, 1.0, 1.0) },
								"tintColor": { type: "v3", value: new THREE.Vector3(1.0, 1.0, 1.0) },
								"flickerColor": { type: "v3", value: new THREE.Vector3(1.2, 1.2, 1.2) },
								"curTime": { type: "f", value: 0.0 },
								"rnd": { type: "f", value: 0.0 },
								"offsetRepeat": { type: "v4", value: new THREE.Vector4(0.0, 0.0, 1.0, 1.0) }
							},
							"vertexShader": this.shaderMgr.getVertexShader('room'),
							"fragmentShader": this.sc.defaults.fog ? this.shaderMgr.getFragmentShader('standard_fog') : this.shaderMgr.getFragmentShader('standard'),
							"vertexColors" : true
						}
					};
				}
				break;
			case 'roombump':
				matName = 'TR_roombump';
				if (!this.sc.materials[matName]) {
					this.sc.materials[matName] = {
						"type": "ShaderMaterial",
						"parameters": {
							"uniforms": {
								"map": { type: "t", value: "" },
								"mapBump": { type: "t", value: "" },
								"ambientColor": { type: "v3", value: new THREE.Vector3(1.0, 1.0, 1.0) },
								"tintColor": { type: "v3", value: new THREE.Vector3(1.0, 1.0, 1.0) },
								"flickerColor": { type: "v3", value: new THREE.Vector3(1.2, 1.2, 1.2) },
								"curTime": { type: "f", value: 0.0 },
								"rnd": { type: "f", value: 0.0 },
								"offsetRepeat": { type: "v4", value: new THREE.Vector4(0.0, 0.0, 1.0, 1.0) }
							},
							"vertexShader": this.shaderMgr.getVertexShader('room'),
							"fragmentShader": this.sc.defaults.fog ? this.shaderMgr.getFragmentShader('standard_fog') : this.shaderMgr.getFragmentShader('room_bump'),
							"vertexColors" : true
						}
					};
				}
				break;
			case 'mesh':
				matName = 'TR_mesh';
				if (!this.sc.materials[matName]) {
					this.sc.materials[matName] = {
						"type": "ShaderMaterial",
						"parameters": {
							"uniforms": {
								"map": { type: "t", value: "" },
								"ambientColor": { type: "v3", value: new THREE.Vector3(1.0, 1.0, 1.0) },
								"tintColor": { type: "v3", value: new THREE.Vector3(1.0, 1.0, 1.0) },
								"flickerColor": { type: "v3", value: new THREE.Vector3(1.2, 1.2, 1.2) },
								"curTime": { type: "f", value: 0.0 },
								"rnd": { type: "f", value: 0.0 },
								"offsetRepeat": { type: "v4", value: new THREE.Vector4(0.0, 0.0, 1.0, 1.0) },
								"lighting": { type: "f", value: 0.0 }
							},
							"vertexShader": this.trlevel.rversion == 'TR3' || this.trlevel.rversion == 'TR4' ? this.shaderMgr.getVertexShader('mesh2') : this.shaderMgr.getVertexShader('mesh'),
							"fragmentShader": this.sc.defaults.fog ? this.shaderMgr.getFragmentShader('standard_fog') : this.shaderMgr.getFragmentShader('standard'),
							"vertexColors" : true
						}
					};
				}				
				break;
			case 'moveable':
				matName = 'TR_moveable' + (numLights >= 0 ? '_l' + numLights : '');
				if (!this.sc.materials[matName]) {
					var vertexShader;

					if (numLights >= 0) {
						vertexShader = this.shaderMgr.getVertexShader('moveable_with_lights');
						vertexShader = vertexShader.replace(/##num_lights##/g, numLights);
					} else {
						vertexShader = this.shaderMgr.getVertexShader('moveable');
					}
					this.sc.materials[matName] = {
						"type": "ShaderMaterial",
						"parameters": {
							"uniforms": {
								"map": { type: "t", value: "" },
								"ambientColor": { type: "v3", value: new THREE.Vector3(1.0, 1.0, 1.0) },
								"tintColor": { type: "v3", value: new THREE.Vector3(1.0, 1.0, 1.0) },
								"flickerColor": { type: "v3", value: new THREE.Vector3(1.2, 1.2, 1.2) },
								"curTime": { type: "f", value: 0.0 },
								"rnd": { type: "f", value: 0.0 },
								"offsetRepeat": { type: "v4", value: new THREE.Vector4(0.0, 0.0, 1.0, 1.0) },
								"lighting": { type: "f", value: 0.0 }
							},
							"vertexShader": vertexShader,
							"fragmentShader": this.sc.defaults.fog ? this.shaderMgr.getFragmentShader('standard_fog') : this.shaderMgr.getFragmentShader('standard'),
							"vertexColors" : true,
							"skinning": true
						}
					};
				}
				break;
			case 'skydome':
				matName = 'TR_SkyDome';
				if (!this.sc.materials[matName]) {
					this.sc.materials[matName] = {
						"type": "ShaderMaterial",
						"parameters": {
							"uniforms": {
								"map": { type: "t", value: "" },
								"tintColor": { type: "v3", value: new THREE.Vector3(1.0, 1.0, 1.0) },
							},
							"vertexShader": this.shaderMgr.getVertexShader('skydome'),
							"fragmentShader": this.shaderMgr.getFragmentShader('skydome'),
							"vertexColors" : false
						}
					};
				}				
				break;
		}

		return matName;
	},

	convertIntensity : function(intensity) {
		var l = intensity/8192.0;

		if (this.trlevel.rversion == 'TR3' || this.trlevel.rversion == 'TR4') {
			var b = ((intensity & 0x7C00) >> 10) << 3, g = ((intensity & 0x03E0) >> 5) << 3, r = (intensity & 0x001F) << 3;
			l = new THREE.Vector3(r/255, g/255, b/255);
		}

		return l;
	},

	getBoundingBox : function(vertices) {
		var xmin = ymin = zmin = 1e20;
		var xmax = ymax = zmax = -1e20;
		for (var i = 0; i < vertices.length; ++i) {
			var vertex = vertices[i].vertex;
			if (xmin > vertex.x) xmin = vertex.x;
			if (xmax < vertex.x) xmax = vertex.x;
			if (ymin > vertex.y) ymin = vertex.y;
			if (ymax < vertex.y) ymax = vertex.y;
			if (zmin > vertex.z) zmin = vertex.z;
			if (zmax < vertex.z) zmax = vertex.z;
		}
		return [xmin,xmax,ymin,ymax,zmin,zmax];
	},

	processRoomVertex : function(rvertex, isFilledWithWater, isFlickering) {
		var vertex = rvertex.vertex, attribute = rvertex.attributes;
		var lighting = 0;

		switch(this.trlevel.rversion) {
			case 'TR1':
				lighting = Math.floor((1.0-rvertex.lighting1/8192.)*2*256);
				if (lighting > 255) lighting = 255;
				var r = lighting, g = lighting, b = lighting;
				lighting = b + (g << 8) + (r << 16);
				break;
			case 'TR2':
				lighting = Math.floor((1.0-rvertex.lighting2/8192.)*2*256);
				if (lighting > 255) lighting = 255;
				var r = lighting, g = lighting, b = lighting;
				lighting = b + (g << 8) + (r << 16);
				break;
			default:
				lighting = rvertex.lighting2;
				var r = (lighting & 0x7C00) >> 10, g = (lighting & 0x03E0) >> 5, b = (lighting & 0x001F);
				lighting = (b << 3) + (g << 11) + (r << 19);
				break;
		}

		var moveLight = (attribute & 0x4000) ? 1 : 0;
		var moveVertex = (attribute & 0x2000) ? 1 : 0;
		var strengthEffect = ((attribute & 0x1E)-16)/16;

		if (moveVertex) moveLight = 1;
		if ((this.trlevel.rversion == 'TR1' || this.trlevel.rversion == 'TR2') && isFilledWithWater) moveLight = 1;
		if ((this.trlevel.rversion == 'TR1' || this.trlevel.rversion == 'TR2' || this.trlevel.rversion == 'TR3') && isFilledWithWater && (attribute & 0x8000) == 0) moveVertex = 1;

		return {
			x: vertex.x, y: -vertex.y, z: -vertex.z,
			flag: new THREE.Vector4(moveLight, isFlickering && strengthEffect ? 1 : 0, moveVertex, -strengthEffect),
			color: lighting
		};
	},

	makeFace : function (obj, oface, tiles2material, tex, ofstvert, mapObjTexture2AnimTexture, fidx) {
		var vertices = oface.vertices, texture = oface.texture & 0x7FFF, isQuad = vertices.length == 4, tile = tex.tile & 0x7FFF;

		obj.faces.push(isQuad ? 139 : 138); // 1=quad / 2=has material / 8=has vertex uv / 128=has vertex color

		// vertex indices
		for (var v = 0; v < vertices.length; ++v) {
			obj.faces.push(vertices[fidx(v)] + ofstvert);
		}

		// material
		var imat, anmTexture = false, alpha = (tex.attributes & 2 || oface.effects & 1) ? 'alpha' : '';
		if (mapObjTexture2AnimTexture && mapObjTexture2AnimTexture[texture]) {
			var animTexture = mapObjTexture2AnimTexture[texture];
			var matName = 'anmtext' + alpha + '_' + animTexture.idxAnimatedTexture + '_' + animTexture.pos;
			imat = tiles2material[matName];
			if (typeof(imat) == 'undefined') {
				imat = TRN.Helper.objSize(tiles2material);
				tiles2material[matName] = imat;
			}
			anmTexture = true;
		} else if (alpha) {
			imat = tiles2material['alpha' + tile];
			if (typeof(imat) == 'undefined') {
				imat = TRN.Helper.objSize(tiles2material);
				tiles2material['alpha' + tile] = imat;
			}
		} else {
			imat = tiles2material[tile];
			if (typeof(imat) == 'undefined') {
				imat = TRN.Helper.objSize(tiles2material);
				tiles2material[tile] = imat;
			}
		}
		obj.faces.push(imat); // index of material

		// texture coords
		var isAnimatedObject = obj.objHasScrollAnim;

		var minU = 0, minV = 0, maxV = 0;
		if (anmTexture || isAnimatedObject) {
			minU = minV = 1;
			for (var tv = 0; tv < vertices.length; ++tv) {
				var u = (tex.vertices[fidx(tv)].Xpixel + 0.5) / this.trlevel.atlas.width;
				var v = (tex.vertices[fidx(tv)].Ypixel + 0.5) / this.trlevel.atlas.height;
				if (minU > u) minU = u;
				if (minV > v) minV = v;
				if (maxV < v) maxV = v;
			}
		}
		var numUVs = parseInt(obj.uvs[0].length / 2);
		for (var tv = 0; tv < vertices.length; ++tv) {
			obj.faces.push(numUVs++);
			var u = (tex.vertices[fidx(tv)].Xpixel + 0.5) / this.trlevel.atlas.width;
			var v = (tex.vertices[fidx(tv)].Ypixel + 0.5) / this.trlevel.atlas.height;
			if (!isAnimatedObject) {
				obj.uvs[0].push(u - minU, v - minV);
			} else if (v != maxV) {
				obj.uvs[0].push(u, v);
			} else {
				obj.uvs[0].push(u, minV + (maxV - minV) / 2);
			}
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
				var twoSided = (o.texture & 0x8000) != 0, tex = objectTextures[o.texture & 0x7FFF];
				this.makeFace(obj, o, tiles2material, tex, ofstvert, mapObjTexture2AnimTexture, function(idx) { return o.vertices.length-1-idx; });
				if (twoSided) {
					this.makeFace(obj, o, tiles2material, tex, ofstvert, mapObjTexture2AnimTexture, function(idx) { return idx; });
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
																			// with the constant lighting for the mesh + the lighting at each vertex (passed to the shader via flags.w)

			if (attributes)  attributes.flags.value.push(new THREE.Vector4(0, 0, 0, lighting));
			if (skinIndices) skinIndices.push(skinidx, skinidx);
			if (skinWeights) skinWeights.push(1.0, 1.0);
		}

		this.makeFaces(meshJSON, [mesh.texturedRectangles, mesh.texturedTriangles], tiles2material, objectTextures, mapObjTexture2AnimTexture, ofstvert);

		return internallyLit;
	},

	makeMaterialList : function (tiles2material, matname, numLights) {
		if (!matname) matname = 'room';
		var lstMat = [];
		for (var tile in tiles2material) {
			var imat = tiles2material[tile];
			var isAnimText = tile.substr(0, 7) == 'anmtext';
			var isAlphaText = tile.substr(0, 5) == 'alpha';
			if (isAlphaText) tile = tile.substr(5);
			lstMat[imat] = {
				"material": this.getMaterial(matname, numLights),
				"uniforms": {
					"offsetRepeat" : { type: "v4", value: new THREE.Vector4( 0, 0, 1, 1 ) }
				},
				"userData": {}
			};
			if (isAnimText) {
				isAlphaText = tile.substr(7, 5) == 'alpha';
				lstMat[imat].userData.animatedTexture = {
					"idxAnimatedTexture": parseInt(tile.split('_')[1]),
					"pos": parseInt(tile.split('_')[2])
				};
			} else {
				lstMat[imat].uniforms.map = { type: "t", value: "texture" + tile };
				if (matname == 'room' && tile >= this.trlevel.numRoomTextiles+this.trlevel.numObjTextiles) {
					lstMat[imat].material = this.getMaterial('roombump', numLights);
					lstMat[imat].uniforms.mapBump = { type: "t", value: "texture" + (parseInt(tile) + this.trlevel.numBumpTextiles/2) };
					//console.log(lstMat[imat].uniforms.map.value, lstMat[imat].uniforms.mapBump.value)
				}
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
	},

	findSpriteSequenceByID : function(objectID) {
		var spriteSeq = null;
		for (var sq = 0; sq < this.trlevel.spriteSequences.length; ++sq) {
			if (this.trlevel.spriteSequences[sq].objectID == objectID) {
				return this.trlevel.spriteSequences[sq];
			}
		}
		return null;
	}

});

