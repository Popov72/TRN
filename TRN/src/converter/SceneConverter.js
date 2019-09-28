/*
	Convert the JSON object created by the raw level loader to a higher level JSON scene
*/
TRN.SceneConverter = function(confMgr) {

	this.confMgr = confMgr;
	this.shaderMgr = new TRN.ShaderMgr();

	return this;
};

TRN.SceneConverter.prototype = {

	constructor : TRN.SceneConverter,

	// create one texture per tile	
	createTextures : function () {

		// create one texture per tile	
		for (var i = 0; i < this.trlevel.textile.length; ++i) {
			var name = 'texture' + i;
			this.sc.textures[name] = {
				"url": this.trlevel.textile[i],
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
			var anmcoords = [];
			while (numTextures-- > 0) {
				var texture = adata[i++], tex = this.trlevel.objectTextures[texture], tile = tex.tile & 0x7FFF;
				var isTri;

			    if (this.trlevel.rversion != 'TR4') {
					isTri = 
						(tex.vertices[3].Xpixel == 0)  &&
						(tex.vertices[3].Ypixel == 0)  &&
						(tex.vertices[3].Xcoordinate == 0)  &&
						(tex.vertices[3].Ycoordinate == 0);
			    } else {
			    	isTri = (tex.tile & 0x8000) != 0;
			    }

			    var minU = 0x7FFF, minV = 0x7FFF, numVertices = isTri ? 3 : 4;

		    	mapObjTexture2AnimTexture[texture] = { idxAnimatedTexture:animatedTextures.length, pos:snumTextures-numTextures-1 };

			    for (var j = 0; j < numVertices; j++) {
			        var u = tex.vertices[j].Xpixel;
			        var v = tex.vertices[j].Ypixel;

			        if (minU > u) minU = u; if (minV > v) minV = v;
			    }

			    anmcoords.push({ minU:(minU+0.5)/this.trlevel.atlas.width, minV:(minV+0.5)/this.trlevel.atlas.height, texture:"texture" + tile});
			}

			animatedTextures.push({
				"animcoords": anmcoords,
				"animspeed" : this.trlevel.rversion == 'TR1' ? 5 : this.trlevel.rversion == 'TR2' ? 6 : 14,
				"scrolltexture" : (animatedTextures.length < this.trlevel.animatedTexturesUVCount)
			});
		}

		this.sc.animatedTextures = animatedTextures;
		this.trlevel.mapObjTexture2AnimTexture = mapObjTexture2AnimTexture; // => to know for each objTexture if it is part of an animated texture, and if yes which is its starting position in the sequence
	},

	// create one mesh
	createMesh : function (meshIndex) {

		if (this.sc.embeds['mesh' + meshIndex]) return -1; // mesh already created

		var mesh = this.trlevel.meshes[meshIndex];
		var meshJSON = this.createNewJSONEmbed();
		var attributes = {
			_flags: { type:"f4", value:[] }
		};
		var tiles2material = {};

		meshJSON.attributes = attributes;

		var internalLit = this.makeMeshGeometry(mesh, meshIndex, meshJSON, tiles2material, this.trlevel.objectTextures, this.trlevel.mapObjTexture2AnimTexture, 0, attributes);

		meshJSON._materials = this.makeMaterialList(tiles2material, 'mesh');

		this.sc.embeds['mesh' + meshIndex] = meshJSON;
		this.sc.geometries['mesh' + meshIndex] = {
			"type": "embedded",
			"id"  : "mesh" + meshIndex
		};

		return internalLit ? 1 : 0;
	},

	//  create a sprite sequence: if there's more than one sprite in the sequence, we create an animated texture
	createSpriteSeq : function (spriteSeq, flag, color) {

		var spriteIndex, numSprites = 1, spriteid;

		if (typeof(spriteSeq) == 'number') {
			// case where this function is called to create a single sprite in a room

			spriteIndex = spriteSeq;
			spriteSeq = null;
			spriteid = 'sprite' + spriteIndex;  

			if (this.sc.embeds[spriteid]) return true; // sprite already created

			if (spriteIndex >= this.trlevel.spriteTextures.length) {
				console.log('spriteindex', spriteIndex, 'is too big: only', this.trlevel.spriteTextures.length, 'sprites in this.trlevel.spriteTextures !');
				return false;
			}

		} else {
			// case where this function is called to create a sprite sequence

			spriteIndex = spriteSeq.offset;
			numSprites = -spriteSeq.negativeLength;
			spriteid = 'spriteseq' + spriteSeq.objectID;

			if (this.sc.embeds[spriteid]) return true; // sprite sequence already created
		}


		var sprite = this.trlevel.spriteTextures[spriteIndex];
		var meshJSON = this.createNewJSONEmbed();
		var attributes = {
			_flags: { type:"f4", value:[] }
		};
		var tiles2material = {};

		meshJSON.attributes = attributes;

		meshJSON.vertices.push(sprite.leftSide,  -sprite.topSide,       0);
		meshJSON.vertices.push(sprite.leftSide,  -sprite.bottomSide,    0);
		meshJSON.vertices.push(sprite.rightSide, -sprite.bottomSide,    0);
		meshJSON.vertices.push(sprite.rightSide, -sprite.topSide,       0);

		for (var i = 0; i < 4; ++i) {
			meshJSON.colors.push(color);
			attributes._flags.value.push(flag);
		}

		var texturedRectangles = [
			{
				vertices: [0,1,2,3],
				texture: 0x8000,
			}
		];
		var width = (sprite.width-255)/256;
		var height = (sprite.height-255)/256;
		var row = 0, col = 0;
		if (this.trlevel.atlas.make) {
			row = Math.floor(sprite.tile / this.trlevel.atlas.numColPerRow), col = sprite.tile - row * this.trlevel.atlas.numColPerRow;
			sprite.tile = 0;
		}
		var objectTextures = [
			{
				attributes: 0,
                tile: sprite.tile,
                origTile: sprite.tile,
				vertices: [
					{ Xpixel: sprite.x + col * 256, 		Ypixel: sprite.y + row * 256 },
					{ Xpixel: sprite.x + col * 256, 		Ypixel: sprite.y+height-1 + row * 256 },
					{ Xpixel: sprite.x+width-1 + col * 256, Ypixel: sprite.y+height-1 + row * 256 },
					{ Xpixel: sprite.x+width-1 + col * 256, Ypixel: sprite.y + row * 256 }
				]
			}
		];

	    var mapObjTexture2AnimTexture = {};

	    if (numSprites > 1 && this.sc.animatedTextures) {
			var anmcoords = [];
		    mapObjTexture2AnimTexture[0] = { idxAnimatedTexture:this.sc.animatedTextures.length, pos:0 };
			for (var i = 0; i < numSprites; ++i) {
				sprite = this.trlevel.spriteTextures[spriteIndex + i];
				if (this.trlevel.atlas.make && i != 0) {
					row = Math.floor(sprite.tile / this.trlevel.atlas.numColPerRow), col = sprite.tile - row * this.trlevel.atlas.numColPerRow;
					sprite.tile = 0;
				}
			    anmcoords.push({ minU:(sprite.x + col * 256 + 0.5)/this.trlevel.atlas.width, minV:(sprite.y + row * 256 + 0.5)/this.trlevel.atlas.height, texture:"texture" + sprite.tile});
			}
			this.sc.animatedTextures.push({
				"animcoords": anmcoords,
				"animspeed" : 20
			});
		}

		this.makeFaces(meshJSON, [texturedRectangles], tiles2material, objectTextures, mapObjTexture2AnimTexture, 0);

		meshJSON._materials = this.makeMaterialList(tiles2material, 'room');

		this.sc.embeds[spriteid] = meshJSON;
		this.sc.geometries[spriteid] = {
			"type": "embedded",
			"id"  : spriteid
		};

		return true;
	},

	// generate the rooms + static meshes + sprites in the room
	createRooms : function () {
		// flag the alternate rooms
		for (var m = 0; m < this.trlevel.rooms.length; ++m) {
			var room = this.trlevel.rooms[m];
			var alternate = room.alternateRoom;
			if (alternate != -1) {
				this.trlevel.rooms[alternate].isAlternate = true;
			}
		}
		
		var maxLightsInRoom = 0, roomL = -1;

		// generate the rooms
		for (var m = 0; m < this.trlevel.rooms.length; ++m) {
			//if (m != 10) continue;
			var room = this.trlevel.rooms[m];
			var info = room.info, rdata = room.roomData, rflags = room.flags, lightMode = room.lightMode;
			var isFilledWithWater = (rflags & 1) != 0, isFlickering = (lightMode == 1);
			var roomJSON = this.createNewJSONEmbed();
            
			this.sc.objects['room' + m] = {
				"geometry" 			: "room" + m,
				"position" 			: [ 0, 0, 0 ],
				"quaternion" 		: [ 0, 0, 0, 1 ],
				"scale"	   			: [ 1, 1, 1 ],
				"visible"  			: !room.isAlternate,
				"isAlternateRoom" 	: room.isAlternate,
				"filledWithWater"	: isFilledWithWater,
				"flickering"		: isFlickering,
				"type"				: 'room',
				"roomIndex"			: m
			};

            // lights in the room
			if (room.lights.length > maxLightsInRoom) {
				maxLightsInRoom = room.lights.length;
				roomL = m;
			}

			var ambientColor = glMatrix.vec3.create();
			if (this.trlevel.rversion != 'TR4') {
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
				switch(this.trlevel.rversion) {
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

			this.sc.objects['room' + m].lights = lights;
			this.sc.objects['room' + m].ambientColor = ambientColor;

            // room geometry
            var attributes = {
				_flags: { type:"f4", value:[] }
			};
			var tiles2material = {};

			roomJSON.attributes = attributes;

			// push the vertices + vertex colors of the room
			for (var v = 0; v < rdata.vertices.length; ++v) {
				var rvertex = rdata.vertices[v];
				var vertexInfo = this.processRoomVertex(rvertex, isFilledWithWater);

				roomJSON.vertices.push(vertexInfo.x+info.x, vertexInfo.y, vertexInfo.z-info.z);
				attributes._flags.value.push(vertexInfo.flag);
				roomJSON.colors.push(vertexInfo.color);
			}

			// create the tri/quad faces
			this.makeFaces(roomJSON, [rdata.rectangles, rdata.triangles], tiles2material, this.trlevel.objectTextures, this.trlevel.mapObjTexture2AnimTexture, 0);
            
            // make the material list
            var materials = this.makeMaterialList(tiles2material, 'room');

            for (var mat = 0; mat < materials.length; ++mat) {
                materials[mat].uniforms.ambientColor.value = ambientColor;

                if (!isFlickering)      materials[mat].uniforms.flickerColor.value = [1, 1, 1];
                if (isFilledWithWater)  materials[mat].uniforms.tintColor.value = [this.sc.waterColor.in.r, this.sc.waterColor.in.g, this.sc.waterColor.in.b];
            }
    
			// add the room to the scene
			this.sc.embeds['room' + m] = roomJSON;
			this.sc.geometries['room' + m] = {
				"type": "embedded",
				"id"  : "room" + m
            };
            
			this.sc.objects['room' + m].material = materials;

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
            
			this.sc.objects['room' + m].portals = portals;

			// static meshes in the room
			for (var s = 0; s < room.staticMeshes.length; ++s) {
				var staticMesh = room.staticMeshes[s];
				var x = staticMesh.x, y = -staticMesh.y, z = -staticMesh.z, rot = staticMesh.rotation;
				var objectID = staticMesh.objectID;

				var gstaticMesh = this.findStatichMeshByID(objectID);
				if (gstaticMesh == null) continue;

				var mindex = gstaticMesh.mesh, mflags = gstaticMesh.flags;
				var nonCollisionable = (mflags & 1) != 0, visible = (mflags & 2) != 0;

				if (!visible) continue;

				var q = glMatrix.quat.create();
				rot = ((rot & 0xC000) >> 14) * 90;
				glMatrix.quat.setAxisAngle( q, [0,1,0], glMatrix.glMatrix.toRadian(-rot) );

				var internalLit = this.createMesh(mindex);

				if (internalLit == 0) {
					console.log('Static mesh objID=', objectID, ', meshIndex=', mindex, 'in room ', m, 'is externally lit.')
				}

				var materials = [];
				for (var mat = 0; mat < this.sc.embeds['mesh' + mindex]._materials.length; ++mat) {
                    var material = jQuery.extend(true, {}, this.sc.embeds['mesh' + mindex]._materials[mat]);
                    
					material.uniforms.lighting.value     = this.convertIntensity(staticMesh.intensity1);
                    material.uniforms.ambientColor.value = ambientColor;

                    if (!isFlickering)      material.uniforms.flickerColor.value = [1 ,1, 1];
                    if (isFilledWithWater)  material.uniforms.tintColor.value    = [this.sc.waterColor.in.r, this.sc.waterColor.in.g, this.sc.waterColor.in.b];

					materials.push(material);
				}
				
				this.sc.objects['room' + m + '_staticmesh' + s] = {
					"geometry" 		: "mesh" + mindex,
					"material" 		: materials,
					"position" 		: [ x, y, z ],
					"quaternion" 	: q,
					"scale"	   		: [ 1, 1, 1 ],
					"visible"  		: !room.isAlternate,
					"type"			: 'staticmesh',
					"roomIndex"		: m,
                    "objectid"		: objectID+50000,
                    "objectid_orig" : objectID
				};

			}

			// sprites in the room
			for (var s = 0; s < rdata.sprites.length; ++s) {
				var sprite = rdata.sprites[s], spriteIndex = sprite.texture;
				var rvertex = rdata.vertices[sprite.vertex];
				var vertexInfo = this.processRoomVertex(rvertex, isFilledWithWater);

				if (!this.createSpriteSeq(spriteIndex, vertexInfo.flag, vertexInfo.color)) continue;

				var materials = [];
				for (var mat = 0; mat < this.sc.embeds['sprite' + spriteIndex]._materials.length; ++mat) {
                    var material = jQuery.extend(true, {}, this.sc.embeds['sprite' + spriteIndex]._materials[mat]);
                    
                    material.uniforms.ambientColor.value = ambientColor;

                    if (!isFlickering)      material.uniforms.flickerColor.value = [1 ,1, 1];
                    if (isFilledWithWater)  material.uniforms.tintColor.value    = [this.sc.waterColor.in.r, this.sc.waterColor.in.g, this.sc.waterColor.in.b];

					materials.push(material);
				}
				
				this.sc.objects['room' + m + '_sprite' + s] = {
					"geometry" 		: "sprite" + spriteIndex,
					"material" 		: materials,
					"position" 		: [ vertexInfo.x+info.x, vertexInfo.y, vertexInfo.z-info.z ],
					"quaternion" 	: [ 0, 0, 0, 1 ],
					"scale"	   		: [ 1, 1, 1 ],
					"visible"  		: !room.isAlternate,
					"type"			: 'sprite',
					"roomIndex"		: m
                };
			}
		}

		console.log('num max lights in a single room=' + maxLightsInRoom + '. room=' + roomL)
	},

	createAnimations : function () {
		var animTracks = [];

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

			var animKeys = [];

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

				var mesh = 0, keyData = [];
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
					var cmd = this.trlevel.animCommands[aco++].value, numParams = TRN.Animation.Commands.numParams[cmd];

					var command = {
						"cmd": cmd,
						"params": []
					};

					while (numParams-- > 0) {
						command.params.push(this.trlevel.animCommands[aco++].value);
					}
					
					animCommands.push(command);
				}
			} else {
				console.log('Invalid num anim commands (' + numAnimCommands + ') ! ', anim);
			}

			if (this.trlevel.animations[anim.nextAnimation] != undefined) // to avoid bugging for lost artifact TR3 levels
				animTracks.push({
					"name": 			"anim" + anm,
					"numKeys":  		animNumKeys,
					"numFrames":  		numFrames,
					"frameRate": 		anim.frameRate,
					"fps":  			animFPS,
					"nextTrack":  		anim.nextAnimation,
					"nextTrackFrame": 	anim.nextFrame - this.trlevel.animations[anim.nextAnimation].frameStart,
					"keys":  			animKeys,
					"commands":     	animCommands,
					"frameStart":    	anim.frameStart
				});

		}

		this.sc.animTracks = animTracks;

	},

	createMoveables : function () {

		var startObjIdAnim  = this.confMgr.levelNumber(this.sc.levelShortFileName, 'rendering > scrolling_moveable > start_id', true, 0);
		var endObjIdAnim    =  startObjIdAnim + this.confMgr.levelNumber(this.sc.levelShortFileName, 'rendering > scrolling_moveable > num', true, 0) - 1;

		var numMoveables = 0;
		for (var m = 0; m < this.trlevel.moveables.length; ++m) {
			var moveable = this.trlevel.moveables[m];

			var numMeshes = moveable.numMeshes, meshIndex = moveable.startingMesh, meshTree = moveable.meshTree;
			var isDummy = numMeshes == 1 && this.trlevel.meshes[meshIndex].dummy && !moveable.objectID == this.laraObjectID;

			if (this.sc.geometries['moveable' + moveable.objectID] || isDummy) continue;

			var meshJSON = this.createNewJSONEmbed();
			var attributes = {
				_flags: { type:"f4", value:[] }
			};
			var tiles2material = {};
			var stackIdx = 0, stack = [], parent = -1;
			var px = 0, py = 0, pz = 0, ofsvert = 0, bones = [], skinIndices = [], skinWeights = [];

            meshJSON.moveableIndex = m;
			meshJSON.attributes = attributes;
			meshJSON.objHasScrollAnim = moveable.objectID >= startObjIdAnim && moveable.objectID <= endObjIdAnim;

			var moveableIsExternallyLit = false;
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

                if (idx == 0 && this.trlevel.rversion == 'TR4' && moveable.objectID == TRN.ObjectID.LaraJoints) {
                    // hack to remove bad data from joint #0 of Lara joints in TR4
                } else {
                    var internalLit = this.makeMeshGeometry(mesh, meshIndex, meshJSON, tiles2material, this.trlevel.objectTextures, this.trlevel.mapObjTexture2AnimTexture, ofsvert, attributes, idx, skinIndices, skinWeights);
                    
                    moveableIsExternallyLit = moveableIsExternallyLit || !internalLit;

                    ofsvert = parseInt(meshJSON.vertices.length/3);
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
			meshJSON.skinIndices = skinIndices;
			meshJSON.skinWeights = skinWeights;
			meshJSON.moveableIsInternallyLit = !moveableIsExternallyLit;

			meshJSON._materials = this.makeMaterialList(tiles2material, 'moveable');

			this.sc.embeds['moveable' + moveable.objectID] = meshJSON;
			this.sc.geometries['moveable' + moveable.objectID] = {
				"type": "embedded",
				"id"  : "moveable" + moveable.objectID
			};

			numMoveables++;
		}

		console.log('Num moveables=', numMoveables)
	},

	createMoveableInstance : function(itemIndex, roomIndex, x, y, z, lighting, rotation, moveable, jsonid, visible) {

		if (typeof(jsonid) == 'undefined') jsonid = 'moveable' + moveable.objectID + '_' + itemIndex;
		if (typeof(visible) == 'undefined') visible = true;

		var room = this.sc.objects['room' + roomIndex];

		var objIDForVisu = this.confMgr.levelNumber(this.sc.levelShortFileName, 'moveables > moveable[id="' + moveable.objectID + '"] > visuid', true, moveable.objectID);

        var hasGeometry = this.sc.embeds['moveable' + objIDForVisu];
        
		var materials = this.makeMaterialForMoveableInstance(objIDForVisu, roomIndex, lighting);

		this.sc.objects[jsonid] = {
			"geometry" 				: hasGeometry ? "moveable" + objIDForVisu : null,
			"material" 				: materials,
			"position" 				: [ x, y, z ],
			"quaternion" 			: rotation,
			"scale"	   				: [ 1, 1, 1 ],
			"visible"  				: room.visible && visible,
            "objectid" 				: moveable.objectID,
            "objectid_orig"         : moveable.objectID,
			"type"   				: 'moveable',
            "has_anims"				: true,
            "numAnimations"         : hasGeometry ? this.numAnimationsForMoveable(this.sc.embeds["moveable" + objIDForVisu].moveableIndex) : 0,
			"roomIndex"				: roomIndex,
			"animationStartIndex"	: moveable.animation,
			"_animationStartIndex"	: moveable.animation, // this one won't change, whereas animationStartIndex can be changed before starting, for Lara for eg, to set the "standing" anim
			"skin"					: true,
			"use_vertex_texture" 	: true,
			"hasScrollAnim"			: hasGeometry ? hasGeometry.objHasScrollAnim : false
		};

		var spriteSeqObjID = this.confMgr.levelNumber(this.sc.levelShortFileName, 'moveables > moveable[id="' + moveable.objectID + '"] > spritesequence', true, -1);

		if (spriteSeqObjID >= 0) {
			var spriteSeq = this.findSpriteSequenceByID(spriteSeqObjID);
			if (spriteSeq != null) {
                this.createSpriteSeqInstance(itemIndex, roomIndex, x, y, z, 0, null, spriteSeq);
			}
		}

		return this.sc.objects[jsonid];
	},

	createSpriteSeqInstance : function(itemIndex, roomIndex, x, y, z, lighting, rotation, spriteSeq) {
 		var room = this.sc.objects['room' + roomIndex];
		var spriteIndex = spriteSeq.offset;

		var rvertex = {
			vertex: { x:x, y:-y, z:-z },
			attribute: 0,
			lighting1: lighting,
			lighting2: lighting
		};
		var vertexInfo = this.processRoomVertex(rvertex, room.isFilledWithWater);

		if (this.createSpriteSeq(spriteSeq, vertexInfo.flag, vertexInfo.color)) {
			var spriteid = 'spriteseq' + spriteSeq.objectID;

			var materials = [];
			for (var mat = 0; mat < this.sc.embeds[spriteid]._materials.length; ++mat) {
                var material = jQuery.extend(true, {}, this.sc.embeds[spriteid]._materials[mat]);

                material.uniforms.ambientColor.value = room.ambientColor;

                if (!room.flickering)       material.uniforms.flickerColor.value = [1, 1, 1];
                if (room.filledWithWater)   material.uniforms.tintColor.value    = [this.sc.waterColor.in.r, this.sc.waterColor.in.g, this.sc.waterColor.in.b];

				materials.push(material);
			}
			
			this.sc.objects[spriteid + '_' + itemIndex] = {
				"geometry" 	    : spriteid,
				"material" 	    : materials,
				"position" 	    : [ vertexInfo.x, vertexInfo.y, vertexInfo.z ],
				"quaternion"    : [ 0, 0, 0, 1 ],
				"scale"	   	    : [ 1, 1, 1 ],
				"visible"  	    : room.visible,
				"objectid" 	    : spriteSeq.objectID,
                "objectid_orig" : spriteSeq.objectID,
				"type" 	        : 'sprite',
				"roomIndex"	    : roomIndex
			};
		}
	},

	createItems : function () {

		var laraMoveable = null;
		var numMoveableInstances = 0, numSpriteSeqInstances = 0;
		for (var i = 0; i < this.trlevel.items.length; ++i) {
			var item = this.trlevel.items[i];

			var roomIndex = item.room, lighting = item.intensity1, q = glMatrix.quat.create();

			glMatrix.quat.setAxisAngle(q, [0,1,0], glMatrix.glMatrix.toRadian(-(item.angle >> 14) * 90) );

			var m = this.movObjID2Index[item.objectID];
			if (m == null) {
				this.createSpriteSeqInstance(i, roomIndex, item.x, -item.y, -item.z, lighting, q, this.trlevel.spriteSequences[this.sprObjID2Index[item.objectID]]);
				numSpriteSeqInstances++;
			} else {
                var mvb = this.createMoveableInstance(i, roomIndex, item.x, -item.y, -item.z, lighting, q, this.trlevel.moveables[m]);
				if (item.objectID == this.laraObjectID) {
					laraMoveable = mvb;
				}
				numMoveableInstances++;
                var startAnim = this.confMgr.levelNumber(this.sc.levelShortFileName, 'moveable[id="' + item.objectID + '"] > startanim', true, -1);
                if (startAnim >= 0) {
                    mvb.animationStartIndex = mvb._animationStartIndex + startAnim;
                }
            }
		}

        this.laraMoveable = laraMoveable;

		if (laraMoveable != null) {
			var laraRoomIndex = laraMoveable.roomIndex;

			// create the 'meshswap' moveables
			var meshSwapIds = [
				this.confMgr.levelNumber(this.sc.levelShortFileName, 'meshswap > objid1', true, 0),
				this.confMgr.levelNumber(this.sc.levelShortFileName, 'meshswap > objid2', true, 0),
				this.confMgr.levelNumber(this.sc.levelShortFileName, 'meshswap > objid3', true, 0)
			];
			for (var i = 0; i < meshSwapIds.length; ++i) {
				var mid = meshSwapIds[i];

				if (mid == 0) continue;

				var mindex = this.movObjID2Index[mid];
				
				if (typeof(mindex) != "undefined") {
					var mobj = this.createMoveableInstance(0, laraRoomIndex, 0, 0, 0, -1, [0,0,0,1], this.trlevel.moveables[mindex], 'meshswap' + (i+1), false);

					mobj.dummy = true;
				}
			}

			// create the 'pistol anim' moveable
			var pistolAnimId = this.confMgr.levelNumber(this.sc.levelShortFileName, 'behaviour[name="Lara"] > pistol_anim > id', true, -1);
			if (pistolAnimId != -1) {
				var mindex = this.movObjID2Index[pistolAnimId];

				if (typeof(mindex) != "undefined") {
					var mobj = this.createMoveableInstance(0, laraRoomIndex, 0, 0, 0, -1, [0,0,0,1], this.trlevel.moveables[mindex], 'pistolanim', false);

					mobj.dummy = true;
				}
			}

			// if not a cut scene, we set a specific start anim for Lara
			if (this.sc.cutScene.frames == null) {
				var startAnim = this.confMgr.levelNumber(this.sc.levelShortFileName, 'behaviour[name="Lara"] > startanim', true, 0);
				
				laraMoveable.animationStartIndex = startAnim;
			}

			// translate starting position of Lara
			var startTrans = this.confMgr.levelVector3(this.sc.levelShortFileName, 'behaviour[name="Lara"] > starttrans', true, null);
			if (startTrans != null) {
				laraMoveable.position[0] += startTrans.x;
				laraMoveable.position[1] += startTrans.y;
				laraMoveable.position[2] += startTrans.z;
			}

		}

		// specific handling of the sky
		var skyId = this.confMgr.levelNumber(this.sc.levelShortFileName, 'sky > objectid', true, 0);
		var noSky = this.confMgr.levelNumber(this.sc.levelShortFileName, 'moveables > moveable[id=0] > behaviour[name=Sky] > id', false, 0) == -1;
		if (skyId && this.movObjID2Index[skyId] && !noSky) {
			moveable = this.trlevel.moveables[this.movObjID2Index[skyId]];
			var materials = [];
			for (var mat = 0; mat < this.sc.embeds['moveable' + moveable.objectID]._materials.length; ++mat) {
                var material = jQuery.extend(true, {}, this.sc.embeds['moveable' + moveable.objectID]._materials[mat]);
                
                material.material = this.getMaterial('sky');
				material.depthWrite = false;
                //material.depthTest = false;
                
				materials.push(material);
			}

			var skyNoAnim = this.confMgr.levelBoolean(this.sc.levelShortFileName, 'sky > noanim', true, false);
			this.sc.objects['sky'] = {
				"geometry" 				: "moveable" + moveable.objectID,
				"material" 				: materials,
				"position" 				: [ 0, 0, 0 ],
				"quaternion" 			: [ 0, 0, 0, 1 ],
				"scale"	   				: [1, 1, 1],
				"visible"  				: true,
				"objectid" 				: moveable.objectID,
                "objectid_orig"         : moveable.objectID,
				"type"     				: 'moveable',
				"animationStartIndex"	: moveable.animation,
				"has_anims"				: !skyNoAnim,
				"skin"					: true,
				"use_vertex_texture" 	: true
			};
			numMoveableInstances++;	
		}

		// specific handling of the skydome (TR4 only)
		if (this.trlevel.rversion == 'TR4') {
			var skyColor = [
					this.confMgr.levelNumber(this.sc.levelShortFileName, 'sky > color > r', true, 255)/255.0,
					this.confMgr.levelNumber(this.sc.levelShortFileName, 'sky > color > g', true, 255)/255.0,
					this.confMgr.levelNumber(this.sc.levelShortFileName, 'sky > color > b', true, 255)/255.0
				];
			var materials = [
				{
					"material": this.getMaterial("skydome"),
					"uniforms": {
						"map" :             { type: "t",    value: "" + (this.trlevel.textile.length-1) },
						"offsetRepeat" :    { type: "f4",   value: [0, 0, 1, 1] },
						"tintColor" :       { type: "f3",   value: skyColor }
					},
                    "depthWrite": false,
					"userData": {}
				}
			];
			this.sc.objects['skydome'] = {
				"geometry" 				: "skydome",
				"material" 				: materials,
				"position" 				: [ 0, 0, 0 ],
				"quaternion" 			: [ 0, 0, 0, 1 ],
				"scale"	   				: [ 1, 1, 1 ],
				"visible"  				: true,
				"type"					: 'skydome',
				"skin"					: false,
				"use_vertex_texture" 	: true,
                "dummy"					: true,
                "objectid_orig"         : 0
			};
			
			var meshJSON = this.createNewJSONEmbed();
			var meshData = TRN.SkyDome.create(
				/*curvature*/ 10.0,
				/*tiling*/ 3,
				/*distance*/ 2000.0,
				/*orientation*/ [0,0,0,1],
				/*xsegments*/ 16, 
				/*ysegments*/ 16,
				/*ySegmentsToKeep*/ 8
			);
			
			meshJSON.attributes = null;
			meshJSON.vertices = meshData.vertices;
            meshJSON.uvs[0] = meshData.textures;
            meshJSON.colors = [];
            meshJSON.attributes = {
                _flags: { type:"f4", value:[] }
            };
    
            for (var v = 0; v < meshJSON.vertices.length; ++v) {
                meshJSON.colors.push(0xFFFFFF);
                meshJSON.attributes._flags.value.push([0, 0, 0, 0]);
            }

			var faces = meshData.faces, numFaces = faces.length / 3;
			for (var f = 0; f < numFaces; ++f) {
				meshJSON.faces.push(170); // 1=quad / 2=has material / 8=has vertex uv / 32=has vertex normal / 128=has vertex color

				// vertex indices
				for (var v = 0; v < 3; ++v) {
					meshJSON.faces.push(faces[f*3+v]);
				}

				meshJSON.faces.push(0); // material index

				// texture indices
				for (var v = 0; v < 3; ++v) {
					meshJSON.faces.push(faces[f*3+v]);
                }
                
				// normal indices
				for (var v = 0; v < 3; ++v) {
					meshJSON.faces.push(faces[f*3+v]);
                }
                
                // vertex color indices
				for (var v = 0; v < 3; ++v) {
					meshJSON.faces.push(faces[f*3+v]);
				}
			}

			this.sc.embeds['skydome'] = meshJSON;
			this.sc.geometries['skydome'] = {
				"type": "embedded",
				"id"  : "skydome"
			};
		}

		console.log('Num moveable instances=', numMoveableInstances, '. Num sprite sequence instances=', numSpriteSeqInstances);
	},

    // remove animations for moveables that have a single animation with a single keyframe
    optimizeAnimations : function () {

        var numOptimized = 0;

        for (var objID in this.sc.objects) {

            var objJSON = this.sc.objects[objID];

            if (!objJSON.has_anims) continue;

            var track = this.sc.animTracks[objJSON.animationStartIndex];

            if (track.nextTrack != objJSON.animationStartIndex) { // the moveables has more than one anim
                continue;
            }

            if (track.commands.length == 0 && track.numFrames == 1 && track.keys.length == 1 && track.keys[0].data.length == 1 && objJSON.numAnimations == 1) {
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

                objJSON.has_anims = false;

                numOptimized++;
            }

        }

        console.log('Number of moveables optimized for animations=' + numOptimized);

    },

    createVertexNormals : function() {

        var vA, vB, vC, vD;
        var cb, ab, db, dc, bc, cross;

        for (var id in this.sc.embeds) {
            var embed = this.sc.embeds[id];
            var vertices = embed.vertices, faces = embed.faces;

            var normals = embed.normals;

            for (var v = 0; v < vertices.length; ++v) normals.push(0);

            var f = 0;
            while (f < faces.length) {
                let isTri = (faces[f] & 1) == 0, faceSize = isTri ? 14 : 18;

                if ( isTri ) {

                    vA = [ vertices[ faces[ f + 1 ] * 3 + 0 ], vertices[ faces[ f + 1 ] * 3 + 1 ], vertices[ faces[ f + 1 ] * 3 + 2 ] ];
                    vB = [ vertices[ faces[ f + 2 ] * 3 + 0 ], vertices[ faces[ f + 2 ] * 3 + 1 ], vertices[ faces[ f + 2 ] * 3 + 2 ] ];
                    vC = [ vertices[ faces[ f + 3 ] * 3 + 0 ], vertices[ faces[ f + 3 ] * 3 + 1 ], vertices[ faces[ f + 3 ] * 3 + 2 ] ];

                    cb = [ vC[0] - vB[0], vC[1] - vB[1], vC[2] - vB[2] ];
                    ab = [ vA[0] - vB[0], vA[1] - vB[1], vA[2] - vB[2] ];
                    cross = [ 
                        cb[1] * ab[2] - cb[2] * ab[1],
                        cb[2] * ab[0] - cb[0] * ab[2],
                        cb[0] * ab[1] - cb[1] * ab[0]
                    ];

                    normals[ faces[ f + 1 ] * 3 + 0 ] += cross[0]; normals[ faces[ f + 1 ] * 3 + 1 ] += cross[1]; normals[ faces[ f + 1 ] * 3 + 2 ] += cross[2];
                    normals[ faces[ f + 2 ] * 3 + 0 ] += cross[0]; normals[ faces[ f + 2 ] * 3 + 1 ] += cross[1]; normals[ faces[ f + 2 ] * 3 + 2 ] += cross[2];
                    normals[ faces[ f + 3 ] * 3 + 0 ] += cross[0]; normals[ faces[ f + 3 ] * 3 + 1 ] += cross[1]; normals[ faces[ f + 3 ] * 3 + 2 ] += cross[2];

                } else {

                    vA = [ vertices[ faces[ f + 1 ] * 3 + 0 ], vertices[ faces[ f + 1 ] * 3 + 1 ], vertices[ faces[ f + 1 ] * 3 + 2 ] ];
                    vB = [ vertices[ faces[ f + 2 ] * 3 + 0 ], vertices[ faces[ f + 2 ] * 3 + 1 ], vertices[ faces[ f + 2 ] * 3 + 2 ] ];
                    vC = [ vertices[ faces[ f + 3 ] * 3 + 0 ], vertices[ faces[ f + 3 ] * 3 + 1 ], vertices[ faces[ f + 3 ] * 3 + 2 ] ];
                    vD = [ vertices[ faces[ f + 4 ] * 3 + 0 ], vertices[ faces[ f + 4 ] * 3 + 1 ], vertices[ faces[ f + 4 ] * 3 + 2 ] ];

                    // abd

                    db = [ vD[0] - vB[0], vD[1] - vB[1], vD[2] - vB[2] ];
                    ab = [ vA[0] - vB[0], vA[1] - vB[1], vA[2] - vB[2] ];
                    cross = [ 
                        db[1] * ab[2] - db[2] * ab[1],
                        db[2] * ab[0] - db[0] * ab[2],
                        db[0] * ab[1] - db[1] * ab[0]
                    ];

                    normals[ faces[ f + 1 ] * 3 + 0 ] += cross[0]; normals[ faces[ f + 1 ] * 3 + 1 ] += cross[1]; normals[ faces[ f + 1 ] * 3 + 2 ] += cross[2];
                    normals[ faces[ f + 2 ] * 3 + 0 ] += cross[0]; normals[ faces[ f + 2 ] * 3 + 1 ] += cross[1]; normals[ faces[ f + 2 ] * 3 + 2 ] += cross[2];
                    normals[ faces[ f + 4 ] * 3 + 0 ] += cross[0]; normals[ faces[ f + 4 ] * 3 + 1 ] += cross[1]; normals[ faces[ f + 4 ] * 3 + 2 ] += cross[2];

                    // bcd

                    dc = [ vD[0] - vC[0], vD[1] - vC[1], vD[2] - vC[2] ];
                    bc = [ vB[0] - vC[0], vB[1] - vC[1], vB[2] - vC[2] ];
                    cross = [ 
                        dc[1] * bc[2] - dc[2] * bc[1],
                        dc[2] * bc[0] - dc[0] * bc[2],
                        dc[0] * bc[1] - dc[1] * bc[0]
                    ];

                    normals[ faces[ f + 2 ] * 3 + 0 ] += cross[0]; normals[ faces[ f + 2 ] * 3 + 1 ] += cross[1]; normals[ faces[ f + 2 ] * 3 + 2 ] += cross[2];
                    normals[ faces[ f + 3 ] * 3 + 0 ] += cross[0]; normals[ faces[ f + 3 ] * 3 + 1 ] += cross[1]; normals[ faces[ f + 3 ] * 3 + 2 ] += cross[2];
                    normals[ faces[ f + 4 ] * 3 + 0 ] += cross[0]; normals[ faces[ f + 4 ] * 3 + 1 ] += cross[1]; normals[ faces[ f + 4 ] * 3 + 2 ] += cross[2];

                }
    
                f += faceSize;
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
    
    makeSkinnedLara : function() {
        var laraMoveable = this.laraMoveable;
        var joints = this.sc.embeds['moveable' + TRN.ObjectID.LaraJoints];
        var jointsVertices = joints.vertices;
        var main = this.sc.embeds[this.sc.geometries[laraMoveable.geometry].id];
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
            faces[f+1+numVert] += this.trlevel.atlas.make ? 0 : laraMoveable.material.length;
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

        if (!this.trlevel.atlas.make) {
            var materials = this.makeMaterialForMoveableInstance(TRN.ObjectID.LaraJoints, laraMoveable.roomIndex, -1);
            laraMoveable.material = laraMoveable.material.concat(materials);
        }

        delete this.sc.embeds['moveable' + TRN.ObjectID.LaraJoints];
        delete this.sc.geometries['moveable' + TRN.ObjectID.LaraJoints];
    },

    makeTR4Cutscene : function(cutscene) {

        function makeQuaternion(angleX, angleY, angleZ) {

            var angleX = 2 * Math.PI * (angleX % 1024) / 1024.0;
            var angleY = 2 * Math.PI * (angleY % 1024) / 1024.0;
            var angleZ = 2 * Math.PI * (angleZ % 1024) / 1024.0;
    
            var qx = glMatrix.quat.create(), qy = glMatrix.quat.create(), qz = glMatrix.quat.create();
    
            glMatrix.quat.setAxisAngle(qx, [1,0,0], angleX);
            glMatrix.quat.setAxisAngle(qy, [0,1,0], -angleY);
            glMatrix.quat.setAxisAngle(qz, [0,0,1], -angleZ);
    
            glMatrix.quat.multiply(qy, qy, qx);
            glMatrix.quat.multiply(qy, qy, qz);
    
            return qy;
        }
        
        var ocs = this.sc.cutScene;

        console.log(cutscene);

        ocs.origin.x = cutscene.originX;
        ocs.origin.y = -cutscene.originY;
        ocs.origin.z = -cutscene.originZ;
        ocs.origin.rotY = 0;

        // hide moveables (except Lara) that are already in the level and that are referenced in the cutscene (we will create them later)
        var idInCutscenes = {};
        for (var ac = 0; ac < cutscene.actors.length; ++ac) {
            var id = cutscene.actors[ac].slotNumber;
            idInCutscenes[id] = true;
        }

        for (var objID in  this.sc.objects) {
            var objJSON = this.sc.objects[objID];
            if (objJSON.objectid != TRN.ObjectID.Lara && objJSON.objectid in idInCutscenes) {
                objJSON.visible = false;
            }
        }

        // create moveable instances used in cutscene
        var actorMoveables = [];
        for (var ac = 0; ac < cutscene.actors.length; ++ac) {
            var id = cutscene.actors[ac].slotNumber;
            var mvb;
            if (id != TRN.ObjectID.Lara) {
                var m = this.movObjID2Index[id];
                mvb = this.createMoveableInstance(ac, this.laraMoveable.roomIndex, this.laraMoveable.position[0], this.laraMoveable.position[1], this.laraMoveable.position[2], -1, [0, 0, 0, -1], this.trlevel.moveables[m]);
            } else {
                mvb = this.laraMoveable;
            }
            actorMoveables.push(mvb);
            mvb.position = [ocs.origin.x, ocs.origin.y, ocs.origin.z];
            mvb.quaternion = [0, 0, 0, 1];
        }

        // create actor frames
        for (var ac = 0; ac < cutscene.actors.length; ++ac) {
            var actor = cutscene.actors[ac];

            var animation = {
                "fps": 30,
                "frameRate": 1,
                "keys": [],
                "name": "anim_cutscene_actor" + ac,
                "nextTrack": this.sc.animTracks.length,
                "nextTrackFrame": 0,
                "numFrames": cutscene.numFrames,
                "numKeys": cutscene.numFrames,
                "commands": []
            };

            animation.commands.frameStart = 0;
            
            actorMoveables[ac].animationStartIndex = this.sc.animTracks.length;

            this.sc.animTracks.push(animation);

            var CST0 = 3;

            var prev = [];
            for (var m = 0; m < actor.meshes.length; ++m) {
                var mesh = actor.meshes[m];

                var posHdr = mesh.positionHeader;
                var rotHdr = mesh.rotationHeader;

                prev.push({
                    "position": {
                        x: posHdr ? posHdr.startPosX*CST0 : 0,
                        y: posHdr ? -posHdr.startPosY*CST0 : 0,
                        z: posHdr ? -posHdr.startPosZ*CST0 : 0
                    },
                    "rotation": {
                        x: rotHdr.startRotX % 1024,
                        y: rotHdr.startRotY % 1024,
                        z: rotHdr.startRotZ % 1024
                    }
                });
            }
    
            for (var d = 0; d < cutscene.numFrames; ++d) {

                var key = {
                    "time": d,
                    "data": [],
                    "boundingBox": {
                        xmin: -1e7, ymin: -1e7, zmin: -1e7,
                        xmax:  1e7, ymax:  1e7, zmax:  1e7
                    }
                };

                var addKey = true;

                for (var m = 0; m < actor.meshes.length; ++m) {
                    var mesh = actor.meshes[m];

                    var posData = mesh.positionData;
                    var rotData = mesh.rotationData;

                    if (rotData.length <= d) {
                        addKey = false;
                        break;
                    }

                    var transX = 0, transY = 0, transZ = 0;

                    if (posData) {
                        transX = posData.dx[d]*CST0;
                        transY = -posData.dy[d]*CST0;
                        transZ = -posData.dz[d]*CST0;
                    }

                    var cur = {
                        "position": {
                            x: transX + prev[m].position.x,
                            y: transY + prev[m].position.y,
                            z: transZ + prev[m].position.z
                        },
                        "rotation": {
                            x: (rotData.dx[d] + prev[m].rotation.x) % 1024, 
                            y: (rotData.dy[d] + prev[m].rotation.y) % 1024, 
                            z: (rotData.dz[d] + prev[m].rotation.z) % 1024
                        }
                    };

                    var quat = makeQuaternion(cur.rotation.x, cur.rotation.y, cur.rotation.z);

                    key.data.push({
                        "position": 	{ x:cur.position.x, y:cur.position.y, z:cur.position.z },
                        "quaternion":	{ x:quat[0], y:quat[1], z:quat[2], w:quat[3] }
                    });

                    prev[m] = cur;
                }

                if (addKey) {
                    animation.keys.push(key);
                }
            }
        }

        // create camera frames
        var frames = [], ocam = cutscene.camera, CST = 2;
        var prev = {
            posX:       ocam.cameraHeader.startPosX*CST,    posY:       ocam.cameraHeader.startPosY*CST,    posZ:       ocam.cameraHeader.startPosZ*CST,
            targetX:    ocam.targetHeader.startPosX*CST,    targetY:    ocam.targetHeader.startPosY*CST,    targetZ:    ocam.targetHeader.startPosZ*CST
        }

        for (var d = 0; d < cutscene.numFrames; ++d) {
            if (ocam.cameraPositionData.dx.length <= d) {
                break;
            }
            var cur = {
                fov: 13000,
                roll: 0,
                
                posX: ocam.cameraPositionData.dx[d]*CST + prev.posX,
                posY: ocam.cameraPositionData.dy[d]*CST + prev.posY,
                posZ: ocam.cameraPositionData.dz[d]*CST + prev.posZ,

                targetX: ocam.targetPositionData.dx[d]*CST + prev.targetX,
                targetY: ocam.targetPositionData.dy[d]*CST + prev.targetY,
                targetZ: ocam.targetPositionData.dz[d]*CST + prev.targetZ
            };
            frames.push(cur);
            prev = cur;
        }

        ocs.frames = frames;
    },

    collectLightsExt : function() {

        var addedLights = 0;

        for(var objID in this.sc.objects) {
            var obj = this.sc.objects[objID];

            if (obj.type != 'room') {
                continue;
            }

            var portals = obj.portals;

            var lights = obj.lights.slice(0);
            for (var p = 0; p < portals.length; ++p) {
                var portal = portals[p], r = portal.adjoiningRoom, adjRoom = this.sc.objects['room' + r];
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
                            break;
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

            obj.lightsExt = lights;
        }

        console.log('Number of additional lights added: ' + addedLights);
    },

	convert : function (trlevel, callback_created) {
		glMatrix.glMatrix.setMatrixArrayType(Array);

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
		this.sc.levelShortFileName = this.sc.levelFileName;
		this.sc.levelShortFileNameNoExt = this.sc.levelShortFileName.substring(0, this.sc.levelShortFileName.indexOf('.'));
		this.sc.waterColor = {
			"in" : this.confMgr.globalColor('water > colorin'),
			"out" : this.confMgr.globalColor('water > colorout')
        };
		//this.sc.texturePath = "TRN/texture/" + this.trlevel.rversion.toLowerCase() + "/";
		this.sc.soundPath = "TRN/sound/" + this.trlevel.rversion.toLowerCase() + "/";
		this.sc.rversion = this.trlevel.rversion;
        this.sc.useUVRotate = this.confMgr.levelBoolean(this.sc.levelShortFileName, 'uvrotate', true, false);

        this.laraObjectID = this.confMgr.levelNumber(this.sc.levelShortFileName, 'lara > id', true, 0);

		this.movObjID2Index = {};

		for (var m = 0; m < this.trlevel.moveables.length; ++m) {
			var moveable = this.trlevel.moveables[m];
			this.movObjID2Index[moveable.objectID] = m;
		}

		this.sprObjID2Index = {};

		for (var sq = 0; sq < this.trlevel.spriteSequences.length; ++sq) {
			var spriteSeq = this.trlevel.spriteSequences[sq];
			this.sprObjID2Index[spriteSeq.objectID] = sq;
		}

		// get Lara's position => camera starting point
		var laraPos = { x:0, y:0, z:0, rotY:0 };
		for (var i = 0; i < this.trlevel.items.length; ++i) {
			var item = this.trlevel.items[i];
			if (item.objectID == this.laraObjectID) {
				laraPos.x =  item.x;
				laraPos.y = -item.y;
				laraPos.z = -item.z;
				laraPos.rotY = -(item.angle >> 14) * 90;
				break;
			}
		}

		var laraAngle = this.confMgr.levelFloat(this.sc.levelShortFileName, 'moveables > moveable[id="' + this.laraObjectID + '"] > angle');
		if (laraAngle != undefined) {
			laraPos.rotY = laraAngle;
		}

		var isCutScene = this.confMgr.levelParam(this.sc.levelShortFileName, '', false, true).attr('type') == 'cutscene';
		if (this.trlevel.numCinematicFrames > 0 && isCutScene) {
			this.sc.cutScene.frames = this.trlevel.cinematicFrames;
			this.sc.cutScene.origin = laraPos;
		}	

		var camPos = { x:laraPos.x, y:laraPos.y, z:laraPos.z, rotY:laraPos.rotY }
		if (!this.sc.cutScene.frames) {
			var ofstDir = this.confMgr.levelFloat(this.sc.levelShortFileName, 'behaviour[name="Lara"] > dirdist', true, 0.0);
			var ofstUp = this.confMgr.levelFloat(this.sc.levelShortFileName, 'behaviour[name="Lara"] > updist', true, 0.0);

			var v3 = [0, ofstUp, ofstDir];
			var q = glMatrix.quat.create();

			glMatrix.quat.setAxisAngle(q, [0,1,0], glMatrix.glMatrix.toRadian(laraPos.rotY));
			glMatrix.vec3.transformQuat(v3, v3, q);

			camPos.x += v3[0];
			camPos.y += v3[1];
			camPos.z += v3[2];
		}

		var q = glMatrix.quat.create();

		glMatrix.quat.setAxisAngle(q, [0,1,0], glMatrix.glMatrix.toRadian(laraPos.rotY));
		
		this.sc.objects.camera1 = {
			"type"  : "PerspectiveCamera",
			"fov"   : this.confMgr.levelFloat(this.sc.levelShortFileName, 'camera > fov', true, 50),
			"near"  : this.confMgr.levelFloat(this.sc.levelShortFileName, 'camera > neardist', true, 50),
			"far"   : this.confMgr.levelFloat(this.sc.levelShortFileName, 'camera > fardist', true, 10000),
			"position": [ camPos.x, camPos.y, camPos.z ],
            "quaternion": q,
            "objectid_orig": 0
		}

		this.createTextures();

		this.createAnimatedTextures();

		this.createRooms();

        this.collectLightsExt();

		this.createMoveables();

		this.createAnimations();

        this.createItems();
        
        this.optimizeAnimations();

        this.createVertexNormals();

        if (this.trlevel.rversion == 'TR4') {
            this.makeSkinnedLara();
            if(TRN.Browser.QueryString.cutscene != undefined) {
                var icutscene = TRN.Browser.QueryString.cutscene, cutscene;
                jQuery.ajax({
                    type: "GET",
                    url: 'TRN/level/tr4/TR4_cutscenes/cut' + icutscene + '.json',
                    dataType: "json",
                    cache: false,
                    async: false
                }).done(function(data) { cutscene = data; });
    
                this.makeTR4Cutscene(cutscene);
            }
        }
        
        // delete some properties that are not needed anymore on embeds
        for (var id in this.sc.embeds) {
            var embed = this.sc.embeds[id];

            delete embed._materials;
            delete embed.objHasScrollAnim;
            delete embed.moveableIndex;
            delete embed.moveableIsInternallyLit;
        }

        if(TRN.Browser.QueryString.cutscene != undefined && this.trlevel.rversion == 'TR4') {
            // get the sound for this cut scene
            if (cutscene.audio !== "") {
                var this_ = this;
                var binaryBuffer = new TRN.BinaryBuffer(
                    [
                    this_.sc.soundPath + cutscene.info.audio + '.aac'
                    ],
                    function finishedLoading(bufferList, err) {
                        if (bufferList != null && bufferList.length > 0) {
                            this_.sc.cutScene.soundData = TRN.Base64Binary.encode(bufferList[0]);
                        } else {
                            console.log('Error when loading file. ', err);
                        }
                        callback_created(this_.sc);
                    }
                );
                binaryBuffer.load();
            } else {
                callback_created(this.sc);
            }

            return;
        }

        if (this.sc.cutScene.frames) {
			// update position/quaternion for some specific items if we play a cut scene
			var min = this.confMgr.levelNumber(this.sc.levelShortFileName, 'cutscene > animminid', true, 0);
			var max = this.confMgr.levelNumber(this.sc.levelShortFileName, 'cutscene > animmaxid', true, 0);
			for (var objID in this.sc.objects) {
				var objJSON = this.sc.objects[objID];

				if (objJSON.objectid == this.laraObjectID || (objJSON.objectid >= min && objJSON.objectid <= max)) {
					objJSON.position = [ this.sc.cutScene.origin.x, this.sc.cutScene.origin.y, this.sc.cutScene.origin.z ];
					var q = glMatrix.quat.create();
					glMatrix.quat.setAxisAngle(q, [0,1,0], glMatrix.glMatrix.toRadian(this.sc.cutScene.origin.rotY));
					objJSON.quaternion = q;
				}
			}

			// get the sound for this cut scene
			var this_ = this;
			var binaryBuffer = new TRN.BinaryBuffer(
				[
				  this_.sc.soundPath + this_.sc.levelShortFileNameNoExt.toUpperCase()
				],
				function finishedLoading(bufferList, err) {
					if (bufferList != null && bufferList.length > 0) {
						this_.sc.cutScene.soundData = TRN.Base64Binary.encode(bufferList[0]);
					} else {
						console.log('Error when loading file. ', err);
					}
					callback_created(this_.sc);
				}
			);
			binaryBuffer.load();
		} else {
			callback_created(this.sc);
		}

	}
}
