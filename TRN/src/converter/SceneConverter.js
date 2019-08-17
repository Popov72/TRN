/*
	Convert the JSON object created by the raw level loader to a ThreeJS JSON scene
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
			if (i == this.trlevel.textile.length-1 && this.trlevel.rversion == 'TR4') {
				name = 'sky';
			}
			this.sc.textures[name] = {
				/*"url_": this.sc.texturePath  + this.sc.levelShortFileNameOrig + "_tile" + i + ".png",*/
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
				var isTri = (tex.tile & 0x8000) != 0;
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
			flags: { type:"v4", value:[] }
		};
		var tiles2material = {};

		meshJSON.attributes = attributes;

		var internalLit = this.makeMeshGeometry(mesh, meshIndex, meshJSON, tiles2material, this.trlevel.objectTextures, this.trlevel.mapObjTexture2AnimTexture, 0, attributes);

		meshJSON._materials = this.makeMaterialList(tiles2material, 'mesh');
		for (var m = 0; m < meshJSON._materials.length; ++m) {
			if (this.trlevel.rversion == 'TR3' || this.trlevel.rversion == 'TR4') {
				meshJSON._materials[m].uniforms.lighting = { type: "v3", value: new THREE.Vector3(1,1,1) }
			} else {
				meshJSON._materials[m].uniforms.lighting = { type: "f", value: 0.0 }
			}
		}

		this.sc.embeds['mesh' + meshIndex] = meshJSON;
		this.sc.geometries['mesh' + meshIndex] = {
			"type": "embedded",
			"id"  : "mesh" + meshIndex
		};

		return internalLit ? 1 : 0;
	},

	// create all the meshes of the level => not used
	createMeshes : function () {
		var numExternalLit = 0, numInternalLit = 0;

		for (var i = 0; i < this.trlevel.meshes.length; ++i) {

			var internalLit = this.createMesh(i);

			if (internalLit) numInternalLit++; else numExternalLit++;

		}
		console.log('Num meshes in level=' + this.trlevel.meshes.length + ', num externally lit=' + numExternalLit + ', num internally lit=' + numInternalLit);
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
			flags: { type:"v4", value:[] }
		};
		var tiles2material = {};

		meshJSON.attributes = attributes;

		meshJSON.vertices.push(sprite.leftSide, -sprite.topSide, 0);
		meshJSON.vertices.push(sprite.leftSide, -sprite.bottomSide, 0);
		meshJSON.vertices.push(sprite.rightSide, -sprite.bottomSide, 0);
		meshJSON.vertices.push(sprite.rightSide, -sprite.topSide, 0);

		for (var i = 0; i < 4; ++i) {
			meshJSON.colors.push(color);
			attributes.flags.value.push(flag);
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

		if (numSprites == 1) {
			for (var m = 0; m < meshJSON._materials.length; ++m) {
				if (this.trlevel.rversion == 'TR3' || this.trlevel.rversion == 'TR4') {
					meshJSON._materials[m].uniforms.lighting = { type: "v3", value: new THREE.Vector3(1,1,1) }
				} else {
					meshJSON._materials[m].uniforms.lighting = { type: "f", value: 0.0 }
				}
			}
		}

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
			var attributes = {
				flags: { type:"v4", value:[] }
			};
			var tiles2material = {};

			roomJSON.attributes = attributes;

			// push the vertices + vertex colors of the room
			for (var v = 0; v < rdata.vertices.length; ++v) {
				var rvertex = rdata.vertices[v];
				var vertexInfo = this.processRoomVertex(rvertex, isFilledWithWater, isFlickering);

				roomJSON.vertices.push(vertexInfo.x+info.x, vertexInfo.y, vertexInfo.z-info.z);
				attributes.flags.value.push(vertexInfo.flag);
				roomJSON.colors.push(vertexInfo.color);
			}

			// create the tri/quad faces
			this.makeFaces(roomJSON, [rdata.rectangles, rdata.triangles], tiles2material, this.trlevel.objectTextures, this.trlevel.mapObjTexture2AnimTexture, 0);
			
			// add the room to the scene
			this.sc.embeds['room' + m] = roomJSON;
			this.sc.geometries['room' + m] = {
				"type": "embedded",
				"id"  : "room" + m
			};
			this.sc.objects['room' + m] = {
				"geometry" 			: "room" + m,
				"material" 			: this.makeMaterialList(tiles2material, 'room'),
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

			// portal in the room
			var portals = [];
			for (var p = 0; p < room.portals.length; ++p) {
				var portal = room.portals[p];
				portals.push({
					"adjoiningRoom": portal.adjoiningRoom,
					"normal": { x:portal.normal.x, y:-portal.normal.y, z:-portal.normal.z },
					"vertices": [
						{ x:portal.vertices[0].x+info.x, y:-portal.vertices[0].y, z:-portal.vertices[0].z-info.z },
						{ x:portal.vertices[1].x+info.x, y:-portal.vertices[1].y, z:-portal.vertices[1].z-info.z },
						{ x:portal.vertices[2].x+info.x, y:-portal.vertices[2].y, z:-portal.vertices[2].z-info.z },
						{ x:portal.vertices[3].x+info.x, y:-portal.vertices[3].y, z:-portal.vertices[3].z-info.z }
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

				var q = new THREE.Quaternion();
				rot = ((rot & 0xC000) >> 14) * 90;
				q.setFromAxisAngle( { x:0, y:1, z:0}, THREE.Math.degToRad(-rot) );

				var internalLit = this.createMesh(mindex);

				if (internalLit == 0) {
					console.log('Static mesh objID=', objectID, ', meshIndex=', mindex, 'in room ', m, 'is externally lit.')
				}

				var materials = [];
				for (var mat = 0; mat < this.sc.embeds['mesh' + mindex]._materials.length; ++mat) {
					var material = jQuery.extend(true, {}, this.sc.embeds['mesh' + mindex]._materials[mat]);
					material.uniforms.lighting.value = this.convertIntensity(staticMesh.intensity1);
					materials.push(material);
				}
				
				this.sc.objects['room' + m + '_staticmesh' + s] = {
					"geometry" 		: "mesh" + mindex,
					"material" 		: materials,
					"position" 		: [ x, y, z ],
					"quaternion" 	: [ q.x, q.y, q.z, q.w ],
					"scale"	   		: [ 1, 1, 1 ],
					"visible"  		: !room.isAlternate,
					"type"			: 'staticmesh',
					"roomIndex"		: m,
					"objectid"		: objectID+50000
				};

			}

			// sprites in the room
			for (var s = 0; s < rdata.sprites.length; ++s) {
				var sprite = rdata.sprites[s], spriteIndex = sprite.texture;
				var rvertex = rdata.vertices[sprite.vertex];
				var vertexInfo = this.processRoomVertex(rvertex, isFilledWithWater, isFlickering);

				if (!this.createSpriteSeq(spriteIndex, vertexInfo.flag, vertexInfo.color)) continue;

				var materials = [];
				for (var mat = 0; mat < this.sc.embeds['sprite' + spriteIndex]._materials.length; ++mat) {
					var material = jQuery.extend(true, {}, this.sc.embeds['sprite' + spriteIndex]._materials[mat]);
					materials.push(material);
				}
				//console.log('room',m,'sprite',s,this.sc.embeds['sprite' + spriteIndex])
				
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

			// lights in the room
			if (room.lights.length > maxLightsInRoom) {
				maxLightsInRoom = room.lights.length;
				roomL = m;
			}

			var ambientColor = new THREE.Vector3();
			if (this.trlevel.rversion != 'TR4') {
				var ambient1 = 1.0 - room.ambientIntensity1/0x2000;
				ambientColor.set(ambient1, ambient1, ambient1);
			} else {
				var rc = room.roomColour;
				ambientColor.setX(((rc & 0xFF0000) >> 16) / 255.0);
				ambientColor.setY(((rc & 0xFF00) >> 8)  / 255.0);
				ambientColor.setZ((rc & 0xFF)  / 255.0);
			}

			var lights = [];
			for (var l = 0; l < room.lights.length; ++l) {
				var light = room.lights[l], color = new THREE.Vector3(1, 1, 1);
				var px = light.x, py = -light.y, pz = -light.z;
				var fadeIn = 0, fadeOut = 0;
				var plight = { type:'point' };
				switch(this.trlevel.rversion) {
					case 'TR1':
					case 'TR2':
						var intensity = light.intensity1;
		                if (intensity > 0x2000) intensity = 0x2000;
		                intensity = intensity / 0x2000;
		                color.set(intensity, intensity, intensity);
		                fadeOut = light.fade1;
						break;
					case 'TR3':
		                var r = light.color.r / 255.0;
		                var g = light.color.g / 255.0;
		                var b = light.color.b / 255.0;
		                var intensity = light.intensity;
		                if (intensity > 0x2000) intensity = 0x2000; // without this test, cut5 in TR3 (for eg) is wrong
		                intensity = intensity / 0x2000;
		                color.set(r*intensity, g*intensity, b*intensity);
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
		                color.set(r*intensity, g*intensity, b*intensity);
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
		}

		console.log('num max lights in one room=' + maxLightsInRoom + '. room=' + roomL)
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

					var qx = new THREE.Quaternion(), qy = new THREE.Quaternion(), qz = new THREE.Quaternion();

					qx.setFromAxisAngle( {x:1,y:0,z:0}, angleX );
					qy.setFromAxisAngle( {x:0,y:1,z:0}, -angleY );
					qz.setFromAxisAngle( {x:0,y:0,z:1}, -angleZ );

				    qy.multiply(qx).multiply(qz);

					keyData.push({
						"position": 	{ x:transX, y:transY, z:transZ },
						"quaternion":	{ x:qy.x, y:qy.y, z:qy.z, w:qy.w }
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

		var startObjIdAnim = this.confMgr.levelNumber(this.sc.levelShortFileName, 'rendering > scrolling_moveable > start_id', true, 0);
		var endObjIdAnim =  startObjIdAnim + this.confMgr.levelNumber(this.sc.levelShortFileName, 'rendering > scrolling_moveable > num', true, 0) - 1;

		var numMoveables = 0;
		for (var m = 0; m < this.trlevel.moveables.length; ++m) {
			var moveable = this.trlevel.moveables[m];

			var numMeshes = moveable.numMeshes, meshIndex = moveable.startingMesh, meshTree = moveable.meshTree;
			var isDummy = numMeshes == 1 && this.trlevel.meshes[meshIndex].dummy && !moveable.objectID == this.laraObjectID;

			if (this.sc.geometries['moveable' + moveable.objectID] || isDummy) continue;

			var meshJSON = this.createNewJSONEmbed();
			var attributes = {
				flags: { type:"v4", value:[] }
			};
			var tiles2material = {};
			var stackIdx = 0, stack = [], parent = -1;
			var px = 0, py = 0, pz = 0, ofsvert = 0, bones = [], skinIndices = [], skinWeights = [];

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

				var internalLit = this.makeMeshGeometry(mesh, meshIndex, meshJSON, tiles2material, this.trlevel.objectTextures, this.trlevel.mapObjTexture2AnimTexture, ofsvert, attributes, idx, skinIndices, skinWeights);
				
				moveableIsExternallyLit = moveableIsExternallyLit || !internalLit;

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
			meshJSON.moveableIsInternallyLit = !moveableIsExternallyLit;

			meshJSON._materials = this.makeMaterialList(tiles2material, 'moveable');
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

	createMoveableAsMultiMeshes : function (m, roomIndex, ofst) {

		var moveable = this.trlevel.moveables[m];
		var room = this.trlevel.rooms[roomIndex];

		var numMeshes = moveable.numMeshes, meshIndex = moveable.startingMesh, meshTree = moveable.meshTree;

		var stackIdx = 0, stack = [], parent = -1, bones = [];
		var px = 0, py = 0, pz = 0;

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

			/*var meshJSON = this.createNewJSONEmbed();
			var attributes = {
				flags: { type:"v4", value:[] }
			};
			var tiles2material = {};

			meshJSON.attributes = attributes;*/

			this.createMesh(meshIndex);
/*			var mesh = this.trlevel.meshes[meshIndex];

			var internalLit = this.makeMeshGeometry(mesh, meshIndex, meshJSON, tiles2material, this.trlevel.objectTextures, this.trlevel.mapObjTexture2AnimTexture, 0, attributes);

			var moveableIsExternallyLit = !internalLit;*/
			
			bones.push({
				"parent": parent,
				"pos_init": [ px, -py, -pz ]
			});

			parent = idx;

/*			meshJSON.moveableIsInternallyLit = !moveableIsExternallyLit;

			meshJSON._materials = this.makeMaterialList(tiles2material, 'mesh');
			for (var m = 0; m < meshJSON._materials.length; ++m) {
				if (this.trlevel.rversion == 'TR3' || this.trlevel.rversion == 'TR4') {
					meshJSON._materials[m].uniforms.lighting = { type: "v3", value: new THREE.Vector3(1,1,1) }
				} else {
					meshJSON._materials[m].uniforms.lighting = { type: "f", value: 0.0 }
				}
			}

			var mid = 'moveable' + moveable.objectID + '_mesh' + idx;
			this.sc.embeds[mid] = meshJSON;
			this.sc.geometries[mid] = {
				"type": "embedded",
				"id"  : mid
			};*/

		}

		meshIndex = moveable.startingMesh;
		for (var idx = 0; idx < numMeshes; ++idx, meshIndex++) {

			var mid = 'mesh' + meshIndex;

			var materials = [];
			for (var mat = 0; mat < this.sc.embeds[mid]._materials.length; ++mat) {
				var material = jQuery.extend(true, {}, this.sc.embeds[mid]._materials[mat]);
				material.uniforms.lighting.value = this.convertIntensity(0);
				materials.push(material);
			}

			var px = py = pz = 0, idx_ = idx;
			while (idx_ != -1) {
				px += bones[idx_].pos_init[0];
				py += bones[idx_].pos_init[1];
				pz += bones[idx_].pos_init[2];
				idx_ = bones[idx_].parent;
			}

			this.sc.objects['moveable' + moveable.objectID + '_mesh' + idx] = {
				"geometry" 		: mid,
				"material" 		: materials,
				"position" 		: [ px+ofst.x, py+ofst.y, pz+ofst.z ],
				"quaternion" 	: [ 0, 0, 0, 1 ],
				"scale"	   		: [ 1, 1, 1 ],
				"visible"  		: !room.isAlternate,
				"type"			: 'mesh',
				"roomIndex"		: roomIndex
			};

		}

	},

	createMoveableInstance : function(itemIndex, roomIndex, x, y, z, lighting, rotation, moveable, jsonid, visible) {

		if (typeof(jsonid) == 'undefined') jsonid = 'moveable' + moveable.objectID + '_' + itemIndex;
		if (typeof(visible) == 'undefined') visible = true;

		var room = this.sc.objects['room' + roomIndex];

		var objIDForVisu = this.confMgr.levelNumber(this.sc.levelShortFileName, 'moveables > moveable[id="' + moveable.objectID + '"] > visuid', true, moveable.objectID);

		var hasGeometry = this.sc.embeds['moveable' + objIDForVisu];
		var materials = null;
		if (hasGeometry) {
			var moveableIsInternallyLit = this.sc.embeds['moveable' + objIDForVisu].moveableIsInternallyLit;
			materials = [];
			for (var mat = 0; mat < this.sc.embeds['moveable' + objIDForVisu]._materials.length; ++mat) {
				var material = jQuery.extend(true, {}, this.sc.embeds['moveable' + objIDForVisu]._materials[mat]);
				if (lighting != -1 || moveableIsInternallyLit) {
					// item is internally lit
					// todo: for TR3/TR4, need to change to a shader that uses vertex color (like the shader mesh2, but for moveable)
					if (lighting == -1) lighting = 0;
					material.uniforms.lighting.value = this.convertIntensity(lighting);
				} else {
					// change material to a material that handles lights
					material.material = this.getMaterial('moveable', this.countLightTypes(room.lights));
					material.uniforms.lighting.value = 1.0;
				}
				materials.push(material);
			}
		}

		this.sc.objects[jsonid] = {
			"geometry" 				: hasGeometry ? "moveable" + objIDForVisu : null,
			"material" 				: materials,
			"position" 				: [ x, y, z ],
			"quaternion" 			: [ rotation.x, rotation.y, rotation.z, rotation.w ],
			"scale"	   				: [ 1, 1, 1 ],
			"visible"  				: !room.isAlternate && visible,
			"objectid" 				: moveable.objectID,
			"type"   				: 'moveable',
			"has_anims"				: true,
			"roomIndex"				: roomIndex,
			"animationStartIndex"	: moveable.animation,
			"skin"					: true,
			"use_vertex_texture" 	: false,
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
 		var room = this.trlevel.rooms[roomIndex];
		var spriteIndex = spriteSeq.offset;

		var rvertex = {
			vertex: { x:x, y:-y, z:-z },
			attribute: 0,
			lighting1: lighting,
			lighting2: lighting
		};
		var vertexInfo = this.processRoomVertex(rvertex, room.isFilledWithWater, room.isFlickering);

		if (this.createSpriteSeq(spriteSeq, vertexInfo.flag, vertexInfo.color)) {
			var spriteid = 'spriteseq' + spriteSeq.objectID;

			var materials = [];
			for (var mat = 0; mat < this.sc.embeds[spriteid]._materials.length; ++mat) {
				var material = jQuery.extend(true, {}, this.sc.embeds[spriteid]._materials[mat]);
				materials.push(material);
			}
			
			this.sc.objects['spriteseq' + spriteSeq.objectID + '_' + itemIndex] = {
				"geometry" 	: spriteid,
				"material" 	: materials,
				"position" 	: [ vertexInfo.x, vertexInfo.y, vertexInfo.z ],
				"quaternion": [ 0, 0, 0, 1 ],
				"scale"	   	: [ 1, 1, 1 ],
				"visible"  	: !room.isAlternate,
				"objectid" 	: spriteSeq.objectID,
				"isSprite" 	: 'sprite',
				"roomIndex"	: roomIndex
			};
		}
	},

	createItems : function () {
		var movObjID2Index = {}, sprObjID2Index = {};

		for (var m = 0; m < this.trlevel.moveables.length; ++m) {
			var moveable = this.trlevel.moveables[m];
			movObjID2Index[moveable.objectID] = m;
		}

		for (var sq = 0; sq < this.trlevel.spriteSequences.length; ++sq) {
			var spriteSeq = this.trlevel.spriteSequences[sq];
			sprObjID2Index[spriteSeq.objectID] = sq;
		}

		var laraMoveable = null;
		var numMoveableInstances = 0, numSpriteSeqInstances = 0;
		for (var i = 0; i < this.trlevel.items.length; ++i) {
			var item = this.trlevel.items[i];

			var roomIndex = item.room, lighting = item.intensity1, q = new THREE.Quaternion();

			q.setFromAxisAngle( {x:0,y:1,z:0}, THREE.Math.degToRad(-(item.angle >> 14) * 90) );

			var m = movObjID2Index[item.objectID];
			if (m == null) {
				this.createSpriteSeqInstance(i, roomIndex, item.x, -item.y, -item.z, lighting, q, this.trlevel.spriteSequences[sprObjID2Index[item.objectID]]);
				numSpriteSeqInstances++;
			} else {
				var mvb = this.createMoveableInstance(i, roomIndex, item.x, -item.y, -item.z, lighting, q, this.trlevel.moveables[m]);
				if (item.objectID == this.laraObjectID) {
					laraMoveable = mvb;
				}
				numMoveableInstances++;
			}
		}

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

				var mindex = movObjID2Index[mid];
				
				if (typeof(mindex) != "undefined") {
					var mobj = this.createMoveableInstance(0, laraRoomIndex, 0, 0, 0, -1, { x:0, y:0, z:0, w:1 }, this.trlevel.moveables[mindex], 'meshswap' + (i+1), false);

					mobj.dummy = true;
				}
			}

			// create the 'pistol anim' moveable
			var pistolAnimId = this.confMgr.levelNumber(this.sc.levelShortFileName, 'behaviour[name="Lara"] > pistol_anim > id', true, -1);
			if (pistolAnimId != -1) {
				var mindex = movObjID2Index[pistolAnimId];

				if (typeof(mindex) != "undefined") {
					var mobj = this.createMoveableInstance(0, laraRoomIndex, 0, 0, 0, -1, { x:0, y:0, z:0, w:1 }, this.trlevel.moveables[mindex], 'pistolanim', false);

					mobj.dummy = true;
				}
			}

			// create the 'ponytail' moveable
			if (false) {
				var ponytailId = this.confMgr.levelNumber(this.sc.levelShortFileName, 'behaviour[name="Lara"] > lara > ponytailid', true, -1);
				if (ponytailId != -1) {
					var mindex = movObjID2Index[ponytailId];

					if (typeof(mindex) != "undefined") {

						this.createMoveableAsMultiMeshes(mindex, laraRoomIndex, { x:-2, y:15, z:55 });

						/*var q1 = new THREE.Quaternion();
						var q1b = new THREE.Quaternion();

						q1.setFromAxisAngle( {x:0,y:1,z:0}, THREE.Math.degToRad(180) );
						q1b.setFromAxisAngle( {x:1,y:0,z:0}, THREE.Math.degToRad(-90) );
						q1.multiply(q1b);

						var mobj = this.createMoveableInstance(0, laraRoomIndex, 0, 0, 0, -1, { x:0, y:0, z:0, w:0 }, this.trlevel.moveables[mindex], 'ponytail', true);

						mobj.dummy = true;
						console.log(mobj, this.sc.embeds['moveable2'])

						var animKeys = [
							{
								"time": 		0, 
								"boundingBox": 	{ xmin:0, ymin:0, zmin:0, xmax:500, ymax:500, zmax:500 },
								"data":  		[
									{
										"position": 	{ x:-2, y:15, z:55 },
										"quaternion_":	{ x:q1.x, y:q1.y, z:q1.z, w:q1.w },
										"quaternion":	{ x:0, y:0, z:0, w:0 }
									},
									{
										"position": 	{ x:0, y:0, z:0 },
										"quaternion":	{ x:0, y:0, z:0, w:1 }
									},
									{
										"position": 	{ x:0, y:0, z:0 },
										"quaternion":	{ x:0, y:0, z:0, w:1 }
									},
									{
										"position": 	{ x:0, y:0, z:0 },
										"quaternion":	{ x:0, y:0, z:0, w:1 }
									},
									{
										"position": 	{ x:0, y:0, z:0 },
										"quaternion":	{ x:0, y:0, z:0, w:1 }
									},
									{
										"position": 	{ x:0, y:0, z:0 },
										"quaternion":	{ x:0, y:0, z:0, w:1 }
									}
								]
							}
						];

						var tracks = this.sc.animTracks;
						var track = {
							"name": 			"animponytail",
							"numKeys":  		1,
							"numFrames":  		1,
							"frameRate": 		1,
							"fps":  			1.0,
							"nextTrack":  		tracks.length,
							"nextTrackFrame": 	0,
							"keys":  			animKeys,
							"commands":     	[],
							"frameStart":    	0
						};

						tracks.push(track);

						mobj.animationStartIndex = tracks.length-1;*/
					}
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
		if (skyId && movObjID2Index[skyId] && !noSky) {
			moveable = this.trlevel.moveables[movObjID2Index[skyId]];
			var materials = [];
			for (var mat = 0; mat < this.sc.embeds['moveable' + moveable.objectID]._materials.length; ++mat) {
				var material = jQuery.extend(true, {}, this.sc.embeds['moveable' + moveable.objectID]._materials[mat]);
				material.uniforms.lighting.value = 1.0;
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
				"scale"	   				: this.trlevel.rversion != 'TR4' ? [ 1, 1, 1 ] : [100, 100, 100], // see comment in MasterLoader.js for the x100 scaling reason
				"visible"  				: true,
				"objectid" 				: moveable.objectID,
				"type"     				: 'moveable',
				"animationStartIndex"	: moveable.animation,
				"has_anims"				: !skyNoAnim,
				"skin"					: true,
				"use_vertex_texture" 	: false
			};
			numMoveableInstances++;	
		}

		// specific handling of the skydome (TR4 only)
		if (this.trlevel.rversion == 'TR4') {
			var skyColor = new THREE.Vector3(
					this.confMgr.levelNumber(this.sc.levelShortFileName, 'sky > color > r', true, 255)/255.0,
					this.confMgr.levelNumber(this.sc.levelShortFileName, 'sky > color > g', true, 255)/255.0,
					this.confMgr.levelNumber(this.sc.levelShortFileName, 'sky > color > b', true, 255)/255.0
				);
			var materials = [
				{
					"material": this.getMaterial("skydome"),
					"uniforms": {
						"map" : { type: "t", value: "sky" },
						"offsetRepeat" : { type: "v4", value: new THREE.Vector4( 0, 0, 1, 1 ) },
						"tintColor" : { type: "v3", value : skyColor }
					},
					"depthWrite" : false,
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
				"use_vertex_texture" 	: false,
				"dummy"					: true
			};
			
			var meshJSON = this.createNewJSONEmbed();
			var meshData = TRN.SkyDome.create(
				/*curvature*/ 10.0,
				/*tiling*/ 3,
				/*distance*/ 2000.0,
				/*orientation*/ new THREE.Quaternion(),
				/*xsegments*/ 16, 
				/*ysegments*/ 16,
				/*ySegmentsToKeep*/ 8
			);
			
			meshJSON.attributes = null;
			meshJSON.vertices = meshData.vertices;
			meshJSON.uvs[0] = meshData.textures;

			var faces = meshData.faces, numFaces = faces.length / 3;
			for (var f = 0; f < numFaces; ++f) {
				meshJSON.faces.push(10); // 1=quad / 2=has material / 8=has vertex uv / 128=has vertex color

				// vertex indices
				for (var v = 0; v < 3; ++v) {
					meshJSON.faces.push(faces[f*3+v]);
				}

				meshJSON.faces.push(0); // material index

				// texture indices
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
		this.sc.levelShortFileNameOrig = this.sc.levelFileName.substring(0, this.sc.levelFileName.indexOf('.'));
		this.sc.levelShortFileName = this.sc.levelShortFileNameOrig.toLowerCase();
		this.sc.waterColor = {
			"in" : this.confMgr.globalColor('water > colorin'),
			"out" : this.confMgr.globalColor('water > colorout')
		};
		//this.sc.texturePath = "TRN/texture/" + this.trlevel.rversion.toLowerCase() + "/";
		this.sc.soundPath = "TRN/sound/" + this.trlevel.rversion.toLowerCase() + "/";
		this.sc.rversion = this.trlevel.rversion;

		this.laraObjectID = this.confMgr.levelNumber(this.sc.levelShortFileName, 'lara > id', true, 0);

		// get Lara's position => camera starting point
		var laraPos = { x:0, y:0, z:0, rotY:0 };
		for (var i = 0; i < this.trlevel.items.length; ++i) {
			var item = this.trlevel.items[i];
			if (item.objectID == this.laraObjectID) {
				laraPos.x = item.x;
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

		this.createTextures();

		this.createAnimatedTextures();

		this.createRooms();

		this.createMoveables();

		this.createAnimations();

		this.createItems();

		if (this.sc.cutScene.frames) {
			// update position/quaternion for some specific items if we play a cut scene
			var min = this.confMgr.levelNumber(this.sc.levelShortFileName, 'cutscene > animminid', true, 0);
			var max = this.confMgr.levelNumber(this.sc.levelShortFileName, 'cutscene > animmaxid', true, 0);
			for (var objID in this.sc.objects) {
				var objJSON = this.sc.objects[objID];

				if (objJSON.objectid == this.laraObjectID || (objJSON.objectid >= min && objJSON.objectid <= max)) {
					objJSON.position = [ this.sc.cutScene.origin.x, this.sc.cutScene.origin.y, this.sc.cutScene.origin.z ];
					var q = new THREE.Quaternion();
					q.setFromAxisAngle( {x:0,y:1,z:0}, THREE.Math.degToRad(this.sc.cutScene.origin.rotY) );
					objJSON.quaternion = [ q.x, q.y, q.z, q.w ];
				}
			}

			// get the sound for this cut scene
			var this_ = this;
			var binaryBuffer = new TRN.BinaryBuffer(
				[
				  this_.sc.soundPath + this_.sc.levelShortFileName.toUpperCase()
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
