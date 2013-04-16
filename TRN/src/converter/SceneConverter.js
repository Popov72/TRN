TRN.LevelConverter = function(confMgr) {

	this.confMgr = confMgr;
	this.shaderMgr = new TRN.ShaderMgr();

	return this;
};

TRN.LevelConverter.prototype = {

	constructor : TRN.LevelConverter,

	// create the materials + texture per tile	
	createMaterials : function () {
		this.sc.materials['TR_room'] = {
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

		this.sc.materials['TR_mesh'] = {
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

		this.sc.materials['TR_moveable'] = {
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
				"vertexShader": this.shaderMgr.getVertexShader('moveable'),
				"fragmentShader": this.sc.defaults.fog ? this.shaderMgr.getFragmentShader('standard_fog') : this.shaderMgr.getFragmentShader('standard'),
				"vertexColors" : true,
				"skinning": true
			}
		};

		// create one texture per tile	
		for (var i = 0; i < this.trlevel.textile.length; ++i) {
			this.sc.textures['texture' + i] = {
				"url": "TRN/texture/brick.jpg",
				/*"url": this.sc.texturePath  + this.sc.levelShortFileName + "_tile" + i + ".png",*/
				"anisotropy": 16
			};
		}
	},

	// Collect the animated textures
	createAnimatedTextures : function () {
		var i = 0, adata = this.trlevel.animatedTextures, numAnimatedTextures = adata[i++];
		var animatedTextures = [], mapObjTexture2AnimTexture = {};
		while (numAnimatedTextures-- > 0) {
			var numTextures = adata[i++] + 1, snumTextures = numTextures;
			//console.log('Animated texture #' + idxAnimatedTexture + ', num textures=' + numTextures);
			var anmcoords = [];
			while (numTextures-- > 0) {
				var texture = adata[i++], tex = this.trlevel.objectTextures[texture], tile = tex.tile & 0x7FFF;
				var isTri = 
					(tex.vertices[3].Xpixel == 0)  &&
					(tex.vertices[3].Ypixel == 0)  &&
					(tex.vertices[3].Xcoordinate == 0)  &&
					(tex.vertices[3].Ycoordinate == 0);
			    var minU = 0x7FFF, minV = 0x7FFF, maxU = 0x0, maxV = 0x0, numVertices = isTri ? 3 : 4;

			    mapObjTexture2AnimTexture[texture] = { idxAnimatedTexture:animatedTextures.length, pos:snumTextures-numTextures-1 };

			    for (var j = 0; j < numVertices; j++) {
			        var u = tex.vertices[j].Xpixel + tex.vertices[j].Xcoordinate;
			        var v = tex.vertices[j].Ypixel + tex.vertices[j].Ycoordinate;

			        if (minU > u) minU = u; if (minV > v) minV = v;
			        if (maxU < u) maxU = u; if (maxV < v) maxV = v;
			    }

			    var width = maxU - minU + 1, height = maxV - minV + 1;
			    anmcoords.push({ minU:minU/256, minV:1-maxV/256, texture:"texture" + tile});
			    //console.log('  ', isTri, width, height, tile, minU, minV, maxU, maxV);
			}
			animatedTextures.push({
				"animcoords": anmcoords,
				"animspeed" : 6

			});
		}

		this.sc.animatedTextures = animatedTextures;
		this.trlevel.mapObjTexture2AnimTexture = mapObjTexture2AnimTexture; // => to know for each objTexture if it is part of an animated texture, and if yes which is its starting position in the sequence

		//console.log('length of animated texture array=' + adata.length + ', final i value=' + i);
	},

	// create all the meshes of the level
	createMeshes : function () {
		var numExternalLit = 0, numInternalLit = 0;
		for (var i = 0; i < this.trlevel.meshes.length; ++i) {
			var mesh = this.trlevel.meshes[i];
			var meshJSON = createNewJSONEmbed();
			var attributes = {
				flags: { type:"v4", value:[] }
			};
			var tiles2material = {};

			var externalLit = makeMeshGeometry(mesh, i, meshJSON, tiles2material, this.trlevel.objectTextures, this.trlevel.mapObjTexture2AnimTexture, 0, attributes);

			if (externalLit) numExternalLit++; else numInternalLit++;

			meshJSON._materials = makeMaterialList(tiles2material, attributes, 'mesh');
			for (var m = 0; m < meshJSON._materials.length; ++m) {
				if (this.trlevel.rversion == 'TR3' || this.trlevel.rversion == 'TR4') {
					meshJSON._materials[m].uniforms.lighting = { type: "v3", value: new THREE.Vector3(1,1,1) }
				} else {
					meshJSON._materials[m].uniforms.lighting = { type: "f", value: 0.0 }
				}
			}

			this.sc.embeds['mesh' + i] = meshJSON;
			this.sc.geometries['mesh' + i] = {
				"type": "embedded",
				"id"  : "mesh" + i
			};
		}
		console.log('Num meshes in level=' + this.trlevel.meshes.length + ', num externally lit=' + numExternalLit + ', num internally lit=' + numInternalLit);
	},

	// generate the rooms => one embedded object is created per room
	createRooms : function () {
		// flag the alternate rooms
		for (var m = 0; m < this.trlevel.rooms.length; ++m) {
			var room = this.trlevel.rooms[m];
			var alternate = room.alternateRoom;
			if (alternate != -1) {
				this.trlevel.rooms[alternate].isAlternate = true;
			}
		}
		
		// generate the rooms
		for (var m = 0; m < this.trlevel.rooms.length; ++m) {
			//if (m != 64 && m != 65) continue;
			var room = this.trlevel.rooms[m];
			var info = room.info, rdata = room.roomData, rflags = room.flags, lightMode = room.lightMode;
			var isFilledWithWater = (rflags & 1) != 0, isFlickering = (lightMode == 1);
			var roomJSON = createNewJSONEmbed();
			var attributes = {
				flags: { type:"v4", value:[] }
			};
			var tiles2material = {};

			// push the vertices + vertex colors of the room
			for (var v = 0; v < rdata.vertices.length; ++v) {
				var vertex = rdata.vertices[v].vertex, attribute = rdata.vertices[v].attributes;
				var lighting = 0;

				switch(this.trlevel.rversion) {
					case 'TR1':
						lighting = Math.floor((1.0-rdata.vertices[v].lighting1/8192.)*2*256);
						if (lighting > 255) lighting = 255;
						var r = lighting, g = lighting, b = lighting;
						lighting = b + (g << 8) + (r << 16);
						break;
					case 'TR2':
						lighting = Math.floor((1.0-rdata.vertices[v].lighting2/8192.)*2*256);
						if (lighting > 255) lighting = 255;
						var r = lighting, g = lighting, b = lighting;
						lighting = b + (g << 8) + (r << 16);
						break;
					default:
						lighting = rdata.vertices[v].lighting2;
						var r = (lighting & 0x7C00) >> 10, g = (lighting & 0x03E0) >> 5, b = (lighting & 0x001F);
						lighting = (b << 3) + (g << 11) + (r << 19);
						break;
				}

				roomJSON.vertices.push(vertex.x+info.x, -vertex.y, -(vertex.z+info.z));

				var moveLight = (attribute & 0x4000) ? 1 : 0;
				var moveVertex = (attribute & 0x2000) ? 1 : 0;
				var strengthEffect = ((attribute & 0x1E)-16)/16;
				if (moveVertex) moveLight = 1;
				if (this.trlevel.rversion == 'TR2' && isFilledWithWater) moveLight = 1;
				if (this.trlevel.rversion == 'TR2' && isFilledWithWater && (attribute & 0x8000) == 0) moveVertex = 1;

				attributes.flags.value.push(new THREE.Vector4(moveLight, isFlickering && strengthEffect ? 1 : 0, moveVertex, -strengthEffect));
				roomJSON.colors.push(lighting);
			}

			// create the tri/quad faces
			makeFaces(roomJSON, [rdata.rectangles, rdata.triangles], tiles2material, this.trlevel.objectTextures, this.trlevel.mapObjTexture2AnimTexture, 0);
			
			// add the room to the scene
			this.sc.embeds['room' + m] = roomJSON;
			this.sc.geometries['room' + m] = {
				"type": "embedded",
				"id"  : "room" + m
			};
			//var q = new THREE.Quaternion();
			//q.setFromAxisAngle( {x:0,y:1,z:0}, THREE.Math.degToRad() );
			this.sc.objects['room' + m] = {
				"geometry" : "room" + m,
				"material" : makeMaterialList(tiles2material, attributes),
				"position" : [ 0, 0, 0 ],
				"rotation" : [ 0, 0, 0 ],
				"scale"	   : [ 1, 1, 1 ],
				"visible"  : !room.isAlternate,
				"isAlternateRoom" : room.isAlternate,
				"filledWithWater": isFilledWithWater,
				"isRoom": true,
				"roomIndex": m
			};

			// static meshes in the room
			for (var s = 0; s < room.staticMeshes.length; ++s) {
				var staticMesh = room.staticMeshes[s];
				var x = staticMesh.x, y = -staticMesh.y, z = -staticMesh.z, rot = staticMesh.rotation, lightingGlobal = staticMesh.intensity1/8192.0;
				var objectID = staticMesh.objectID;

				var gstaticMesh = findStatichMeshByID(this.trlevel, objectID);
				if (gstaticMesh == null) continue;

				var mindex = gstaticMesh.mesh, mflags = gstaticMesh.flags;
				var nonCollisionable = (mflags & 1) != 0, visible = (mflags & 2) != 0;

				if (!visible) continue;

				var q = new THREE.Quaternion();
				rot = ((rot & 0xC000) >> 14) * 90;
				q.setFromAxisAngle( { x:0, y:1, z:0}, THREE.Math.degToRad(-rot) );

				if (!this.sc.embeds['mesh' + mindex]) {
					console.log('Embeds "mesh' + mindex + '" not found - skipping static mesh #' + s + ' (objectID=' + objectID + ')');
					continue;
				}

				var materials = [];
				for (var mat = 0; mat < this.sc.embeds['mesh' + mindex]._materials.length; ++mat) {
					var material = jQuery.extend(true, {}, this.sc.embeds['mesh' + mindex]._materials[mat]);
					if (this.trlevel.rversion == 'TR3' || this.trlevel.rversion == 'TR4') {
						lightingGlobal = staticMesh.intensity1;
						var b = ((lightingGlobal & 0x7C00) >> 10) << 3, g = ((lightingGlobal & 0x03E0) >> 5) << 3, r = (lightingGlobal & 0x001F) << 3;
						material.uniforms.lighting.value = new THREE.Vector3(r/255, g/255, b/255);
					} else {
						material.uniforms.lighting.value = lightingGlobal;
					}
					materials.push(material);
				}
				
				this.sc.objects['room' + m + '_staticmesh' + s] = {
					"geometry" : "mesh" + mindex,
					"material" : materials,
					"position" : [ x, y, z ],
					"quaternion" : [ q.x, q.y, q.z, q.w ],
					"scale"	   : [ 1, 1, 1 ],
					"visible"  : !room.isAlternate,
					"isAlternateRoom" : room.isAlternate,
					"filledWithWater": isFilledWithWater,
					"isStaticMesh": true,
					"roomIndex": m
				};

				//console.log('room #',m,' mesh #', s, 'objectID=', objectID, 'mindex=', mindex, mesh)
			}
		}
	},

/*	getNumAnimsForMoveable : function (mindex) {
	    // That's ugly code ! But it seems there's not this info (num animations)
	    // available in the moveable, so to calculate this info, we:
	    //  - get the "# starting anim" for the next moveable (->N)
	    //  - substract the "# starting anim" for moveable mindex to N
	    // Doing this, we assume that the next moveable has its animations following
	    // the animations of the current moveable (seems right for all tested
	    // levels, but...)
	    // We have to deal with the fact that the next moveable could have "# starting anim" == -1
	    // (ie. anim handled by the engine, like the ponytail anim). If it's the case, we skip the moveable
	    // and use the next moveable for our computation

	    var startAnim = this.trlevel.moveables[mindex].animation;
	    var nextStartAnim = 0xFFFF;

	    var numMoveables = this.trlevel.moveables.length;

	    while (nextStartAnim == 0xFFFF && ++mindex < numMoveables) {
	        nextStartAnim = this.trlevel.moveables[mindex].animation;
	    }

	    if (mindex == numMoveables) {
	        nextStartAnim =  this.trlevel.animations.length;
	    }

	    return startAnim != 0xFFFF ? nextStartAnim - startAnim : 0;
	},

	getNumAnimsForMoveable2 : function (mindex) {
	    var anim = this.trlevel.moveables[mindex].animation;
	    var exploredAnim = { };
	    var exploreAnim  = [this.trlevel.moveables[mindex].animation];

	    while (exploreAnim.length > 0) {
	    	var anmIndex = exploreAnim.splice(0, 1)[0];
	    	exploredAnim[anmIndex] = true;

	    	var anm = this.trlevel.animations[anmIndex];
	    	if (!exploredAnim[anm.nextAnimation]) {
	    		exploreAnim.push(anm.nextAnimation);
	    	}
	    	var numStateChanges = anm.numStateChanges;
	    	for (var i = 0; i < numStateChanges; ++i) {
	    		var sch = this.trlevel.stateChanges[anm.stateChangeOffset + i];
	    		var numAnimDispatch = sch.numAnimDispatches;
		    	for (var j = 0; j < numAnimDispatch; ++j) {
		    		var ad = this.trlevel.animDispatches[sch.animDispatch + j];
			    	if (!exploredAnim[ad.nextAnimation]) {
			    		exploreAnim.push(ad.nextAnimation);
			    	}
		    	}
	    	}
	    }

	    return TRN.objSize(exploredAnim);
	},
*/
	createAnimations : function () {
		var animations = [];

		for (var anm = 0; anm < this.trlevel.animations.length; ++anm) {
			var anim = this.trlevel.animations[anm];

			var frameOffset = anim.frameOffset / 2;
			var frameStep   = anim.frameSize;
			var numFrames = anim.frameEnd - anim.frameStart + 1;
			var animNumKeys = parseInt((numFrames - 1) / anim.frameRate) + 1;

			if ((numFrames - 1) % anim.frameRate) animNumKeys++;

			var animFPS = TRN.baseFrameRate;
			var animLength = ((animNumKeys-1) * anim.frameRate) / TRN.baseFrameRate;

			if (animLength == 0) {
				animFPS = 1.0;
				animLength = 1.0;
			}

			if (this.trlevel.rversion == 'TR1') {
				frameStep = this.trlevel.frames[frameOffset + 9] * 2 + 10;
			}

			var animBones = [];

			for (var key = 0; key < animNumKeys; key++)	{
				var frame = frameOffset + key * frameStep, sframe = frame;

				var BBLoX =  this.trlevel.frames[frame++], BBHiX =  this.trlevel.frames[frame++];
				var BBLoY = -this.trlevel.frames[frame++], BBHiY = -this.trlevel.frames[frame++];
				var BBLoZ = -this.trlevel.frames[frame++], BBHiZ = -this.trlevel.frames[frame++];

				var transX = this.trlevel.frames[frame++], transY = -this.trlevel.frames[frame++], transZ = -this.trlevel.frames[frame++];

				var numAnimatedMeshesUnknown = 99999, numAnimatedMeshes = numAnimatedMeshesUnknown;
				if (this.trlevel.rversion == 'TR1') {
					numAnimatedMeshes = this.trlevel.frames[frame++];
				}

				var mesh = 0;
				// Loop through all the meshes of the key
				while (mesh < numAnimatedMeshes) {
					var angleX = 0.0, angleY = 0.0, angleZ = 0.0;

					if (numAnimatedMeshes == numAnimatedMeshesUnknown && (frame-sframe) >= frameStep) break;

				    var frameData = this.trlevel.frames[frame++];
				    if (frameData < 0) frameData += 65536;

				    if ((frameData & 0xC000) && (this.trlevel.rversion != 'TR1')) { // single axis of rotation
				        var angle = this.trlevel.rversion == 'TR4' ? (frameData & 0xFFF) >> 2 : frameData & 0x3FF;

						angle *= 360.0 / 1024.0;

				        switch (frameData & 0xC000) {
				            case 0x4000:
				                angleX = angle;
				                break;
				            case 0x8000:
				                angleY = angle;
				                break;
				            case 0xC000:
				                angleZ = angle;
				                break;
			            }
			        } else { // 3 axis of rotation
						if (numAnimatedMeshes == numAnimatedMeshesUnknown && (frame-sframe) >= frameStep) break;

				        var frameData2 = this.trlevel.frames[frame++];
					    if (frameData2 < 0) frameData2 += 65536;

				        if (this.trlevel.rversion == 'TR1') {
				            var temp = frameData;
				            frameData = frameData2;
				            frameData2 = temp;
				        }

				        angleX = (frameData >> 4) & 0x03FF;
				        angleX *= 360.0 / 1024.0;

				        angleY = (frameData << 6) & 0x03C0;
				        angleY += (frameData2 >> 10) & 0x003F;
				        angleY *= 360.0 / 1024.0;

				        angleZ = frameData2 & 0x3FF;
				        angleZ *= 360.0 / 1024.0;
				    }

	                angleX *= Math.PI / 180.0;
					angleY *= Math.PI / 180.0;
					angleZ *= Math.PI / 180.0;

					var qx = new THREE.Quaternion(), qy = new THREE.Quaternion(), qz = new THREE.Quaternion();

					qx.setFromAxisAngle( {x:1,y:0,z:0}, angleX );
					qy.setFromAxisAngle( {x:0,y:1,z:0}, -angleY );
					qz.setFromAxisAngle( {x:0,y:0,z:1}, -angleZ );

				    qy.multiply(qx).multiply(qz);

				    if (animBones.length <= mesh) {
						animBones.push({
							"keys": []
						});
				    }

					var bone = animBones[mesh];

					bone.keys.push({
						"time": (key * anim.frameRate) / TRN.baseFrameRate,
						"pos":  [ transX, transY, transZ ], 
						"rot":  [ qy.x, qy.y, qy.z, qy.w ], 
						"scl":  [ 1, 1, 1 ]
					});

					if (animNumKeys == 1) {
						// three js needs at least two keys for skeleton animation
						bone.keys.push(jQuery.extend(true, {}, bone.keys[bone.keys.length-1]));
						bone.keys[bone.keys.length-1].time = 1.0;
					}

					transX = transY = transZ = 0;

					mesh++;
				}
				//if (frame-sframe > frameStep)
				//console.log('id', moveable.objectID, ' anim', anm, ' key', key, ' frameStep', frameStep, ' diff', frame-sframe)
			}

			animations.push({ 
				"name": 		"anim" + anm,
				"fps": 			animFPS, 
				"length": 		animLength, 
				"hierarchy": 	animBones,
				"numFrames":  	numFrames,
				"numKeys":      animNumKeys,
				"frameRate":   	anim.frameRate
			});
		}

		this.sc.animations = animations;
	},

	createMoveables : function () {

		var numMoveables = 0;
		for (var m = 0; m < this.trlevel.moveables.length; ++m) {
			var moveable = this.trlevel.moveables[m];

			var numMeshes = moveable.numMeshes, meshIndex = moveable.startingMesh, meshTree = moveable.meshTree;
			var isDummy = numMeshes == 1 && this.trlevel.meshes[meshIndex].dummy;

			if (this.sc.geometries['moveable' + moveable.objectID] || isDummy) continue;

			var meshJSON = createNewJSONEmbed();
			var attributes = {
				flags: { type:"v4", value:[] }
			};
			var tiles2material = {};
			var stackIdx = 0, stack = [], parent = -1;
			var px = 0, py = 0, pz = 0, ofsvert = 0, bones = [], skinIndices = [], skinWeights = [];

			for (var idx = 0; idx < numMeshes; ++idx, meshIndex++) {
				if (idx != 0) {
					var sflag = this.trlevel.meshTrees[meshTree++].coord;
					px = this.trlevel.meshTrees[meshTree++].coord;
					py = this.trlevel.meshTrees[meshTree++].coord;
					pz = this.trlevel.meshTrees[meshTree++].coord;
					if (sflag & 1) {
						if (stackIdx == 0) stackIdx = 1; // some moveables can have stackPtr == -1 without this test... (look in joby1a.tr4 for eg)
						parent = stack[--stackIdx];
					}
					if (sflag & 2) {
						stack[stackIdx++] = parent;
					}
				}

				var mesh = this.trlevel.meshes[meshIndex];

				makeMeshGeometry(mesh, meshIndex, meshJSON, tiles2material, this.trlevel.objectTextures, this.trlevel.mapObjTexture2AnimTexture, ofsvert, attributes, idx, skinIndices, skinWeights);

				ofsvert = parseInt(meshJSON.vertices.length/3);

				bones.push({
					"parent": parent,
					"name": "mesh#" + meshIndex,
					"pos": [ 0, 0, 0 ],
					"pos_init": [ px, -py, -pz ],
					"rotq": [ 0, 0, 0, 1]
				});

				parent = idx;
			}

			meshJSON.bones = bones;
			meshJSON.skinIndices = skinIndices;
			meshJSON.skinWeights = skinWeights;

			meshJSON._materials = makeMaterialList(tiles2material, attributes, 'moveable');
			for (var mat = 0; mat < meshJSON._materials.length; ++mat) {
				meshJSON._materials[mat].uniforms.lighting = { type: "f", value: 0.0 }
			}

			this.sc.embeds['moveable' + moveable.objectID] = meshJSON;
			this.sc.geometries['moveable' + moveable.objectID] = {
				"type": "embedded",
				"id"  : "moveable" + moveable.objectID
			};

			numMoveables++;
		}

		console.log('Num moveables=', numMoveables)
	},

	createItems : function () {
		var mapObjID2Index = {};

		for (var m = 0; m < this.trlevel.moveables.length; ++m) {
			var moveable = this.trlevel.moveables[m];
			mapObjID2Index[moveable.objectID] = m;
		}

		var numMoveableInstances = 0;
		for (var i = 0; i < this.trlevel.items.length; ++i) {
			var item = this.trlevel.items[i];
			var m = mapObjID2Index[item.objectID];
			if (m == null) continue; // not a moveable

			var moveable = this.trlevel.moveables[m];

			var objIDForVisu = this.confMgr.levelNumber(this.sc.levelShortFileName, 'moveables > moveable[id="' + moveable.objectID + '"] > visuid', true, moveable.objectID);

			var hasGeometry = this.sc.embeds['moveable' + objIDForVisu];
			var materials = null;
			if (hasGeometry) {
				materials = [];
				for (var mat = 0; mat < this.sc.embeds['moveable' + objIDForVisu]._materials.length; ++mat) {
					var material = jQuery.extend(true, {}, this.sc.embeds['moveable' + objIDForVisu]._materials[mat]);
					material.uniforms.lighting.value = 1.0;
					materials.push(material);
				}
			}

			var q = new THREE.Quaternion();
			q.setFromAxisAngle( {x:0,y:1,z:0}, THREE.Math.degToRad(-(item.angle >> 14) * 90) );

			this.sc.objects['item' + i] = {
				"geometry" : hasGeometry ? "moveable" + objIDForVisu : null,
				"material" : materials,
				"position" : [ item.x, -item.y, -item.z ],
				"quaternion" : [ q.x, q.y, q.z, q.w ],
				"scale"	   : [ 1, 1, 1 ],
				"visible"  : !this.trlevel.rooms[item.room].isAlternate,
				"moveable" : moveable.objectID,
				"has_anims": true,
				"roomIndex": item.room,
				"animationStartIndex": moveable.animation,
				"isAlternateRoom" : this.trlevel.rooms[item.room].isAlternate,
				"skin"	: true,
				"use_vertex_texture" : false
			};

			numMoveableInstances++;
		}

		var skyId = this.confMgr.levelNumber(this.sc.levelShortFileName, 'sky > objectid', true, 0);
		if (skyId && mapObjID2Index[skyId]) {
			moveable = this.trlevel.moveables[mapObjID2Index[skyId]];
			var materials = [];
			for (var mat = 0; mat < this.sc.embeds['moveable' + moveable.objectID]._materials.length; ++mat) {
				var material = jQuery.extend(true, {}, this.sc.embeds['moveable' + moveable.objectID]._materials[mat]);
				material.uniforms.lighting.value = 1.0;
				material.depthWrite = false;
				material.depthTest = false;
				materials.push(material);
			}
			var skyNoAnim = this.confMgr.levelBoolean(this.sc.levelShortFileName, 'sky > noanim', true, false);
			this.sc.objects['sky'] = {
				"geometry" : "moveable" + moveable.objectID,
				"material" : materials,
				"position" : [ 0, 0, 0 ],
				"quaternion" : [ 0, 0, 0, 1 ],
				"scale"	   : [ 1, 1, 1 ],
				"visible"  : true,
				"moveable" : moveable.objectID,
				"animationStartIndex": moveable.animation,
				"has_anims": !skyNoAnim,
				"skin"	: true,
				"use_vertex_texture" : false
			};
			numMoveableInstances++;	
		}

		console.log('Num moveable instances=', numMoveableInstances)
	},

	convert : function (trlevel, callback_created) {
		this.trlevel = trlevel;

		this.sc =  {
			"metadata": {
				"formatVersion": 3.2,
				"type" : "scene"
			},

			"urlBaseType" : "relativeToHTML",

			"objects": { },
			
			"geometries": {	},
			
			"materials": { },
			
			"textures": { },
			
			"embeds": { },

			"defaults": {
				"camera": "camera1",
				"fog": false
			},

			"cutScene": {
				"origin" : {},
				"curFrame" : 0,
				"frames" : null,
				"sound" : null,
				"animminid" : 0,
				"animmaxid" : 0
			}
		};

		this.sc.levelFileName = this.trlevel.filename;
		this.sc.levelShortFileName = this.sc.levelFileName.substring(0, this.sc.levelFileName.indexOf('.')).toLowerCase();
		this.sc.waterColor = {
			"in" : this.confMgr.globalColor('water > colorin'),
			"out" : this.confMgr.globalColor('water > colorout')
		};
		this.sc.texturePath = "TRN/texture/" + this.trlevel.rversion.toLowerCase() + "/";
		this.sc.soundPath = "TRN/sound/" + this.trlevel.rversion.toLowerCase() + "/";

		// get Lara's position => camera starting point
		var laraPos = { x:0, y:0, z:0, rotY:0 };
		for (var i = 0; i < this.trlevel.items.length; ++i) {
			var item = this.trlevel.items[i];
			if (item.objectID == TRN.ObjectID.Lara) {
				laraPos.x = item.x;
				laraPos.y = -item.y;
				laraPos.z = -item.z;
				laraPos.rotY = -(item.angle >> 14) * 90;
				break;
			}
		}

		var laraAngle = this.confMgr.levelFloat(this.sc.levelShortFileName, 'moveables > moveable[id="' + TRN.ObjectID.Lara + '"] > angle');
		if (laraAngle != undefined) {
			laraPos.rotY = laraAngle;
		}

		if (this.trlevel.numCinematicFrames > 0) {
			this.sc.cutScene.frames = this.trlevel.cinematicFrames;
			this.sc.cutScene.origin = laraPos;
			this.sc.cutScene.animminid = this.confMgr.levelNumber(this.sc.levelShortFileName, 'cutscene > animminid', true, 0);
			this.sc.cutScene.animmaxid = this.confMgr.levelNumber(this.sc.levelShortFileName, 'cutscene > animmaxid', true, 0);
		}	

		var camPos = { x:laraPos.x, y:laraPos.y, z:laraPos.z, rotY:laraPos.rotY }
		if (!this.sc.cutScene.frames) {
			var ofstDir = this.confMgr.levelFloat(this.sc.levelShortFileName, 'moveables > moveable[id="' + TRN.ObjectID.Lara + '"] > behaviour[name="Lara"] > dirdist', true, 0.0);
			var ofstUp = this.confMgr.levelFloat(this.sc.levelShortFileName, 'moveables > moveable[id="' + TRN.ObjectID.Lara + '"] > behaviour[name="Lara"] > updist', true, 0.0);

			var v3 = new THREE.Vector3(0, ofstUp, ofstDir);
			var q = new THREE.Quaternion();

			q.setFromAxisAngle( {x:0,y:1,z:0}, THREE.Math.degToRad(laraPos.rotY) );
			v3.applyQuaternion(q);

			camPos.x += v3.x;
			camPos.y += v3.y;
			camPos.z += v3.z;
		}

		var q = new THREE.Quaternion();

		q.setFromAxisAngle( {x:0,y:1,z:0}, THREE.Math.degToRad(laraPos.rotY) );
		
		this.sc.objects.camera1 = {
			"type"  : "PerspectiveCamera",
			"fov"   : this.confMgr.levelFloat(this.sc.levelShortFileName, 'camera > fov', true, 50),
			"near"  : this.confMgr.levelFloat(this.sc.levelShortFileName, 'camera > neardist', true, 50),
			"far"   : this.confMgr.levelFloat(this.sc.levelShortFileName, 'camera > fardist', true, 10000),
			"position": [ camPos.x, camPos.y, camPos.z ],
			"quaternion": [ q.x, q.y, q.z, q.w ]
		}

		this.createMaterials();

		this.createAnimatedTextures();

		this.createMeshes();

		this.createRooms();

		this.createMoveables();

		this.createItems();

		this.createAnimations();

		return this.sc;

	}
}