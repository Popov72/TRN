// create the materials + texture per tile	
function createMaterials(trlevel, sc) {
	sc.materials['TR_room'] = {
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
			"vertexShader": sc.shaderMgr.getVertexShader('room'),
			"fragmentShader": sc.defaults.fog ? sc.shaderMgr.getFragmentShader('standard_fog') : sc.shaderMgr.getFragmentShader('standard'),
			"vertexColors" : true
		}
	};

	sc.materials['TR_mesh'] = {
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
			"vertexShader": trlevel.rversion == 'TR3' || trlevel.rversion == 'TR4' ? sc.shaderMgr.getVertexShader('mesh2') : sc.shaderMgr.getVertexShader('mesh'),
			"fragmentShader": sc.defaults.fog ? sc.shaderMgr.getFragmentShader('standard_fog') : sc.shaderMgr.getFragmentShader('standard'),
			"vertexColors" : true
		}
	};

	sc.materials['TR_moveable'] = {
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
			"vertexShader": sc.shaderMgr.getVertexShader('moveable'),
			"fragmentShader": sc.defaults.fog ? sc.shaderMgr.getFragmentShader('standard_fog') : sc.shaderMgr.getFragmentShader('standard'),
			"vertexColors" : true,
			"skinning": true
		}
	};

	// create one texture per tile	
	for (var i = 0; i < trlevel.textile.length; ++i) {
		sc.textures['texture' + i] = {
			"url": sc.texturePath  + sc.levelShortFileName + "_tile" + i + ".png",
			"anisotropy": 16
		};
	}
}

