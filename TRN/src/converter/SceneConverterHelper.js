TRN.extend(TRN.SceneConverter.prototype, {

	createNewJSONEmbed : function () {
		return {
			"metadata" : {
                "formatVersion" : 3
			},
			"scale" : 1.0,
			"vertices": [],
			"morphTargets": [],
			"normals": [],
			"colors": [],
			"uvs": [[]],
            "faces": [],
            "normals": []
		};
	},

	getMaterial : function (objType) {
        var matName = 'TR_' + objType;
        var mat = this.sc.materials[matName];

        if (!mat) {
            mat = this.sc.materials[matName] = {
                "type": "ShaderMaterial",
                "parameters": {
                    "uniforms": {
                        "map":          { type: "t",  value: "" },
                        "mapBump":      { type: "t",  value: "" },
                        "offsetBump":   { type: "f4", value: [0.0, 0.0, 0.0, 0.0] },
                        "ambientColor": { type: "f3", value: [0.0, 0.0, 0.0] },
                        "tintColor":    { type: "f3", value: [1.0, 1.0, 1.0] },
                        "flickerColor": { type: "f3", value: [1.2, 1.2, 1.2] },
                        "curTime":      { type: "f",  value: 0.0 },
                        "rnd":          { type: "f",  value: 0.0 },
                        "offsetRepeat": { type: "f4", value: [0.0, 0.0, 1.0, 1.0] },
                        "useFog":       { type: "i",  value: 0 },
                        "lighting":     { type: "f3", value: [0, 0, 0] }
                    },
                    "vertexShader": this.shaderMgr.getVertexShader(objType),
                    "fragmentShader": this.shaderMgr.getFragmentShader('standard'),
                    "vertexColors" : true
                }
            };
            switch(objType) {
                case 'moveable':
                    mat.parameters.skinning = true;
                    break;
                case 'sky':
                    mat.parameters.skinning = true;
                    mat.parameters.fragmentShader = this.shaderMgr.getFragmentShader('sky');
                    break;
                case 'skydome':
                    mat.parameters.fragmentShader = this.shaderMgr.getFragmentShader('skydome');
                    break;
            }
			mat.parameters.vertexShader   = mat.parameters.vertexShader.replace(/##tr_version##/g, this.sc.data.trlevel.rversion.substr(2));
			mat.parameters.fragmentShader = mat.parameters.fragmentShader.replace(/##tr_version##/g, this.sc.data.trlevel.rversion.substr(2));
        }

		return matName;
	},

	convertIntensity : function(intensity) {
		var l = [intensity/8192.0, intensity/8192.0, intensity/8192.0];

		if (this.sc.data.trlevel.rversion == 'TR3' || this.sc.data.trlevel.rversion == 'TR4') {
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
			if (xmin > vertex.x) xmin = vertex.x;
			if (xmax < vertex.x) xmax = vertex.x;
			if (ymin > vertex.y) ymin = vertex.y;
			if (ymax < vertex.y) ymax = vertex.y;
			if (zmin > vertex.z) zmin = vertex.z;
			if (zmax < vertex.z) zmax = vertex.z;
		}
		return [xmin,xmax,ymin,ymax,zmin,zmax];
	},

	processRoomVertex : function(rvertex, isFilledWithWater) {
		var vertex = rvertex.vertex, attribute = rvertex.attributes;
		var lighting = 0;

		switch(this.sc.data.trlevel.rversion) {
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
		if ((this.sc.data.trlevel.rversion == 'TR1' || this.sc.data.trlevel.rversion == 'TR2') && isFilledWithWater) moveLight = 1;
		if (isFilledWithWater && (attribute & 0x8000) == 0) moveVertex = 1;

		return {
			x: vertex.x, y: -vertex.y, z: -vertex.z,
			flag: [moveLight, 0, moveVertex, -strengthEffect],
			color: lighting
		};
	},

	makeFace : function (obj, oface, tiles2material, tex, ofstvert, mapObjTexture2AnimTexture, fidx) {
        var vertices = oface.vertices, texture = oface.texture & 0x7FFF, isQuad = vertices.length == 4, tile = tex.tile & 0x7FFF, origTile = tex.origTile;
        
        if (origTile == undefined) {
            origTile = tile;
        }

		obj.faces.push(isQuad ? 1+2+8+32+128 : 2+8+32+128); // 1=quad / 2=has material / 8=has vertex uv / 32=has vertex normal / 128=has vertex color

		// vertex indices
		for (var v = 0; v < vertices.length; ++v) {
			obj.faces.push(vertices[fidx(v)] + ofstvert);
		}

		var minU = 0, minV = 0, maxV = 0;
        minU = minV = 1;
        for (var tv = 0; tv < vertices.length; ++tv) {
            var u = (tex.vertices[fidx(tv)].Xpixel + 0.5) / this.sc.data.trlevel.atlas.width;
            var v = (tex.vertices[fidx(tv)].Ypixel + 0.5) / this.sc.data.trlevel.atlas.height;
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
				tiles2material[matName] = { imat:imat, tile:tile, minU:minU, minV:minV, origTile:origTile };
            } else {
                if (imat.minU != minU || imat.minV != minV) console.log(imat, tile, minU, minV)
                imat = imat.imat;
            }
			anmTexture = true;
		} else if (alpha) {
			imat = tiles2material['alpha' + tile];
			if (typeof(imat) == 'undefined') {
				imat = TRN.Helper.objSize(tiles2material);
				tiles2material['alpha' + tile] = { imat:imat, tile:tile, minU:minU, minV:minV, origTile:origTile };
			} else {
                imat = imat.imat;
            }
		} else if (origTile >= this.sc.data.trlevel.numRoomTextiles+this.sc.data.trlevel.numObjTextiles) {
			imat = tiles2material['bump' + origTile];
			if (typeof(imat) == 'undefined') {
                imat = TRN.Helper.objSize(tiles2material);
				tiles2material['bump' + origTile] = { imat:imat, tile:tile, minU:minU, minV:minV, origTile:origTile };
			} else {
                imat = imat.imat;
            }
        } else {
			imat = tiles2material[tile];
			if (typeof(imat) == 'undefined') {
				imat = TRN.Helper.objSize(tiles2material);
				tiles2material[tile] = { imat:imat, tile:tile, minU:minU, minV:minV, origTile:origTile };
			} else {
                imat = imat.imat;
            }
		}
		obj.faces.push(imat); // index of material

		// texture coords
		var isAnimatedObject = obj.objHasScrollAnim;

		var numUVs = parseInt(obj.uvs[0].length / 2);
		for (var tv = 0; tv < vertices.length; ++tv) {
			obj.faces.push(numUVs++);
			var u = (tex.vertices[fidx(tv)].Xpixel + 0.5) / this.sc.data.trlevel.atlas.width;
			var v = (tex.vertices[fidx(tv)].Ypixel + 0.5) / this.sc.data.trlevel.atlas.height;
			if (!isAnimatedObject) {
				obj.uvs[0].push(u, v);
			} else if (v != maxV) {
				obj.uvs[0].push(u, v);
			} else {
				obj.uvs[0].push(u, minV + (maxV - minV) / 2);
			}
		}

        // vertex normals
		for (var v = 0; v < vertices.length; ++v) {
			obj.faces.push(vertices[fidx(v)] + ofstvert);
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

			if (attributes)  attributes._flags.value.push([0, 0, 0, lighting]);
			if (skinIndices) skinIndices.push(skinidx, skinidx);
			if (skinWeights) skinWeights.push(1.0, 1.0);
		}

		this.makeFaces(meshJSON, [mesh.texturedRectangles, mesh.texturedTriangles], tiles2material, objectTextures, mapObjTexture2AnimTexture, ofstvert);

		return internallyLit;
	},

	makeMaterialList : function (tiles2material, matname) {
		if (!matname) matname = 'room';
		var lstMat = [];
		for (var tile in tiles2material) {
			var oimat = tiles2material[tile], imat = oimat.imat, origTile = oimat.origTile;
			var isAnimText = tile.substr(0, 7) == 'anmtext';
            var isAlphaText = tile.substr(0, 5) == 'alpha';
            var isBump = tile.substr(0, 4) == 'bump';
            if (isAlphaText) tile = tile.substr(5);
            if (isBump) tile = oimat.tile;
			lstMat[imat] = {
				"material": this.getMaterial(matname),
				"uniforms": {},
				"userData": {}
            };
            lstMat[imat].uniforms = jQuery.extend(true, {}, this.sc.materials[lstMat[imat].material].parameters.uniforms);
            
			if (isAnimText) {
                var idxAnimText = parseInt(tile.split('_')[1]), pos = parseInt(tile.split('_')[2]);
				isAlphaText = tile.substr(7, 5) == 'alpha';
                lstMat[imat].uniforms.map.value = "" + oimat.tile;
				lstMat[imat].uniforms.mapBump.value = "" + oimat.tile;
				lstMat[imat].userData.animatedTexture = {
					"idxAnimatedTexture": idxAnimText,
                    "pos": pos,
                    "minU": oimat.minU,
                    "minV": oimat.minV
                };
			} else {
				lstMat[imat].uniforms.map.value = "" + tile;
				lstMat[imat].uniforms.mapBump.value = "" + tile;
				if (isBump) {
                    if (this.sc.data.trlevel.atlas.make) {
                        var row0 = Math.floor(origTile / this.sc.data.trlevel.atlas.numColPerRow), col0 = origTile - row0 * this.sc.data.trlevel.atlas.numColPerRow;
                        var row = Math.floor((origTile + this.sc.data.trlevel.numBumpTextiles/2) / this.sc.data.trlevel.atlas.numColPerRow), col = (origTile + this.sc.data.trlevel.numBumpTextiles/2) - row * this.sc.data.trlevel.atlas.numColPerRow;
                        lstMat[imat].uniforms.mapBump.value = "" + tile;
                        lstMat[imat].uniforms.offsetBump.value = [(col-col0)*256.0/this.sc.data.trlevel.atlas.width, (row-row0)*256.0/this.sc.data.trlevel.atlas.height,0,1];
                    } else {
                        lstMat[imat].uniforms.mapBump.value = "" + (Math.floor(origTile) + this.sc.data.trlevel.numBumpTextiles/2);
                    }
				}
			}
			lstMat[imat].hasAlpha = isAlphaText;

		}
		return lstMat;
	},

	findStatichMeshByID : function (objectID) {
		for (var sg = 0; sg < this.sc.data.trlevel.staticMeshes.length; ++sg) {
			if (this.sc.data.trlevel.staticMeshes[sg].objectID == objectID) {
				return this.sc.data.trlevel.staticMeshes[sg];
			}
		}
		return null;
	},

	findSpriteSequenceByID : function(objectID) {
		for (var sq = 0; sq < this.sc.data.trlevel.spriteSequences.length; ++sq) {
			if (this.sc.data.trlevel.spriteSequences[sq].objectID == objectID) {
				return this.sc.data.trlevel.spriteSequences[sq];
			}
		}
		return null;
    },
    
    numAnimationsForMoveable : function(moveableIdx) {
        var curr_moveable = this.sc.data.trlevel.moveables[moveableIdx];

        if (curr_moveable.animation != 0xFFFF) {
            var next_anim_index = this.sc.data.trlevel.animations.length;
            for (var i = moveableIdx + 1; i < this.sc.data.trlevel.moveables.length; ++i) {
                if (this.sc.data.trlevel.moveables[i].animation != 0xFFFF) {
                    next_anim_index = this.sc.data.trlevel.moveables[i].animation;
                    break;
                }
            }
            return next_anim_index - curr_moveable.animation;
        }
    
        return 0;
    }

});
