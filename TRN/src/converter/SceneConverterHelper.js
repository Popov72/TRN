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

	getMaterial : function (objType, params) {
		var matName = '', doReplace = false;
		params = params || {};

		switch(objType) {
			case 'room':
				params.room_effects = params.room_effects || false;
				matName = 'TR_room';
				if (params.room_effects) matName += "_with_effects";
				if (!this.sc.materials[matName]) {
					var vshader = this.shaderMgr.getVertexShader('room').replace(/##room_effects##/g, params.room_effects);
					doReplace = true;
					this.sc.materials[matName] = {
						"type": "ShaderMaterial",
						"parameters": {
							"uniforms": {
								"map": { type: "t", value: "" },
								"ambientColor": { type: "f3", value: [1.0, 1.0, 1.0] },
								"tintColor": { type: "f3", value: [1.0, 1.0, 1.0] },
								"flickerColor": { type: "f3", value: [1.2, 1.2, 1.2] },
								"curTime": { type: "f", value: 0.0 },
								"rnd": { type: "f", value: 0.0 },
								"offsetRepeat": { type: "f4", value: [0.0, 0.0, 1.0, 1.0] }
							},
							"vertexShader": vshader,
							"fragmentShader": this.sc.defaults.fog ? this.shaderMgr.getFragmentShader('standard_fog') : this.shaderMgr.getFragmentShader('standard'),
							"vertexColors" : true
						}
					};
				}
				break;
			case 'roombump':
				matName = 'TR_roombump';
				if (!this.sc.materials[matName]) {
					var vshader = this.shaderMgr.getVertexShader('room').replace(/ROOM_EFFECTS/g, true);
					doReplace = true;
					this.sc.materials[matName] = {
						"type": "ShaderMaterial",
						"parameters": {
							"uniforms": {
								"map": { type: "t", value: "" },
								"mapBump": { type: "t", value: "" },
								"ambientColor": { type: "f3", value: [1.0, 1.0, 1.0] },
								"tintColor": { type: "f3", value: [1.0, 1.0, 1.0] },
								"flickerColor": { type: "f3", value: [1.2, 1.2, 1.2] },
								"curTime": { type: "f", value: 0.0 },
								"rnd": { type: "f", value: 0.0 },
								"offsetRepeat": { type: "f4", value: [0.0, 0.0, 1.0, 1.0] }
							},
							"vertexShader": vshader,
							"fragmentShader": this.sc.defaults.fog ? this.shaderMgr.getFragmentShader('standard_fog') : this.shaderMgr.getFragmentShader('room_bump'),
							"vertexColors" : true
						}
					};
				}
				break;
			case 'mesh':
				matName = 'TR_mesh';
				if (!this.sc.materials[matName]) {
					doReplace = true;
					this.sc.materials[matName] = {
						"type": "ShaderMaterial",
						"parameters": {
							"uniforms": {
								"map": { type: "t", value: "" },
								"ambientColor": { type: "f3", value: [1.0, 1.0, 1.0] },
								"tintColor": { type: "f3", value: [1.0, 1.0, 1.0] },
								"flickerColor": { type: "f3", value: [1.2, 1.2, 1.2] },
								"curTime": { type: "f", value: 0.0 },
								"rnd": { type: "f", value: 0.0 },
								"offsetRepeat": { type: "f4", value: [0.0, 0.0, 1.0, 1.0] },
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
                matName = 'TR_moveable' + (params.numLights ? '_l' + params.numLights.directional + '_' + params.numLights.point + '_' + params.numLights.spot : '');
				if (!this.sc.materials[matName]) {
					var vertexShader;
					doReplace = true;
					if (params.numLights) {
						vertexShader = this.shaderMgr.getVertexShader('moveable_with_lights');
						vertexShader = vertexShader.replace(/##num_point_lights##/g, params.numLights.point).replace(/##num_dir_lights##/g, params.numLights.directional).replace(/##num_spot_lights##/g, params.numLights.spot);
					} else {
						vertexShader = this.shaderMgr.getVertexShader('moveable');
					}
					this.sc.materials[matName] = {
						"type": "ShaderMaterial",
						"parameters": {
							"uniforms": {
								"map": { type: "t", value: "" },
								"ambientColor": { type: "f3", value: [1.0, 1.0, 1.0] },
								"tintColor": { type: "f3", value: [1.0, 1.0, 1.0] },
								"flickerColor": { type: "f3", value: [1.2, 1.2, 1.2] },
								"curTime": { type: "f", value: 0.0 },
								"rnd": { type: "f", value: 0.0 },
								"offsetRepeat": { type: "f4", value: [0.0, 0.0, 1.0, 1.0] },
                                "lighting": { type: "f", value: 0.0 },
                                "bindMatrix": { type: "m4", value: [
                                    1,0,0,0,
                                    0,1,0,0,
                                    0,0,1,0,
                                    0,0,0,1
                                ] },
                                "bindMatrixInverse": { type: "m4", value: [
                                    1,0,0,0,
                                    0,1,0,0,
                                    0,0,1,0,
                                    0,0,0,1
                                ] },
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
					doReplace = true;
					this.sc.materials[matName] = {
						"type": "ShaderMaterial",
						"parameters": {
							"uniforms": {
								"map": { type: "t", value: "" },
								"tintColor": { type: "f3", value: [1.0, 1.0, 1.0] },
								"offsetRepeat": { type: "f4", value: [0.0, 0.0, 1.0, 1.0] }
							},
							"vertexShader": this.shaderMgr.getVertexShader('skydome'),
							"fragmentShader": this.shaderMgr.getFragmentShader('skydome'),
							"vertexColors" : true
						}
					};
				}				
				break;
		}

		if (doReplace) {
			this.sc.materials[matName].parameters.vertexShader = this.sc.materials[matName].parameters.vertexShader.replace(/##tr_version##/g, this.trlevel.rversion.substr(2)).replace(/##world_scale##/g, "" + TRN.Consts.worldScale.toFixed(10));
			this.sc.materials[matName].parameters.fragmentShader = this.sc.materials[matName].parameters.fragmentShader.replace(/##tr_version##/g, this.trlevel.rversion.substr(2)).replace(/##world_scale##/g, "" + TRN.Consts.worldScale.toFixed(10));
		}

		return matName;
	},

	convertIntensity : function(intensity) {
		var l = intensity/8192.0;

		if (this.trlevel.rversion == 'TR3' || this.trlevel.rversion == 'TR4') {
			var b = ((intensity & 0x7C00) >> 10) << 3, g = ((intensity & 0x03E0) >> 5) << 3, r = (intensity & 0x001F) << 3;
			l = [r/255, g/255, b/255];
		}

		return l;
	},

	getBoundingBox : function(vertices) {
		var xmin = ymin = zmin = 1e20;
		var xmax = ymax = zmax = -1e20;
		for (var i = 0; i < vertices.length; ++i) {
			var vertex = vertices[i].vertex;
			if (xmin > vertex.x*TRN.Consts.worldScale) xmin = vertex.x*TRN.Consts.worldScale;
			if (xmax < vertex.x*TRN.Consts.worldScale) xmax = vertex.x*TRN.Consts.worldScale;
			if (ymin > vertex.y*TRN.Consts.worldScale) ymin = vertex.y*TRN.Consts.worldScale;
			if (ymax < vertex.y*TRN.Consts.worldScale) ymax = vertex.y*TRN.Consts.worldScale;
			if (zmin > vertex.z*TRN.Consts.worldScale) zmin = vertex.z*TRN.Consts.worldScale;
			if (zmax < vertex.z*TRN.Consts.worldScale) zmax = vertex.z*TRN.Consts.worldScale;
		}
		return [xmin,xmax,ymin,ymax,zmin,zmax];
	},

	countLightTypes : function(lights) {
		var res = { directional:0, point:0, spot: 0 };
		for (var i = 0; i < lights.length; ++i) {
			res[lights[i].type]++;
		}
		return res;
	},

	processRoomVertex : function(rvertex, isFilledWithWater) {
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
			case 'TR3':
				lighting = rvertex.lighting2;
				var r = (lighting & 0x7C00) >> 10, g = (lighting & 0x03E0) >> 5, b = (lighting & 0x001F);
				lighting = ((b << 3) + 0x000007) + ((g << 11) + 0x000700) + ((r << 19) + 0x070000);
				break;
			case 'TR4':
				lighting = rvertex.lighting2;
				var r = (((lighting & 0x7C00) >> 7) + 7) << 1, g = (((lighting & 0x03E0) >> 2) + 7) << 1, b = (((lighting & 0x001F) << 3) + 7) << 1;
				if (r > 255) r = 255;
				if (g > 255) g = 255;
				if (b > 255) b = 255;
				lighting = b + (g << 8) + (r << 16);
				break;
		}

		var moveLight = (attribute & 0x4000) ? 1 : 0;
		var moveVertex = (attribute & 0x2000) ? 1 : 0;
		var strengthEffect = ((attribute & 0x1E)-16)/16;

		if (moveVertex) moveLight = 1;
		if ((this.trlevel.rversion == 'TR1' || this.trlevel.rversion == 'TR2') && isFilledWithWater) moveLight = 1;
		if (isFilledWithWater && (attribute & 0x8000) == 0) moveVertex = 1;

		return {
			x: vertex.x*TRN.Consts.worldScale, y: -vertex.y*TRN.Consts.worldScale, z: -vertex.z*TRN.Consts.worldScale,
			flag: [moveLight, 0, moveVertex, -strengthEffect],
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

		var minU = 0, minV = 0, maxV = 0;
        minU = minV = 1;
        for (var tv = 0; tv < vertices.length; ++tv) {
            var u = (tex.vertices[fidx(tv)].Xpixel + 0.5) / this.trlevel.atlas.width;
            var v = (tex.vertices[fidx(tv)].Ypixel + 0.5) / this.trlevel.atlas.height;
            if (minU > u) minU = u;
            if (minV > v) minV = v;
            if (maxV < v) maxV = v;
        }

		// material
		var imat, anmTexture = false, alpha = (tex.attributes & 2 || oface.effects & 1) ? 'alpha' : '';
		if (mapObjTexture2AnimTexture && mapObjTexture2AnimTexture[texture]) {
			var animTexture = mapObjTexture2AnimTexture[texture];
			var matName = 'anmtext' + alpha + '_' + animTexture.idxAnimatedTexture + '_' + animTexture.pos;
			imat = tiles2material[matName];
			if (typeof(imat) == 'undefined') {
				imat = TRN.Helper.objSize(tiles2material);
				tiles2material[matName] = { imat:imat, tile:tile, minU:minU, minV:minV };
            } else {
                if (imat.minU != minU || imat.minV != minV) console.log(imat, tile, minU, minV)
                imat = imat.imat;
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

		var numUVs = parseInt(obj.uvs[0].length / 2);
		for (var tv = 0; tv < vertices.length; ++tv) {
			obj.faces.push(numUVs++);
			var u = (tex.vertices[fidx(tv)].Xpixel + 0.5) / this.trlevel.atlas.width;
			var v = (tex.vertices[fidx(tv)].Ypixel + 0.5) / this.trlevel.atlas.height;
			if (!isAnimatedObject) {
				obj.uvs[0].push(u, v);
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

			meshJSON.vertices.push(vertex.x*TRN.Consts.worldScale, -vertex.y*TRN.Consts.worldScale, -vertex.z*TRN.Consts.worldScale);
			meshJSON.colors.push(vcolor + (vcolor << 8) + (vcolor << 16)); 	// not used => a specific calculation is done in the vertex shader 
																			// with the constant lighting for the mesh + the lighting at each vertex (passed to the shader via flags.w)

			if (attributes)  attributes._flags.value.push([0, 0, 0, lighting]);
			if (skinIndices) skinIndices.push(skinidx, skinidx);
			if (skinWeights) skinWeights.push(1.0, 1.0);
		}

		this.makeFaces(meshJSON, [mesh.texturedRectangles, mesh.texturedTriangles], tiles2material, objectTextures, mapObjTexture2AnimTexture, ofstvert);

		return internallyLit;
	},

	makeMaterialList : function (tiles2material, matname, matparams) {
		if (!matname) matname = 'room';
		var lstMat = [];
		for (var tile in tiles2material) {
			var oimat = tiles2material[tile], imat = typeof(oimat) == 'object' ? oimat.imat : oimat;
			var isAnimText = tile.substr(0, 7) == 'anmtext';
			var isAlphaText = tile.substr(0, 5) == 'alpha';
			if (isAlphaText) tile = tile.substr(5);
			lstMat[imat] = {
				"material": this.getMaterial(matname, matparams),
				"uniforms": {},
				"userData": {}
			};
			if (isAnimText) {
                var idxAnimText = parseInt(tile.split('_')[1]), pos = parseInt(tile.split('_')[2]);
				isAlphaText = tile.substr(7, 5) == 'alpha';
                lstMat[imat].uniforms.map = { type: "t", value: "" + oimat.tile };
				lstMat[imat].userData.animatedTexture = {
					"idxAnimatedTexture": idxAnimText,
                    "pos": pos,
                    "minU": oimat.minU,
                    "minV": oimat.minV
                };
			} else {
				lstMat[imat].uniforms.map = { type: "t", value: "" + tile };
				if (matname == 'room' && tile >= this.trlevel.numRoomTextiles+this.trlevel.numObjTextiles) {
					lstMat[imat].material = this.getMaterial('roombump', matparams);
					lstMat[imat].uniforms.mapBump = { type: "t", value: "" + (parseInt(tile) + this.trlevel.numBumpTextiles/2) };
					//console.log(lstMat[imat].uniforms.map.value, lstMat[imat].uniforms.mapBump.value)
				}
			}
			lstMat[imat].hasAlpha = isAlphaText;

		}
		return lstMat;
	},

    setMaterialLightsUniform : function(room, material) {
        if (!room || room.lights.length == 0) return;

        material.uniforms.directionalLight_direction = { type: "fv", value: [] };
        material.uniforms.directionalLight_color = { type: "fv", value: [] };

        material.uniforms.pointLight_position = { type: "fv", value: [] };
        material.uniforms.pointLight_color = { type: "fv", value: [] };
        material.uniforms.pointLight_distance = { type: "fv1", value: [] };

        material.uniforms.spotLight_position = { type: "fv", value: [] };
        material.uniforms.spotLight_color = { type: "fv", value: [] };
        material.uniforms.spotLight_distance = { type: "fv1", value: [] };
        material.uniforms.spotLight_direction = { type: "fv", value: [] };
        material.uniforms.spotLight_coneCos = { type: "fv1", value: [] };
        material.uniforms.spotLight_penumbraCos = { type: "fv1", value: [] };

        for (var l = 0; l < room.lights.length; ++l) {

            var light = room.lights[l];

            switch(light.type) {
                case 'directional':
                    material.uniforms.directionalLight_direction.value = material.uniforms.directionalLight_direction.value.concat([light.dx, light.dy, light.dz]);
                    material.uniforms.directionalLight_color.value = material.uniforms.directionalLight_color.value.concat(light.color);
                    break;
                case 'point':
                    material.uniforms.pointLight_position.value = material.uniforms.pointLight_position.value.concat([light.x, light.y, light.z]);
                    material.uniforms.pointLight_color.value = material.uniforms.pointLight_color.value.concat(light.color);
                    material.uniforms.pointLight_distance.value.push(light.fadeOut);
                    break;
                case 'spot':
                    material.uniforms.spotLight_position.value = material.uniforms.spotLight_position.value.concat([light.x, light.y, light.z]);
                    material.uniforms.spotLight_color.value = material.uniforms.spotLight_color.value.concat(light.color);
                    material.uniforms.spotLight_distance.value.push(light.fadeOut);
                    material.uniforms.spotLight_direction.value = material.uniforms.spotLight_direction.value.concat([light.dx, light.dy, light.dz]);
                    material.uniforms.spotLight_coneCos.value.push(light.coneCos);
                    material.uniforms.spotLight_penumbraCos.value.push(light.penumbraCos);
                    break;
            }
        }
    },

	findStatichMeshByID : function (objectID) {
		for (var sg = 0; sg < this.trlevel.staticMeshes.length; ++sg) {
			if (this.trlevel.staticMeshes[sg].objectID == objectID) {
				return this.trlevel.staticMeshes[sg];
			}
		}
		return null;
	},

	findSpriteSequenceByID : function(objectID) {
		for (var sq = 0; sq < this.trlevel.spriteSequences.length; ++sq) {
			if (this.trlevel.spriteSequences[sq].objectID == objectID) {
				return this.trlevel.spriteSequences[sq];
			}
		}
		return null;
    },
    
    numAnimationsForMoveable : function(moveableIdx) {
        var curr_moveable = this.trlevel.moveables[moveableIdx];

        if (curr_moveable.animation != 0xFFFF) {
            var next_anim_index = this.trlevel.animations.length;
            for (var i = moveableIdx + 1; i < this.trlevel.moveables.length; ++i) {
                if (this.trlevel.moveables[i].animation != 0xFFFF) {
                    next_anim_index = this.trlevel.moveables[i].animation;
                    break;
                }
            }
            return next_anim_index - curr_moveable.animation;
        }
    
        return 0;
    }
    

});