// Collect the animated textures
function createAnimatedTextures(trlevel, sc) {
	var i = 0, adata = trlevel.animatedTextures, numAnimatedTextures = adata[i++];
	var animatedTextures = [], mapObjTexture2AnimTexture = {};
	while (numAnimatedTextures-- > 0) {
		var numTextures = adata[i++] + 1, snumTextures = numTextures;
		//console.log('Animated texture #' + idxAnimatedTexture + ', num textures=' + numTextures);
		var anmcoords = [];
		while (numTextures-- > 0) {
			var texture = adata[i++], tex = trlevel.objectTextures[texture], tile = tex.tile & 0x7FFF;
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

	sc.animatedTextures = animatedTextures;
	trlevel.mapObjTexture2AnimTexture = mapObjTexture2AnimTexture; // => to know for each objTexture if it is part of an animated texture, and if yes which is its starting position in the sequence

	//console.log('length of animated texture array=' + adata.length + ', final i value=' + i);
}

// create all the meshes of the level
function createMeshes(trlevel, sc) {
	var numExternalLit = 0, numInternalLit = 0;
	for (var i = 0; i < trlevel.meshes.length; ++i) {
		var mesh = trlevel.meshes[i];
		var meshJSON = createNewJSONEmbed();
		var attributes = {
			flags: { type:"v4", value:[] }
		};
		var tiles2material = {};

		var externalLit = makeMeshGeometry(mesh, i, meshJSON, tiles2material, trlevel.objectTextures, trlevel.mapObjTexture2AnimTexture, 0, attributes);

		if (externalLit) numExternalLit++; else numInternalLit++;

		meshJSON._materials = makeMaterialList(tiles2material, attributes, 'mesh');
		for (var m = 0; m < meshJSON._materials.length; ++m) {
			if (trlevel.rversion == 'TR3' || trlevel.rversion == 'TR4') {
				meshJSON._materials[m].uniforms.lighting = { type: "v3", value: new THREE.Vector3(1,1,1) }
			} else {
				meshJSON._materials[m].uniforms.lighting = { type: "f", value: 0.0 }
			}
		}

		sc.embeds['mesh' + i] = meshJSON;
		sc.geometries['mesh' + i] = {
			"type": "embedded",
			"id"  : "mesh" + i
		};
	}
	console.log('Num meshes in level=' + trlevel.meshes.length + ', num externally lit=' + numExternalLit + ', num internally lit=' + numInternalLit);
}


// generate the rooms => one embedded object is created per room
function createRooms(trlevel, sc) {
	// flag the alternate rooms
	for (var m = 0; m < trlevel.rooms.length; ++m) {
		var room = trlevel.rooms[m];
		var alternate = room.alternateRoom;
		if (alternate != -1) {
			trlevel.rooms[alternate].isAlternate = true;
		}
	}
	
	// generate the rooms
	for (var m = 0; m < trlevel.rooms.length; ++m) {
		//if (m != 64 && m != 65) continue;
		var room = trlevel.rooms[m];
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

			switch(trlevel.rversion) {
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
			if (trlevel.rversion == 'TR2' && isFilledWithWater) moveLight = 1;
			if (trlevel.rversion == 'TR2' && isFilledWithWater && (attribute & 0x8000) == 0) moveVertex = 1;
			//if ((rflags & 16) == 0) console.log(m);
			//if ((attribute & 16) == 16 && m == 65) lighting = 255;

			attributes.flags.value.push(new THREE.Vector4(moveLight, isFlickering && strengthEffect ? 1 : 0, moveVertex, -strengthEffect));
			roomJSON.colors.push(lighting);
		}

		// create the tri/quad faces
		makeFaces(roomJSON, [rdata.rectangles, rdata.triangles], tiles2material, trlevel.objectTextures, trlevel.mapObjTexture2AnimTexture, 0);
		
		// add the room to the scene
		sc.embeds['room' + m] = roomJSON;
		sc.geometries['room' + m] = {
			"type": "embedded",
			"id"  : "room" + m
		};
		//var q = new THREE.Quaternion();
		//q.setFromAxisAngle( {x:0,y:1,z:0}, THREE.Math.degToRad() );
		sc.objects['room' + m] = {
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

			var gstaticMesh = findStatichMeshByID(trlevel, objectID);
			if (gstaticMesh == null) continue;

			var mindex = gstaticMesh.mesh, mflags = gstaticMesh.flags;
			var nonCollisionable = (mflags & 1) != 0, visible = (mflags & 2) != 0;

			if (!visible) continue;

			var q = new THREE.Quaternion();
			rot = ((rot & 0xC000) >> 14) * 90;
			q.setFromAxisAngle( { x:0, y:1, z:0}, THREE.Math.degToRad(-rot) );

			if (!sc.embeds['mesh' + mindex]) {
				console.log('Embeds "mesh' + mindex + '" not found - skipping static mesh #' + s + ' (objectID=' + objectID + ')');
				continue;
			}

			var materials = [];
			for (var mat = 0; mat < sc.embeds['mesh' + mindex]._materials.length; ++mat) {
				var material = jQuery.extend(true, {}, sc.embeds['mesh' + mindex]._materials[mat]);
				if (trlevel.rversion == 'TR3' || trlevel.rversion == 'TR4') {
					lightingGlobal = staticMesh.intensity1;
					var b = ((lightingGlobal & 0x7C00) >> 10) << 3, g = ((lightingGlobal & 0x03E0) >> 5) << 3, r = (lightingGlobal & 0x001F) << 3;
					material.uniforms.lighting.value = new THREE.Vector3(r/255, g/255, b/255);
				} else {
					material.uniforms.lighting.value = lightingGlobal;
				}
				materials.push(material);
			}
			
			sc.objects['room' + m + '_staticmesh' + s] = {
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
}

function getNumAnimsForMoveable(trlevel, mindex) {
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

    var startAnim = trlevel.moveables[mindex].animation;
    var nextStartAnim = 0xFFFF;

    var numMoveables = trlevel.moveables.length;

    while (nextStartAnim == 0xFFFF && ++mindex < numMoveables) {
        nextStartAnim = trlevel.moveables[mindex].animation;
    }

    if (mindex == numMoveables) {
        nextStartAnim =  trlevel.animations.length;
    }

    return startAnim != 0xFFFF ? nextStartAnim - startAnim : 0;
}

function getNumAnimsForMoveable2(trlevel, mindex) {
    var anim = trlevel.moveables[mindex].animation;
    var exploredAnim = { };
    var exploreAnim  = [trlevel.moveables[mindex].animation];

    while (exploreAnim.length > 0) {
    	var anmIndex = exploreAnim.splice(0, 1)[0];
    	exploredAnim[anmIndex] = true;

    	var anm = trlevel.animations[anmIndex];
    	if (!exploredAnim[anm.nextAnimation]) {
    		exploreAnim.push(anm.nextAnimation);
    	}
    	var numStateChanges = anm.numStateChanges;
    	for (var i = 0; i < numStateChanges; ++i) {
    		var sch = trlevel.stateChanges[anm.stateChangeOffset + i];
    		var numAnimDispatch = sch.numAnimDispatches;
	    	for (var j = 0; j < numAnimDispatch; ++j) {
	    		var ad = trlevel.animDispatches[sch.animDispatch + j];
		    	if (!exploredAnim[ad.nextAnimation]) {
		    		exploreAnim.push(ad.nextAnimation);
		    	}
	    	}
    	}
    }

    return TRN.objSize(exploredAnim);
}

function createAnimations(trlevel, sc) {
	var animations = [];

	for (var anm = 0; anm < trlevel.animations.length; ++anm) {
		var anim = trlevel.animations[anm];

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

		if (trlevel.rversion == 'TR1') {
			frameStep = trlevel.frames[frameOffset + 9] * 2 + 10;
		}

		var animBones = [];

		for (var key = 0; key < animNumKeys; key++)	{
			var frame = frameOffset + key * frameStep, sframe = frame;

			var BBLoX =  trlevel.frames[frame++], BBHiX =  trlevel.frames[frame++];
			var BBLoY = -trlevel.frames[frame++], BBHiY = -trlevel.frames[frame++];
			var BBLoZ = -trlevel.frames[frame++], BBHiZ = -trlevel.frames[frame++];

			var transX = trlevel.frames[frame++], transY = -trlevel.frames[frame++], transZ = -trlevel.frames[frame++];

			var numAnimatedMeshesUnknown = 99999, numAnimatedMeshes = numAnimatedMeshesUnknown;
			if (trlevel.rversion == 'TR1') {
				numAnimatedMeshes = trlevel.frames[frame++];
			}

			var mesh = 0;
			// Loop through all the meshes of the key
			while (mesh < numAnimatedMeshes) {
				var angleX = 0.0, angleY = 0.0, angleZ = 0.0;

				if (numAnimatedMeshes == numAnimatedMeshesUnknown && (frame-sframe) >= frameStep) break;

			    var frameData = trlevel.frames[frame++];
			    if (frameData < 0) frameData += 65536;

			    if ((frameData & 0xC000) && (trlevel.rversion != 'TR1')) { // single axis of rotation
			        var angle = trlevel.rversion == 'TR4' ? (frameData & 0xFFF) >> 2 : frameData & 0x3FF;

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

			        var frameData2 = trlevel.frames[frame++];
				    if (frameData2 < 0) frameData2 += 65536;

			        if (trlevel.rversion == 'TR1') {
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

	sc.animations = animations;
}

function createMoveables(trlevel, sc) {

	var numMoveables = 0;
	for (var m = 0; m < trlevel.moveables.length; ++m) {
		var moveable = trlevel.moveables[m];

		var numMeshes = moveable.numMeshes, meshIndex = moveable.startingMesh, meshTree = moveable.meshTree;
		var isDummy = numMeshes == 1 && trlevel.meshes[meshIndex].dummy;

		if (sc.geometries['moveable' + moveable.objectID] || isDummy) continue;

		var meshJSON = createNewJSONEmbed();
		var attributes = {
			flags: { type:"v4", value:[] }
		};
		var tiles2material = {};
		var stackIdx = 0, stack = [], parent = -1;
		var px = 0, py = 0, pz = 0, ofsvert = 0, bones = [], skinIndices = [], skinWeights = [];

		for (var idx = 0; idx < numMeshes; ++idx, meshIndex++) {
			if (idx != 0) {
				var sflag = trlevel.meshTrees[meshTree++].coord;
				px = trlevel.meshTrees[meshTree++].coord;
				py = trlevel.meshTrees[meshTree++].coord;
				pz = trlevel.meshTrees[meshTree++].coord;
				if (sflag & 1) {
					if (stackIdx == 0) stackIdx = 1; // some moveables can have stackPtr == -1 without this test... (look in joby1a.tr4 for eg)
					parent = stack[--stackIdx];
				}
				if (sflag & 2) {
					stack[stackIdx++] = parent;
				}
			}

			var mesh = trlevel.meshes[meshIndex];

			makeMeshGeometry(mesh, meshIndex, meshJSON, tiles2material, trlevel.objectTextures, trlevel.mapObjTexture2AnimTexture, ofsvert, attributes, idx, skinIndices, skinWeights);

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

		sc.embeds['moveable' + moveable.objectID] = meshJSON;
		sc.geometries['moveable' + moveable.objectID] = {
			"type": "embedded",
			"id"  : "moveable" + moveable.objectID
		};

		numMoveables++;
	}

	console.log('Num moveables=', numMoveables)
}

function createItems(trlevel, sc) {
	var mapObjID2Index = {};

	for (var m = 0; m < trlevel.moveables.length; ++m) {
		var moveable = trlevel.moveables[m];
		mapObjID2Index[moveable.objectID] = m;
	}

	var numMoveableInstances = 0;
	for (var i = 0; i < trlevel.items.length; ++i) {
		var item = trlevel.items[i];
		var m = mapObjID2Index[item.objectID];
		if (m == null) continue; // not a moveable

		var moveable = trlevel.moveables[m];

		var hasGeometry = sc.embeds['moveable' + moveable.objectID];
		var materials = null;
		if (hasGeometry) {
			materials = [];
			for (var mat = 0; mat < sc.embeds['moveable' + moveable.objectID]._materials.length; ++mat) {
				var material = jQuery.extend(true, {}, sc.embeds['moveable' + moveable.objectID]._materials[mat]);
				material.uniforms.lighting.value = 1.0;
				materials.push(material);
			}
		}

		var q = new THREE.Quaternion();
		q.setFromAxisAngle( {x:0,y:1,z:0}, THREE.Math.degToRad(-(item.angle >> 14) * 90) );

		sc.objects['item' + i] = {
			"geometry" : hasGeometry ? "moveable" + moveable.objectID : null,
			"material" : materials,
			"position" : [ item.x, -item.y, -item.z ],
			"quaternion" : [ q.x, q.y, q.z, q.w ],
			"scale"	   : [ 1, 1, 1 ],
			"visible"  : !trlevel.rooms[item.room].isAlternate,
			"moveable" : moveable.objectID,
			"has_anims": true,
			"roomIndex": item.room,
			"animationStartIndex": moveable.animation,
			"isAlternateRoom" : trlevel.rooms[item.room].isAlternate,
			"skin"	: true,
			"use_vertex_texture" : false
		};

		numMoveableInstances++;
	}

	var skyId = sc.confMgr.levelNumber(sc.levelShortFileName, 'sky > objectid', true, 0);
	if (skyId && mapObjID2Index[skyId]) {
		moveable = trlevel.moveables[mapObjID2Index[skyId]];
		var materials = [];
		for (var mat = 0; mat < sc.embeds['moveable' + moveable.objectID]._materials.length; ++mat) {
			var material = jQuery.extend(true, {}, sc.embeds['moveable' + moveable.objectID]._materials[mat]);
			material.uniforms.lighting.value = 1.0;
			material.depthWrite = false;
			material.depthTest = false;
			materials.push(material);
		}
		var skyNoAnim = sc.confMgr.levelBoolean(sc.levelShortFileName, 'sky > noanim', true, false);
		sc.objects['sky'] = {
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
}

function convert(trlevel, callback_created) {
	var sc =  {
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

	sc.confMgr = trlevel.confMgr;
	sc.shaderMgr = new TRN.ShaderMgr();

	sc.levelFileName = trlevel.filename;
	sc.levelShortFileName = sc.levelFileName.substring(0, sc.levelFileName.indexOf('.')).toLowerCase();
	sc.waterColor = {
		"in" : sc.confMgr.globalColor('water > colorin'),
		"out" : sc.confMgr.globalColor('water > colorout')
	};
	sc.texturePath = "TRN/texture/" + trlevel.rversion.toLowerCase() + "/";
	sc.soundPath = "TRN/sound/" + trlevel.rversion.toLowerCase() + "/";

	// get Lara's position => camera starting point
	var laraPos = { x:0, y:0, z:0, rotY:0 };
	for (var i = 0; i < trlevel.items.length; ++i) {
		var item = trlevel.items[i];
		if (item.objectID == TRN.ObjectID.Lara) {
			laraPos.x = item.x;
			laraPos.y = -item.y;
			laraPos.z = -item.z;
			laraPos.rotY = -(item.angle >> 14) * 90;
			break;
		}
	}

	var laraAngle = sc.confMgr.levelFloat(sc.levelShortFileName, 'moveables > moveable[id="' + TRN.ObjectID.Lara + '"] > angle');
	if (laraAngle != undefined) {
		laraPos.rotY = laraAngle;
	}

	if (trlevel.numCinematicFrames > 0) {
		sc.cutScene.frames = trlevel.cinematicFrames;
		sc.cutScene.origin = laraPos;
		sc.cutScene.animminid = sc.confMgr.levelNumber(sc.levelShortFileName, 'cutscene > animminid', true, 0);
		sc.cutScene.animmaxid = sc.confMgr.levelNumber(sc.levelShortFileName, 'cutscene > animmaxid', true, 0);
	}	

	var camPos = { x:laraPos.x, y:laraPos.y, z:laraPos.z, rotY:laraPos.rotY }
	if (!sc.cutScene.frames) {
		var ofstDir = sc.confMgr.levelFloat(sc.levelShortFileName, 'moveables > moveable[id="' + TRN.ObjectID.Lara + '"] > behaviour[name="Lara"] > dirdist', true, 0.0);
		var ofstUp = sc.confMgr.levelFloat(sc.levelShortFileName, 'moveables > moveable[id="' + TRN.ObjectID.Lara + '"] > behaviour[name="Lara"] > updist', true, 0.0);

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
	
	sc.objects.camera1 = {
		"type"  : "PerspectiveCamera",
		"fov"   : sc.confMgr.levelFloat(sc.levelShortFileName, 'camera > fov', true, 50),
		"near"  : sc.confMgr.levelFloat(sc.levelShortFileName, 'camera > neardist', true, 50),
		"far"   : sc.confMgr.levelFloat(sc.levelShortFileName, 'camera > fardist', true, 10000),
		"position": [ camPos.x, camPos.y, camPos.z ],
		"quaternion": [ q.x, q.y, q.z, q.w ]
	}

	createMaterials(trlevel, sc);

	createAnimatedTextures(trlevel, sc);
	//trlevel.mapObjTexture2AnimTexture = {};
	//sc.animatedTextures = [];

	createMeshes(trlevel, sc);

	createRooms(trlevel, sc);

	createMoveables(trlevel, sc);

	createItems(trlevel, sc);

	createAnimations(trlevel, sc);

	if (sc.cutScene.frames) {
		var context = typeof(webkitAudioContext) != 'undefined' ? new webkitAudioContext() : typeof(AudioContext) != 'undefined' ? new AudioContext() : null;
		if (context != null) {
			var bufferLoader = new BufferLoader(
				context,
				[
				  sc.soundPath + sc.levelShortFileName.toUpperCase(),
				],
				function finishedLoading(bufferList, err) {
					if (bufferList != null && bufferList.length > 0) {
						sc.cutScene.sound = context.createBufferSource();
						sc.cutScene.sound.buffer = bufferList[0];
						sc.cutScene.sound.connect(context.destination);
					} else {
						console.log('Error when loading sound. ', err);
					}
					if (callback_created != null) callback_created(sc, laraPos);
				}
			);
			bufferLoader.load();
		} else {
			if (callback_created != null) callback_created(sc, laraPos);
		}
	} else {

		if (callback_created != null) callback_created(sc, laraPos);
	}

}
