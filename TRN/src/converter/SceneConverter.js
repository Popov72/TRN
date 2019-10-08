/*
	Convert the JSON object created by the raw level loader to a higher level JSON scene
*/
TRN.SceneConverter = function() {

	this.shaderMgr = new TRN.ShaderManager();

	return this;
};

TRN.SceneConverter.prototype = {

	constructor : TRN.SceneConverter,

	// create one texture per tile	
	createTextures : function () {

		// create one texture per tile	
		for (var i = 0; i < this.sc.data.trlevel.textile.length; ++i) {
			var name = 'texture' + i;
			this.sc.textures.push({
                "uuid": name,
                "name": name,
                "anisotropy": 16,
                "flipY": false,
                "image": name,
                "wrap": [1001, 1001], /* 1001=ClampToEdgeWrapping */
                "minFilter": 1006, /* 1006=LinearFilter */
                "magFilter": 1006
            });

			this.sc.images.push({
                "uuid": name,
				"url": this.sc.data.trlevel.textile[i]
			});
		}
	},

	// Collect the animated textures
	createAnimatedTextures : function () {
		var i = 0, adata = this.sc.data.trlevel.animatedTextures, numAnimatedTextures = adata[i++];
		var animatedTextures = [], mapObjTexture2AnimTexture = {};
		while (numAnimatedTextures-- > 0) {
			var numTextures = adata[i++] + 1, snumTextures = numTextures;
			var anmcoords = [];
			while (numTextures-- > 0) {
				var texture = adata[i++], tex = this.sc.data.trlevel.objectTextures[texture], tile = tex.tile & 0x7FFF;
				var isTri = (tex.tile & 0x8000) != 0;

			    var minU = 0x7FFF, minV = 0x7FFF, numVertices = isTri ? 3 : 4;

		    	mapObjTexture2AnimTexture[texture] = { idxAnimatedTexture:animatedTextures.length, pos:snumTextures-numTextures-1 };

			    for (var j = 0; j < numVertices; j++) {
			        var u = tex.vertices[j].Xpixel;
			        var v = tex.vertices[j].Ypixel;

			        if (minU > u) minU = u; if (minV > v) minV = v;
			    }

			    anmcoords.push({ minU:(minU+0.5)/this.sc.data.trlevel.atlas.width, minV:(minV+0.5)/this.sc.data.trlevel.atlas.height, texture:"texture" + tile});
			}

			animatedTextures.push({
				"animcoords": anmcoords,
				"animspeed" : this.sc.data.trlevel.rversion == 'TR1' ? 5 : this.sc.data.trlevel.rversion == 'TR2' ? 6 : 14,
				"scrolltexture" : (animatedTextures.length < this.sc.data.trlevel.animatedTexturesUVCount)
			});
		}

		this.sc.data.animatedTextures = animatedTextures;
		this.sc.data.trlevel.mapObjTexture2AnimTexture = mapObjTexture2AnimTexture; // => to know for each objTexture if it is part of an animated texture, and if yes which is its starting position in the sequence
	},

    createAllStaticMeshes : function() {
		for (let s = 0; s < this.sc.data.trlevel.staticMeshes.length; ++s) {
            const smesh = this.sc.data.trlevel.staticMeshes[s],
                  meshIndex = smesh.mesh,
                  objectID = smesh.objectID,
                  flags = smesh.flags;

            const mesh = this.sc.data.trlevel.meshes[meshIndex];
            const meshJSON = this.createNewGeometryData();
            
            var tiles2material = {};
    
            this.makeMeshGeometry(mesh, meshIndex, meshJSON, tiles2material, this.sc.data.trlevel.objectTextures, this.sc.data.trlevel.mapObjTexture2AnimTexture);
    
            const materials = this.makeMaterialList(tiles2material, 'mesh', 'mesh' + meshIndex);
            
            meshJSON.groups = [];
            
            for (let i = 0, ofst = 0; i < meshJSON.indices.length; ++i) {
                const indices = meshJSON.indices[i];
                meshJSON.groups.push({ "start":ofst, "count":indices.length, "materialIndex":i });
                ofst += indices.length;
                meshJSON.index.array.push.apply(meshJSON.index.array, indices);
            }

            delete meshJSON.indices;
            delete meshJSON.vertices;
            delete meshJSON.colors;
            delete meshJSON._flags;

            this.sc.geometries.push({
                "uuid": 'mesh' + meshIndex,
                "type": "BufferGeometry",
                "data": meshJSON
            });
    
            const meshid = 'staticmesh' + objectID;

            this.sc.materials.push(...materials);

            this.objects.push({
                "uuid"          : meshid,
                "type"          : "Mesh",
                "name"          : meshid,
                "geometry" 		: 'mesh' + meshIndex,
                "material" 		: materials.map( (m) => m.uuid ),
                "position" 		: [ 0, 0, 0 ],
                "quaternion" 	: [ 0, 0, 0, 1 ],
                "scale"	   		: [ 1, 1, 1 ]
            });
            
            this.sc.data.objects[meshid] = {
                "type"			: 'staticmesh',
                "raw"           : smesh,
                "roomIndex"		: -1,
                "objectid"      : objectID,
                "visible"  		: false,
                "flags"         : flags
            };
        }
    },

    createAllSprites : function() {
        for (var s = 0; s < this.sc.data.trlevel.spriteTextures.length; ++s) {
            var sprite = this.sc.data.trlevel.spriteTextures[s];

            const geometry = this.createSpriteSeq(s);

            const spriteid = 'sprite' + s;

            this.sc.materials.push(...geometry.materials);

            this.objects.push({
                "uuid"          : spriteid,
                "type"          : "Mesh",
                "name"          : spriteid,
                "geometry" 		: geometry.uuid,
                "material" 		: geometry.materials.map( (m) => m.uuid ),
                "position" 		: [ 0, 0, 0 ],
                "quaternion" 	: [ 0, 0, 0, 1 ],
                "scale"	   		: [ 1, 1, 1 ]
            });

            this.sc.data.objects[spriteid] = {
                "type"			: 'sprite',
                "raw"           : sprite,
                "roomIndex"		: -1,
                "objectid"      : s,
                "visible"  		: false
            };
        }
    },

	//  create a sprite sequence: if there's more than one sprite in the sequence, we create an animated texture
	createSpriteSeq : function (spriteSeq) {

		var spriteIndex, numSprites = 1, spriteid;

		if (typeof(spriteSeq) == 'number') {
			// case where this function is called to create a single sprite in a room

			spriteIndex = spriteSeq;
			spriteSeq = null;
			spriteid = 'sprite' + spriteIndex;  

			if (spriteIndex >= this.sc.data.trlevel.spriteTextures.length) {
				console.log('spriteindex', spriteIndex, 'is too big: only', this.sc.data.trlevel.spriteTextures.length, 'sprites in this.sc.data.trlevel.spriteTextures !');
				return false;
			}

		} else {
			// case where this function is called to create a sprite sequence

			spriteIndex = spriteSeq.offset;
			numSprites = -spriteSeq.negativeLength;
			spriteid = 'spriteseq' + spriteSeq.objectID;
		}

		var sprite = this.sc.data.trlevel.spriteTextures[spriteIndex];
		var meshJSON = this.createNewGeometryData();
		var tiles2material = {};

        delete meshJSON.attributes.color;
        delete meshJSON.attributes._flags;

		meshJSON.vertices.push(sprite.leftSide,  -sprite.topSide,       0);
		meshJSON.vertices.push(sprite.leftSide,  -sprite.bottomSide,    0);
		meshJSON.vertices.push(sprite.rightSide, -sprite.bottomSide,    0);
		meshJSON.vertices.push(sprite.rightSide, -sprite.topSide,       0);

		var texturedRectangles = [
			{
				vertices: [0,1,2,3],
				texture: 0x8000,
			}
		];
		var width = (sprite.width-255)/256;
		var height = (sprite.height-255)/256;
		var row = 0, col = 0, tile = sprite.tile;
		if (this.sc.data.trlevel.atlas.make) {
			row = Math.floor(tile / this.sc.data.trlevel.atlas.numColPerRow), col = tile - row * this.sc.data.trlevel.atlas.numColPerRow;
			tile = 0;
		}
		var objectTextures = [
			{
				attributes: 0,
                tile: tile,
                origTile: tile,
				vertices: [
					{ Xpixel: sprite.x + col * 256, 		Ypixel: sprite.y + row * 256 },
					{ Xpixel: sprite.x + col * 256, 		Ypixel: sprite.y+height-1 + row * 256 },
					{ Xpixel: sprite.x+width-1 + col * 256, Ypixel: sprite.y+height-1 + row * 256 },
					{ Xpixel: sprite.x+width-1 + col * 256, Ypixel: sprite.y + row * 256 }
				]
			}
		];

	    var mapObjTexture2AnimTexture = {};

	    if (numSprites > 1 && this.sc.data.animatedTextures) {
			var anmcoords = [];
		    mapObjTexture2AnimTexture[0] = { idxAnimatedTexture:this.sc.data.animatedTextures.length, pos:0 };
			for (var i = 0; i < numSprites; ++i) {
                sprite = this.sc.data.trlevel.spriteTextures[spriteIndex + i];
                tile = sprite.tile;
				if (this.sc.data.trlevel.atlas.make) {
					row = Math.floor(tile / this.sc.data.trlevel.atlas.numColPerRow), col = tile - row * this.sc.data.trlevel.atlas.numColPerRow;
					tile = 0;
				}
			    anmcoords.push({ minU:(sprite.x + col * 256 + 0.5)/this.sc.data.trlevel.atlas.width, minV:(sprite.y + row * 256 + 0.5)/this.sc.data.trlevel.atlas.height, texture:"texture" + tile});
			}
			this.sc.data.animatedTextures.push({
				"animcoords": anmcoords,
				"animspeed" : 20
			});
		}

		this.makeFaces(meshJSON, [texturedRectangles], tiles2material, objectTextures, mapObjTexture2AnimTexture, 0);

        const materials = this.makeMaterialList(tiles2material, 'sprite', spriteid);

        meshJSON.groups = [];
            
        for (let i = 0, ofst = 0; i < meshJSON.indices.length; ++i) {
            const indices = meshJSON.indices[i];
            meshJSON.groups.push({ "start":ofst, "count":indices.length, "materialIndex":i });
            ofst += indices.length;
            meshJSON.index.array.push.apply(meshJSON.index.array, indices);
        }

        delete meshJSON.indices;
        delete meshJSON.vertices;
        delete meshJSON.colors;
        delete meshJSON._flags;

		this.sc.geometries.push({
            "uuid": spriteid,
			"type": "BufferGeometry",
			"data": meshJSON
		});

        return { 
            "uuid": spriteid,
            "materials": materials
        };
	},

	// generate the rooms + static meshes + sprites in the room
	createRooms : function () {
		// flag the alternate rooms
		for (var m = 0; m < this.sc.data.trlevel.rooms.length; ++m) {
			this.sc.data.trlevel.rooms[m].isAlternate = false;
        }
        
		for (var m = 0; m < this.sc.data.trlevel.rooms.length; ++m) {
			var room = this.sc.data.trlevel.rooms[m];
            var alternate = room.alternateRoom;
            if (alternate != -1) {
                this.sc.data.trlevel.rooms[alternate].isAlternate = true;
            }
		}
		
		var maxLightsInRoom = 0, roomL = -1;

		// generate the rooms
		for (var m = 0; m < this.sc.data.trlevel.rooms.length; ++m) {
			//if (m != 10) continue;
			var room = this.sc.data.trlevel.rooms[m];
			var info = room.info, rdata = room.roomData, rflags = room.flags, lightMode = room.lightMode;
			var isFilledWithWater = (rflags & 1) != 0, isFlickering = (lightMode == 1);
            
            const roomMesh = {
                "uuid"              : "room" + m,
                "type"              : "Mesh",
                "name"              : "room" + m,
				"geometry" 			: "room" + m,
				"position" 			: [ 0, 0, 0 ],
				"quaternion" 		: [ 0, 0, 0, 1 ],
				"scale"	   			: [ 1, 1, 1 ]
            };
            
            this.objects.push(roomMesh);

            var roomData = {
				"type"				: 'room',
                "raw"               : room,
				"isAlternateRoom" 	: room.isAlternate,
				"filledWithWater"	: isFilledWithWater,
				"flickering"		: isFlickering,
                "roomIndex"			: m,
                "objectid"          : m,
				"visible"  			: !room.isAlternate
            };

            this.sc.data.objects['room' + m] = roomData;

            // lights in the room
			if (room.lights.length > maxLightsInRoom) {
				maxLightsInRoom = room.lights.length;
				roomL = m;
			}

			var ambientColor = glMatrix.vec3.create();
			if (this.sc.data.trlevel.rversion != 'TR4') {
				var ambient1 = 1.0 - room.ambientIntensity1/0x2000;
				glMatrix.vec3.set(ambientColor, ambient1, ambient1, ambient1);
			} else {
				var rc = room.roomColour;
				ambientColor[0] = ((rc & 0xFF0000) >> 16) / 255.0;
				ambientColor[1] = ((rc & 0xFF00) >> 8)  / 255.0;
				ambientColor[2] = (rc & 0xFF)  / 255.0;
			}

			var lights = [];
			for (var l = 0; l < room.lights.length; ++l) {
				var light = room.lights[l], color = [1,1,1];
				var px = light.x, py = -light.y, pz = -light.z;
				var fadeIn = 0, fadeOut = 0;
				var plight = { type:'point' };
				switch(this.sc.data.trlevel.rversion) {
					case 'TR1':
					case 'TR2':
						var intensity = light.intensity1;
		                if (intensity > 0x2000) intensity = 0x2000;
		                intensity = intensity / 0x2000;
		                glMatrix.vec3.set(color, intensity, intensity, intensity);
		                fadeOut = light.fade1;
						break;
					case 'TR3':
		                var r = light.color.r / 255.0;
		                var g = light.color.g / 255.0;
		                var b = light.color.b / 255.0;
		                var intensity = light.intensity;
		                if (intensity > 0x2000) intensity = 0x2000; // without this test, cut5 in TR3 (for eg) is wrong
		                intensity = intensity / 0x2000;
		                glMatrix.vec3.set(color, r*intensity, g*intensity, b*intensity);
		                fadeOut = light.fade;
						break;
					case 'TR4':
						if (light.lightType > 2) {
							// todo: handling of shadow / fog bulb lights
							//console.log('light not handled because of type ' + light.lightType + ' in room ' + m, room)
							continue;
						}
		                var r = light.color.r / 255.0;
		                var g = light.color.g / 255.0;
		                var b = light.color.b / 255.0;
		                var intensity = light.intensity;
		                if (intensity > 32) intensity = 32;
		                intensity = intensity / 16.0;
		                glMatrix.vec3.set(color, r*intensity, g*intensity, b*intensity);
		                switch (light.lightType) {
		                	case 0: // directional light
		                		var bb = this.getBoundingBox(room.roomData.vertices);
		                		px = (bb[0] + bb[1]) / 2.0 + info.x;
		                		py = -(bb[2] + bb[3]) / 2.0;
		                		pz = -(bb[4] + bb[5]) / 2.0 - info.z;
		                		fadeOut = Math.sqrt((bb[1]-bb[0])*(bb[1]-bb[0]) + (bb[3]-bb[2])*(bb[3]-bb[2]) + (bb[5]-bb[4])*(bb[5]-bb[4]));
		                		plight.type = 'directional';
		                		plight.dx = light.dx;
		                		plight.dy = -light.dy;
		                		plight.dz = -light.dz;
		                		break;
		                	case 1: // point light
		                		fadeIn = light.in;
		                		fadeOut = light.out;
		                		break;
		                	case 2: // spot light
		                		fadeIn = light.length;
		                		fadeOut = light.cutOff;
		                		if (fadeOut < fadeIn) {
		                			fadeIn = fadeOut;
		                			fadeOut = light.length;
		                		}
		                		plight.dx = light.dx;
		                		plight.dy = -light.dy;
		                		plight.dz = -light.dz;
		                		plight.coneCos = light.out;
		                		plight.penumbraCos = light.in;
		                		if (plight.coneCos > plight.penumbraCos) {
		                			console.log('pb param spot room#' + room.roomIndex, light, room);
		                		}
				                plight.type = 'spot';
		                		break;
		                }
						break;
				}
		        if (fadeOut > 0x7FFF) fadeOut = 0x8000;
		        if (fadeIn > fadeOut) fadeIn = 0;
		        plight.x = px;
		        plight.y = py;
		        plight.z = pz;
		        plight.color = color;
		        plight.fadeIn = fadeIn;
		        plight.fadeOut = fadeOut;
				lights.push(plight);
			}

			roomData.lights = lights;
			roomData.ambientColor = ambientColor;

            // room geometry
            var roomJSON = this.createNewGeometryData();
            
			var tiles2material = {};

			// push the vertices + vertex colors of the room
			for (var v = 0; v < rdata.vertices.length; ++v) {
				var rvertex = rdata.vertices[v];
				var vertexInfo = this.processRoomVertex(rvertex, isFilledWithWater);

				roomJSON.vertices.push(vertexInfo.x+info.x, vertexInfo.y, vertexInfo.z-info.z);
				roomJSON.colors.push(vertexInfo.color2[0], vertexInfo.color2[1], vertexInfo.color2[2]);
				roomJSON._flags.push(vertexInfo.flag[0], vertexInfo.flag[1], vertexInfo.flag[2], vertexInfo.flag[3]);
			}

			// create the tri/quad faces
			this.makeFaces(roomJSON, [rdata.rectangles, rdata.triangles], tiles2material, this.sc.data.trlevel.objectTextures, this.sc.data.trlevel.mapObjTexture2AnimTexture, 0);
            
            const materials = this.makeMaterialList(tiles2material, 'room', 'room' + m);

            this.sc.materials.push(...materials);

            if (materials.length != roomJSON.indices.length) {
                console.log('Pb in room geometry!', materials, roomJSON.indices);
            }

            roomJSON.groups = [];
            
            for (let i = 0, ofst = 0; i < roomJSON.indices.length; ++i) {
                const indices = roomJSON.indices[i];
                roomJSON.groups.push({ "start":ofst, "count":indices.length, "materialIndex":i });
                ofst += indices.length;
                roomJSON.index.array.push.apply(roomJSON.index.array, indices);
            }

            delete roomJSON.indices;
                        
			// add the room geometry to the scene
			this.sc.geometries.push({
                "uuid": "room" + m,
				"type": "BufferGeometry",
				"data": roomJSON
            });
            
            roomMesh.material = materials.map( (m) => m.uuid );

			// portal in the room
			var portals = [];
			for (var p = 0; p < room.portals.length; ++p) {
				var portal = room.portals[p];
				portals.push({
					"adjoiningRoom": portal.adjoiningRoom,
					"normal": { x:portal.normal.x, y:-portal.normal.y, z:-portal.normal.z },
					"vertices": [
						{ x:(portal.vertices[0].x+info.x), y:-portal.vertices[0].y, z:(-portal.vertices[0].z-info.z) },
						{ x:(portal.vertices[1].x+info.x), y:-portal.vertices[1].y, z:(-portal.vertices[1].z-info.z) },
						{ x:(portal.vertices[2].x+info.x), y:-portal.vertices[2].y, z:(-portal.vertices[2].z-info.z) },
						{ x:(portal.vertices[3].x+info.x), y:-portal.vertices[3].y, z:(-portal.vertices[3].z-info.z) }
					]
				});
            }
            
			roomData.portals = portals;
		}

		console.log('num max lights in a single room=' + maxLightsInRoom + '. room=' + roomL)
	},

	createAnimations : function () {
		var animTracks = [];

		for (var anm = 0; anm < this.sc.data.trlevel.animations.length; ++anm) {
			var anim = this.sc.data.trlevel.animations[anm];

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

			if (this.sc.data.trlevel.rversion == 'TR1') {
				frameStep = this.sc.data.trlevel.frames[frameOffset + 9] * 2 + 10;
			}

			var animKeys = [];

			for (var key = 0; key < animNumKeys; key++)	{
				var frame = frameOffset + key * frameStep, sframe = frame;

				var BBLoX =  this.sc.data.trlevel.frames[frame++], BBHiX =  this.sc.data.trlevel.frames[frame++];
				var BBLoY = -this.sc.data.trlevel.frames[frame++], BBHiY = -this.sc.data.trlevel.frames[frame++];
				var BBLoZ = -this.sc.data.trlevel.frames[frame++], BBHiZ = -this.sc.data.trlevel.frames[frame++];

				var transX = this.sc.data.trlevel.frames[frame++], transY = -this.sc.data.trlevel.frames[frame++], transZ = -this.sc.data.trlevel.frames[frame++];

				var numAnimatedMeshesUnknown = 99999, numAnimatedMeshes = numAnimatedMeshesUnknown;
				if (this.sc.data.trlevel.rversion == 'TR1') {
					numAnimatedMeshes = this.sc.data.trlevel.frames[frame++];
				}

				var mesh = 0, keyData = [];
				// Loop through all the meshes of the key
				while (mesh < numAnimatedMeshes) {
					var angleX = 0.0, angleY = 0.0, angleZ = 0.0;

					if (numAnimatedMeshes == numAnimatedMeshesUnknown && (frame-sframe) >= frameStep) break;

				    var frameData = this.sc.data.trlevel.frames[frame++];
				    if (frameData < 0) frameData += 65536;

				    if ((frameData & 0xC000) && (this.sc.data.trlevel.rversion != 'TR1')) { // single axis of rotation
				        var angle = this.sc.data.trlevel.rversion == 'TR4' ? (frameData & 0xFFF) >> 2 : frameData & 0x3FF;

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

				        var frameData2 = this.sc.data.trlevel.frames[frame++];
					    if (frameData2 < 0) frameData2 += 65536;

				        if (this.sc.data.trlevel.rversion == 'TR1') {
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

					var qx = glMatrix.quat.create(), qy = glMatrix.quat.create(), qz = glMatrix.quat.create();

					glMatrix.quat.setAxisAngle(qx, [1,0,0], angleX);
					glMatrix.quat.setAxisAngle(qy, [0,1,0], -angleY);
					glMatrix.quat.setAxisAngle(qz, [0,0,1], -angleZ);

					glMatrix.quat.multiply(qy, qy, qx);
					glMatrix.quat.multiply(qy, qy, qz);

                    keyData.push({
                        "position": 	{ x:transX, y:transY, z:transZ },
                        "quaternion":	{ x:qy[0], y:qy[1], z:qy[2], w:qy[3] }
                    });

					transX = transY = transZ = 0;

					mesh++;
				}

				animKeys.push({
					"time": 		key * anim.frameRate, 
					"boundingBox": 	{ xmin:BBLoX, ymin:BBHiY, zmin:BBHiZ, xmax:BBHiX, ymax:BBLoY, zmax:BBLoZ },
					"data":  		keyData
				});

			}

			var animCommands = [], numAnimCommands = anim.numAnimCommands;

			if (numAnimCommands < 0x100) {
				var aco = anim.animCommand;
				for (var ac = 0; ac < numAnimCommands; ++ac) {
					var cmd = this.sc.data.trlevel.animCommands[aco++].value, numParams = TRN.Animation.Commands.numParams[cmd];

					var command = {
						"cmd": cmd,
						"params": []
					};

					while (numParams-- > 0) {
						command.params.push(this.sc.data.trlevel.animCommands[aco++].value);
					}
					
					animCommands.push(command);
				}
			} else {
				console.log('Invalid num anim commands (' + numAnimCommands + ') ! ', anim);
			}

			if (this.sc.data.trlevel.animations[anim.nextAnimation] != undefined) // to avoid bugging for lost artifact TR3 levels
				animTracks.push({
					"name": 			"anim" + anm,
					"numKeys":  		animNumKeys,
					"numFrames":  		numFrames,
					"frameRate": 		anim.frameRate,
					"fps":  			animFPS,
					"nextTrack":  		anim.nextAnimation,
					"nextTrackFrame": 	anim.nextFrame - this.sc.data.trlevel.animations[anim.nextAnimation].frameStart,
					"keys":  			animKeys,
					"commands":     	animCommands,
					"frameStart":    	anim.frameStart
				});

		}

		this.sc.data.animTracks = animTracks;

	},

    createAllMoveables : function() {
		var objIdAnim  = this.confMgr.param('behaviour[name="ScrollTexture"]', true, true);
        var lstIdAnim  =  {};
        
        if (objIdAnim) {
            for (var i = 0; i < objIdAnim.size(); ++i) {
                var node = objIdAnim[i];
                lstIdAnim[parseInt(node.getAttribute("objectid"))] = true;
            }
        }

        for (var m = 0; m < this.sc.data.trlevel.moveables.length; ++m) {
            var moveable = this.sc.data.trlevel.moveables[m];

            this.createMoveable(moveable, lstIdAnim);
        }
    },

	createMoveable : function(moveable, lstIdAnim) {
		var jsonid = 'moveable' + moveable.objectID;

		var objIDForVisu = this.confMgr.number('moveable[id="' + moveable.objectID + '"] > visuid', true, moveable.objectID);

        const moveableGeom = this.sc.data.trlevel.moveables[this.movObjID2Index[objIDForVisu]];

        var numMeshes = moveableGeom.numMeshes, meshIndex = moveableGeom.startingMesh, meshTree = moveableGeom.meshTree;
        var moveableIsExternallyLit = false, materials = null, meshJSON = null;
        var isDummy = numMeshes == 1 && this.sc.data.trlevel.meshes[meshIndex].dummy && !moveableGeom.objectID == this.laraObjectID;

        if (!isDummy) {
            meshJSON = this.createNewGeometryData();

            delete meshJSON.attributes.color;

            var tiles2material = {};
            var stackIdx = 0, stack = [], parent = -1;
            var px = 0, py = 0, pz = 0, bones = [];

            meshJSON.objHasScrollAnim = moveableGeom.objectID in lstIdAnim;

            meshJSON.attributes['skinIndex'] = {
                "itemSize": 4,
                "type": "Float32Array",
                "array": [],
                "normalized": false
            }
            meshJSON.attributes['skinWeight'] = {
                "itemSize": 4,
                "type": "Float32Array",
                "array": [],
                "normalized": false
            }

            for (var idx = 0; idx < numMeshes; ++idx, meshIndex++) {
                if (idx != 0) {
                    var sflag = this.sc.data.trlevel.meshTrees[meshTree++].coord;
                    px = this.sc.data.trlevel.meshTrees[meshTree++].coord;
                    py = this.sc.data.trlevel.meshTrees[meshTree++].coord;
                    pz = this.sc.data.trlevel.meshTrees[meshTree++].coord;
                    if (sflag & 1) {
                        if (stackIdx == 0) stackIdx = 1; // some moveables can have stackPtr == -1 without this test... (look in joby1a.tr4 for eg)
                        parent = stack[--stackIdx];
                    }
                    if (sflag & 2) {
                        stack[stackIdx++] = parent;
                    }
                }

                var mesh = this.sc.data.trlevel.meshes[meshIndex];

                if ((mesh.dummy && this.sc.data.trlevel.rversion == 'TR4') || (idx == 0 && this.sc.data.trlevel.rversion == 'TR4' && moveableGeom.objectID == TRN.ObjectID.LaraJoints)) {
                    // hack to remove bad data from joint #0 of Lara joints in TR4
                } else {
                    var internalLit = this.makeMeshGeometry(mesh, meshIndex, meshJSON, tiles2material, this.sc.data.trlevel.objectTextures, this.sc.data.trlevel.mapObjTexture2AnimTexture, idx);
                    
                    moveableIsExternallyLit = moveableIsExternallyLit || !internalLit;
                }

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

            materials = this.makeMaterialList(tiles2material, 'moveable', jsonid);

            meshJSON.groups = [];
            
            for (let i = 0, ofst = 0; i < meshJSON.indices.length; ++i) {
                const indices = meshJSON.indices[i];
                meshJSON.groups.push({ "start":ofst, "count":indices.length, "materialIndex":i });
                ofst += indices.length;
                meshJSON.index.array.push.apply(meshJSON.index.array, indices);
            }

            delete meshJSON.indices;
            delete meshJSON.vertices;
            delete meshJSON.colors;
            delete meshJSON._flags;

            this.sc.geometries.push({
                "uuid": jsonid,
                "type": "BufferGeometry",
                "data": meshJSON
            });
            
            if (materials) {
                this.sc.materials.push(...materials);
            }

            this.objects.push({
                "uuid"                  : jsonid,
                "type"                  : "Mesh",
                "name"                  : jsonid,
                "geometry" 				: !isDummy ? jsonid : null,
                "material" 				: !isDummy ? materials.map( (m) => m.uuid ) : null,
                "position" 				: [ 0, 0, 0 ],
                "quaternion" 			: [ 0, 0, 0, 1 ],
                "scale"	   				: [ 1, 1, 1 ]
            });

            this.sc.data.objects[jsonid] = {
                "type"   				: 'moveable',
                "raw"                   : moveable,
                "has_anims"				: !isDummy,
                "numAnimations"         : !isDummy ? moveable.numAnimations : 0,
                "roomIndex"				: -1,
                "animationStartIndex"	: moveable.animation,
                "objectid"              : moveable.objectID,
                "visible"  				: false,
                "bonesStartingPos"      : !isDummy ? meshJSON.bones : null,
                "internallyLit"         : !moveableIsExternallyLit
            }
        }
	},

    createAllSpriteSequences : function() {
        for (let s = 0; s < this.sc.data.trlevel.spriteSequences.length; ++s) {
            const spriteSeq = this.sc.data.trlevel.spriteSequences[s];

            this.createSpriteSequence(spriteSeq);
        }
    },

	createSpriteSequence : function(spriteSeq) {
        const geometry = this.createSpriteSeq(spriteSeq);
    
        const spriteid = 'spriteseq' + spriteSeq.objectID;

        this.sc.materials.push(...geometry.materials);

        this.objects.push({
            "uuid"          : spriteid,
            "type"          : "Mesh",
            "name"          : spriteid,
            "geometry" 	    : geometry.uuid,
            "material" 		: geometry.materials.map( (m) => m.uuid ),
            "position" 	    : [ 0, 0, 0 ],
            "quaternion"    : [ 0, 0, 0, 1 ],
            "scale"	   	    : [ 1, 1, 1 ]
        });
        
        this.sc.data.objects[spriteid] = {
            "type" 	        : 'spriteseq',
            "raw"           : spriteSeq,
            "roomIndex"	    : -1,
            "objectid"      : spriteSeq.objectID,
            "visible"  	    : false
        }
	},

    // remove animations for moveables that have a single animation with a single keyframe
    optimizeAnimations : function () {

        var numOptimized = 0;

        for (var i = 0; i < this.objects.length; ++i) {
            var objJSON = this.objects[i], data = this.sc.data.objects[objJSON.name];

            if (!data.has_anims) continue;

            var track = this.sc.data.animTracks[data.animationStartIndex];

            if (!track || track.nextTrack != data.animationStartIndex) { // the moveable has more than one anim
                continue;
            }

            if (track.commands.length == 0 && track.numFrames == 1 && track.keys.length == 1 && track.keys[0].data.length == 1 && data.numAnimations == 1) {
                var qobj = objJSON.quaternion;
                var qanim = [track.keys[0].data[0].quaternion.x, track.keys[0].data[0].quaternion.y, track.keys[0].data[0].quaternion.z, track.keys[0].data[0].quaternion.w];
                var trans = [track.keys[0].data[0].position.x, track.keys[0].data[0].position.y, track.keys[0].data[0].position.z];

                var qobjinv = [0,0,0,0];

                glMatrix.quat.invert(qobjinv, qobj);

                glMatrix.vec3.transformQuat(trans, trans, qobj)

                objJSON.position[0] += trans[0];
                objJSON.position[1] += trans[1];
                objJSON.position[2] += trans[2];

                glMatrix.quat.multiply(qobj, qobj, qanim);

                objJSON.quaternion = qobj;

                data.has_anims = false;

                numOptimized++;

                //console.log('Anim for object', objID, ' optimized');
            }

        }

        console.log('Number of moveables optimized for animations=' + numOptimized);

    },

    createVertexNormals : function() {

        var vA, vB, vC, vD;
        var cb, ab, db, dc, bc, cross;

        for (var i = 0; i < this.sc.geometries.length; ++i) {
            var geom = this.sc.geometries[i].data;
            var vertices = geom.attributes.position.array, indices = geom.index.array;

            var normals = geom.attributes.normal.array;

            for (var v = 0; v < vertices.length; ++v) {
                normals.push(0);
            }

            var f = 0;
            while (f < indices.length) {
                vA = [ vertices[ indices[ f + 0 ] * 3 + 0 ], vertices[ indices[ f + 0 ] * 3 + 1 ], vertices[ indices[ f + 0 ] * 3 + 2 ] ];
                vB = [ vertices[ indices[ f + 1 ] * 3 + 0 ], vertices[ indices[ f + 1 ] * 3 + 1 ], vertices[ indices[ f + 1 ] * 3 + 2 ] ];
                vC = [ vertices[ indices[ f + 2 ] * 3 + 0 ], vertices[ indices[ f + 2 ] * 3 + 1 ], vertices[ indices[ f + 2 ] * 3 + 2 ] ];

                cb = [ vC[0] - vB[0], vC[1] - vB[1], vC[2] - vB[2] ];
                ab = [ vA[0] - vB[0], vA[1] - vB[1], vA[2] - vB[2] ];
                cross = [ 
                    cb[1] * ab[2] - cb[2] * ab[1],
                    cb[2] * ab[0] - cb[0] * ab[2],
                    cb[0] * ab[1] - cb[1] * ab[0]
                ];

                normals[ indices[ f + 0 ] * 3 + 0 ] += cross[0]; normals[ indices[ f + 0 ] * 3 + 1 ] += cross[1]; normals[ indices[ f + 0 ] * 3 + 2 ] += cross[2];
                normals[ indices[ f + 1 ] * 3 + 0 ] += cross[0]; normals[ indices[ f + 1 ] * 3 + 1 ] += cross[1]; normals[ indices[ f + 1 ] * 3 + 2 ] += cross[2];
                normals[ indices[ f + 2 ] * 3 + 0 ] += cross[0]; normals[ indices[ f + 2 ] * 3 + 1 ] += cross[1]; normals[ indices[ f + 2 ] * 3 + 2 ] += cross[2];
    
                f += 3;
            }

            for (var n = 0; n < normals.length/3; ++n) {
                var x = normals[n * 3 + 0], y = normals[n * 3 + 1], z = normals[n * 3 + 2];
                var nrm = Math.sqrt(x*x + y*y + z*z);
                if (x == 0 && y == 0 && z == 0) { x = 1; y = z = 0; nrm = 1; } // it's possible some vertices are not used in the object, so normal==0 at this point - put a (fake) valid normal
                normals[n * 3 + 0] = x / nrm;
                normals[n * 3 + 1] = y / nrm;
                normals[n * 3 + 2] = z / nrm;
                
            }

        }
    },
    
    getGeometryFromId : function(id) {
        for (let i = 0; i < this.sc.geometries.length; ++i) {
            const geom = this.sc.geometries[i];
            if (geom.uuid == id) {
                return geom;
            }
        }
        return null;
    },

    makeSkinnedLara : function() {
        var laraIDForVisu = this.confMgr.number('moveable[id="' + this.laraObjectID + '"] > visuid', true, this.laraObjectID);
        
        var joints = this.getGeometryFromId('moveable' + TRN.ObjectID.LaraJoints).data;
        var jointsVertices = joints.vertices;
        var main = this.getGeometryFromId('moveable' + laraIDForVisu).data;
        var mainVertices = main.vertices;

        var bones = main.bones;
        var numJoints = bones.length;
        var posStack = [];

        for (var j = 0; j < numJoints; ++j) {
            var bone = bones[j], pos = bone.pos_init.slice(0);
            if (bone.parent >= 0) {
                pos[0] += posStack[bone.parent][0];
                pos[1] += posStack[bone.parent][1];
                pos[2] += posStack[bone.parent][2];
            }
            posStack.push(pos);
        }

        function findVertex(x, y, z, b1, b2) {
            for (var v = 0; v < mainVertices.length/3; ++v) {
                var bidx = main.skinIndices[v*2+0];
                if (bidx != b1 && bidx != b2) continue;
                var boneTrans = posStack[bidx];
                var dx = mainVertices[v*3+0]+boneTrans[0]-x, dy = mainVertices[v*3+1]+boneTrans[1]-y, dz = mainVertices[v*3+2]+boneTrans[2]-z;
                var dist = dx*dx+dy*dy+dz*dz;
                if (dist < 4) {
                    return v;
                }
            }
            return -1;
        }

        for (var i = 0; i < jointsVertices.length/3; ++i) {
            var boneIdx = joints.skinIndices[i*2+0];
            var boneParentIdx = boneIdx > 0 ? bones[boneIdx].parent : boneIdx;
            var jointTrans = posStack[boneIdx];
            var x = jointsVertices[i*3+0]+jointTrans[0], y = jointsVertices[i*3+1]+jointTrans[1], z = jointsVertices[i*3+2]+jointTrans[2];
            var idx = findVertex(x, y, z, boneIdx, boneParentIdx);
            if (idx >= 0) {
                jointsVertices[i*3+0] = mainVertices[idx*3+0];
                jointsVertices[i*3+1] = mainVertices[idx*3+1];
                jointsVertices[i*3+2] = mainVertices[idx*3+2];
                joints.normals[i*3+0] = main.normals[idx*3+0];
                joints.normals[i*3+1] = main.normals[idx*3+1];
                joints.normals[i*3+2] = main.normals[idx*3+2];
                joints.skinIndices[i*2+0] = main.skinIndices[idx*2+0];
                joints.skinIndices[i*2+1] = main.skinIndices[idx*2+1];
            }
        }

        var f = 0, faces = joints.faces;
        while (f < faces.length) {
            let isTri = (faces[f] & 1) == 0, numVert = isTri ? 3 : 4, faceSize = isTri ? 14 : 18;
            faces[f+1+numVert] += this.sc.data.trlevel.atlas.make ? 0 : main._materials.length;
            for (let v = 0; v < numVert; ++v) {
                faces[f+1+v] += mainVertices.length/3; // position
                faces[f+2+numVert+v] += main.uvs[0].length/2; // uvs
                faces[f+2+numVert*2+v] += main.normals.length/3; // normals
                faces[f+2+numVert*3+v] += main.colors.length; // vertex colors
            }
            f += faceSize;
        }

        main.attributes._flags.value = main.attributes._flags.value.concat(joints.attributes._flags.value);
        main.colors = main.colors.concat(joints.colors);
        main.faces = main.faces.concat(joints.faces);
        main.normals = main.normals.concat(joints.normals);
        main.skinIndices = main.skinIndices.concat(joints.skinIndices);
        main.skinWeights = main.skinWeights.concat(joints.skinWeights);
        main.uvs[0] = main.uvs[0].concat(joints.uvs[0]);
        main.vertices = main.vertices.concat(joints.vertices);

        if (!this.sc.data.trlevel.atlas.make) {
            joints._materials.forEach( (m) => main._materials.push(m) );
        }
    },

    collectLightsExt : function() {

        var addedLights = 0;

        for(var objID in this.sc.data.objects) {
            var objData = this.sc.data.objects[objID];

            if (objData.type != 'room') {
                continue;
            }

            var portals = objData.portals;

            var lights = objData.lights.slice(0);
            for (var p = 0; p < portals.length; ++p) {
                var portal = portals[p], r = portal.adjoiningRoom, adjRoom = this.sc.data.objects['room' + r];
                if (!adjRoom) continue;

                var portalCenter = {
                    x: (portal.vertices[0].x + portal.vertices[1].x + portal.vertices[2].x + portal.vertices[3].x) / 4.0,
                    y: (portal.vertices[0].y + portal.vertices[1].y + portal.vertices[2].y + portal.vertices[3].y) / 4.0,
                    z: (portal.vertices[0].z + portal.vertices[1].z + portal.vertices[2].z + portal.vertices[3].z) / 4.0
                };

                var rlights = adjRoom.lights;
                for(var l = 0; l < rlights.length; ++l) {
                    var rlight = rlights[l];

                    switch(rlight.type) {
                        case 'directional':
                            continue;
                    }

                    var distToPortalSq = 
                        (portalCenter.x - rlight.x)*(portalCenter.x - rlight.x) + 
                        (portalCenter.y - rlight.y)*(portalCenter.y - rlight.y) + 
                        (portalCenter.z - rlight.z)*(portalCenter.z - rlight.z);

                    if (distToPortalSq > rlight.fadeOut*rlight.fadeOut) continue;

                    lights.push(rlight);
                    addedLights++;
                }
            }

            objData.lightsExt = lights;
        }

        console.log('Number of additional lights added: ' + addedLights);
    },

	convert : function (trlevel, callback_created) {
		glMatrix.glMatrix.setMatrixArrayType(Array);

        this.confMgr = trlevel.confMgr;

		this.sc =  {
			"metadata": {
				"version": 4.3,
				"type" : "Object"
			},

			"object": { 
                "type": "Scene",
                "children": [ ]
            },
			
			"geometries": [ ],
			
			"materials": [ ],
			
            "textures": [ ],
            
            "images": [ ],
			
            "data": {
                "objects": {
                },

                "trlevel": trlevel
            }
		};

        this.objects = this.sc.object.children;

		this.sc.data.levelFileName = this.sc.data.trlevel.filename;
		this.sc.data.levelShortFileName = this.sc.data.levelFileName;
		this.sc.data.levelShortFileNameNoExt = this.sc.data.levelShortFileName.substring(0, this.sc.data.levelShortFileName.indexOf('.'));
		this.sc.data.waterColor = {
			"in" : this.confMgr.globalColor('water > colorin'),
			"out" : this.confMgr.globalColor('water > colorout')
        };
		this.sc.data.rversion = this.sc.data.trlevel.rversion;
		this.sc.data.soundPath = "TRN/sound/" + this.sc.data.rversion.toLowerCase() + "/";

        this.laraObjectID = this.confMgr.number('lara > id', true, 0);

        if (this.sc.data.levelShortFileNameNoExt.toLowerCase() != 'angkor1') {
            this.sc.data.trlevel.animatedTexturesUVCount = 0;
        }

		this.movObjID2Index = {};

		for (var m = 0; m < this.sc.data.trlevel.moveables.length; ++m) {
			var moveable = this.sc.data.trlevel.moveables[m];
			this.movObjID2Index[moveable.objectID] = m;
		}

		this.objects.push({
            "uuid"      : "camera1",
            "type"      : "PerspectiveCamera",
            "name"      : "camera1",
			"fov"       : this.confMgr.float('camera > fov', true, 50),
			"near"      : this.confMgr.float('camera > neardist', true, 50),
			"far"       : this.confMgr.float('camera > fardist', true, 10000),
			"position"  : [ 0, 0, 0 ],
            "quaternion": [ 0, 0, 0, 1 ]
		});

        this.sc.data.objects['camera1'] = {
			"type"      : "camera",
            "objectid"  : 0,
            "roomIndex" : -1,
            "visible"   : false
        }

        // get the number of animations for each moveable
        for (var m = 0; m < this.sc.data.trlevel.moveables.length; ++m) {
            var moveable = this.sc.data.trlevel.moveables[m];

            moveable.numAnimations = this.numAnimationsForMoveable(m);
        }

		this.createTextures();

		this.createAnimatedTextures();

        this.createRooms();
        
        this.collectLightsExt();

        this.createAllStaticMeshes();

        this.createAllMoveables();

        this.createAllSprites();

        this.createAllSpriteSequences();

		this.createAnimations();

        //this.optimizeAnimations();

        this.createVertexNormals();

        if (this.sc.data.trlevel.rversion == 'TR4') {
          //  this.makeSkinnedLara();
        }
        
        // delete some properties that are not needed anymore on embeds
        for (var id in this.sc.embeds) {
            var embed = this.sc.embeds[id];

            delete embed.objHasScrollAnim;
        }
        
        callback_created(this.sc);
	}
}
