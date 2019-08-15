TRN.MasterLoader = {

	/* trlevel is either:
	 	* a string which is the name of the level to download. On the web site, the level file is in JSON format as outputted by TRN.SceneConverter (so no need to call it again on client side)
	 	* a JSON object like { data:XXX, name:YYY } where data are the binary data of the TR level and YYY the filename
	 */	
	loadLevel : function (trlevel, progressbar, callbackLevelLoaded) {
		
		var this_ = this;

		progressbar.show();

		if (typeof(trlevel) != 'string') {

			var rs = TRN.Loader.loadRawLevel(trlevel.data, trlevel.name);

			if (trlevel.noConversion) {
				callbackLevelLoaded(rs.json);
				return;
			}

			var converter = new TRN.SceneConverter(new TRN.ConfigMgr(rs.json.rversion));

			converter.convert(rs.json, this._parseLevel.bind(this, trlevel, progressbar, callbackLevelLoaded));

		} else {

			var isZip = trlevel.indexOf('.zip') >= 0;

		    var request = new XMLHttpRequest();

		    request.open("GET", trlevel, true);
		    request.responseType = isZip ? "arraybuffer" : "text";

		    request.onerror = function() {
		        console.log('Read level: XHR error', request.status, request.statusText);
		    }

		    request.onprogress = function(e) {
		    	if (e.lengthComputable) {
		    		var pct = 0;

					if ( e.total )
						pct = e.loaded / e.total;

		    		progressbar.progress(pct);

		    	}
		    }

		    request.onreadystatechange = function() {
		        if (request.readyState != 4) return;

		        if (request.status != 200) {
			   		console.log('Could not read the level', trlevel, request.status, request.statusText);
		        } else {
		        	progressbar.progress(1);
		        	var sc;
		        	if (isZip) {
			        	console.log('Level', trlevel, 'loaded. Unzipping...');
			    		var zip = new JSZip();
			    		zip.load(request.response);
			    		var f = zip.file('level');
			    		sc = JSON.parse(f.asText());
			    		console.log('Level unzipped.');
			    	} else {
			    		sc = JSON.parse(request.response);
			    	}
		    		this_._parseLevel(trlevel, progressbar, callbackLevelLoaded, sc);
		        }
		    }

			request.send();

		}
	},

	/*
		Make ThreeJS parse sceneJSON into its own internal scene representation
	*/
	_parseLevel : function (trlevel, progressbar, callbackLevelLoaded, sceneJSON) {

		var this_ = this;

		var loader = new THREE.SceneLoader();

		loader.callbackProgress = function (progress, result) {

			var	pct = 0,
				total = progress.totalModels + progress.totalTextures,
				loaded = progress.loadedModels + progress.loadedTextures;

			if (total)
				pct = loaded / total;

			progressbar.progress(pct);

		};

		loader.parse(sceneJSON, function(scene) {

		    window.setTimeout(function() {

		    	progressbar.setMessage('Processing...');

			    window.setTimeout(function() {

			    	var oscene = new TRN.Scene(sceneJSON, scene);
			    	if (trlevel.noPostProcess) {
			    		callbackLevelLoaded(oscene);
			    	} else {
						this_._postProcessLevel(progressbar, callbackLevelLoaded, oscene);
			    	}

				}, 100);

			}, 100);

		}, '');

	},

	/*
		Called when ThreeJS has finished parsing the JSON scene.
		We now make additional setup in the scene created by ThreeJS
	*/
	_postProcessLevel : function (progressbar, callbackLevelLoaded, oscene) {

		var sceneJSON = oscene.sceneJSON, scene = oscene.scene;
		var confMgr = new TRN.ConfigMgr(sceneJSON.rversion);

		sceneJSON.curRoom = -1;

		TRN.ObjectID.skyId = confMgr.levelNumber(sceneJSON.levelShortFileName, 'sky > objectid', true, 0);
		TRN.ObjectID.Lara  = confMgr.levelNumber(sceneJSON.levelShortFileName, 'lara > id', true, 0);
		TRN.ObjectID.Ponytail = confMgr.levelNumber(sceneJSON.levelShortFileName, 'behaviour[name="Lara"] > lara > ponytailid', true, -1);
		TRN.Consts.leftThighIndex = confMgr.levelNumber(sceneJSON.levelShortFileName, 
			'moveables > moveable[id="' + TRN.ObjectID.Lara + '"] > behaviour[name="Lara"] > pistol_anim > left_thigh', true, 0) - 1;
		TRN.Consts.rightThighIndex = confMgr.levelNumber(sceneJSON.levelShortFileName, 
			'moveables > moveable[id="' + TRN.ObjectID.Lara + '"] > behaviour[name="Lara"] > pistol_anim > right_thigh', true, 0) - 1;
		TRN.Consts.leftHandIndex = confMgr.levelNumber(sceneJSON.levelShortFileName, 
			'moveables > moveable[id="' + TRN.ObjectID.Lara + '"] > behaviour[name="Lara"] > pistol_anim > left_hand', true, 0) - 1;
		TRN.Consts.rightHandIndex = confMgr.levelNumber(sceneJSON.levelShortFileName, 
			'moveables > moveable[id="' + TRN.ObjectID.Lara + '"] > behaviour[name="Lara"] > pistol_anim > right_hand', true, 0) - 1;
		TRN.Consts.useUVRotate = confMgr.levelBoolean(sceneJSON.levelShortFileName, 'uvrotate', true, false);

		// make sure the skies are displayed first
		if (scene.objects.skydome) {
			scene.objects.skydome.renderDepth = -1e11;
		}

		if (scene.objects.sky) {
			scene.objects.sky.renderDepth = -1e10;
		}

		var skyTexture = scene.textures['sky'];
		if (skyTexture) {
			skyTexture.wrapS = skyTexture.wrapT = THREE.RepeatWrapping;
			skyTexture.
			skyTexture.needsUpdate = true;
		}

		// initialize the animated textures
		scene.animatedTextures = sceneJSON.animatedTextures;
		
		if (scene.animatedTextures) {

			for (var i = 0; i < scene.animatedTextures.length; ++i) {
				var animTexture = scene.animatedTextures[i];
				animTexture.progressor = new TRN.Sequence(animTexture.animcoords.length, 1.0/animTexture.animspeed);
			}

		}

		// animations
		if (sceneJSON.animTracks) {

			scene.animTracks = [];

			// create one track per animation
			for (var t = 0; t < sceneJSON.animTracks.length; ++t) {

				var trackJSON = sceneJSON.animTracks[t], keys = trackJSON.keys;

				var track = new TRN.Animation.Track(trackJSON.numKeys, trackJSON.numFrames, trackJSON.frameRate, trackJSON.fps, trackJSON.name);

				trackJSON.commands.frameStart = trackJSON.frameStart;

				track.setNextTrack(trackJSON.nextTrack, trackJSON.nextTrackFrame);
				track.setCommands(trackJSON.commands);

				scene.animTracks.push(track);

				for (var k = 0; k < keys.length; ++k) {

					var keyJSON = keys[k], dataJSON = keyJSON.data, bbox = keyJSON.boundingBox;

					var boundingBox = new THREE.Box3(new THREE.Vector3(bbox.xmin, bbox.ymin, bbox.zmin), new THREE.Vector3(bbox.xmax, bbox.ymax, bbox.zmax));

					var key = new TRN.Animation.Key(keyJSON.time, boundingBox);

					for (var d = 0; d < dataJSON.length; ++d) {

						key.addData(dataJSON[d].position, dataJSON[d].quaternion);

					}

					track.addKey(key);

				}
			}

			// instanciate the first track for each animated object
			for (var objID in scene.objects) {

				var obj = scene.objects[objID];
				var objJSON = sceneJSON.objects[objID];

				if (!objJSON.has_anims) continue;

				if (sceneJSON.cutScene.frames) {

					// register all animations we will need in the cut scene
					var registered = {}, anmIndex = objJSON.animationStartIndex, allTrackInstances = {};

					while (true) {

						if (registered[anmIndex]) break;
						
						registered[anmIndex] = true;

						var track = scene.animTracks[anmIndex];
						var trackInstance = new TRN.Animation.TrackInstance(track, obj, sceneJSON.embeds[objJSON.geometry].bones);

						allTrackInstances[anmIndex] = trackInstance;

						anmIndex = track.nextTrack;

					}

					obj.allTrackInstances = allTrackInstances;

					var trackInstance = allTrackInstances[objJSON.animationStartIndex];

					trackInstance.setNextTrackInstance(obj.allTrackInstances[trackInstance.track.nextTrack], trackInstance.track.nextTrackFrame);
					trackInstance.setNoInterpolationToNextTrack = true;

					trackInstance.runForward(0);
					trackInstance.interpolate();

					obj.trackInstance = trackInstance;

				} else {

					var animIndex = objJSON.animationStartIndex;

					var track = scene.animTracks[animIndex];
					var trackInstance = new TRN.Animation.TrackInstance(track, obj, sceneJSON.embeds[objJSON.geometry].bones);

					if (track) { // to avoid bugging for lost artifact TR3 levels
						trackInstance.setNextTrackInstance(trackInstance, track.nextTrackFrame);

						trackInstance.runForward(Math.random()*track.getLength()); // pass a delta time, to desynchro identical objects
						trackInstance.interpolate();
			
						obj.trackInstance = trackInstance;
					}
				}

				obj.prevTrackInstance = obj.trackInstance;
				obj.prevTrackInstanceFrame = 0;

			}
		}

		// Set all objects except camera/sky + animated objects as auto update=false
		for (var objID in scene.objects) {

			var obj = scene.objects[objID];
			var objJSON = sceneJSON.objects[objID];

			obj.initPos = new THREE.Vector3();
			obj.initPos.copy(obj.position);

			if (!objJSON.has_anims && objID.indexOf('camera') < 0 && objID.indexOf('sky') < 0) {

				obj.updateMatrix();
				obj.matrixAutoUpdate = false;

			}
		}

		// don't flip Y coordinates in textures
		for (var texture in scene.textures) {

			if (!scene.textures.hasOwnProperty(texture)) continue;

			scene.textures[texture].flipY = false;

		}

		// create the material for each mesh and set the loaded texture in the ShaderMaterial materials
		var tintColor = confMgr.levelColor(sceneJSON.levelShortFileName, 'globaltintcolor', true, null), globalTintColor = null;

		if (tintColor != null) {
			globalTintColor = new THREE.Vector3(tintColor.r, tintColor.g, tintColor.b);
		}
		for (var objID in scene.objects) {

			var obj = scene.objects[objID];
			var objJSON = sceneJSON.objects[objID];

			if (!(obj instanceof THREE.Mesh)) continue;

			if (!objJSON.has_anims) {
				obj.geometry.computeBoundingBox();
				obj.geometry.boundingBox.getBoundingSphere(obj.geometry.boundingSphere);
			}

			obj.frustumCulled = true;
			obj.dummy = objJSON.dummy;

			var material = new THREE.MeshFaceMaterial();
			obj.material = material;

			obj.geometry.computeFaceNormals();
			obj.geometry.computeVertexNormals();

			var room = objJSON.type == 'room' ? objJSON : sceneJSON.objects['room' + objJSON.roomIndex];

			var attributes = sceneJSON.embeds[sceneJSON.geometries[objJSON.geometry].id].attributes;

			if (attributes) {
				attributes.flags.needsUpdate = true;
			}

			for (var mt_ = 0; mt_ < objJSON.material.length; ++mt_) {

				var elem = objJSON.material[mt_];
				material.materials[mt_] = scene.materials[elem.material].clone();
				if (elem.uniforms) {
					material.materials[mt_].uniforms = THREE.UniformsUtils.merge([material.materials[mt_].uniforms, elem.uniforms]);
				}

				if (attributes) {
					material.materials[mt_].attributes = attributes;
				}

				for (var mkey in elem) {

					if (!elem.hasOwnProperty(mkey) || mkey == 'uniforms' || mkey == 'attributes') continue;
					material.materials[mt_][mkey] = elem[mkey];

				}
			}

			var materials = material.materials;

			if (!materials || !materials.length) continue;

			for (var i = 0; i < materials.length; ++i) {

				var material = materials[i];

				if (material.uniforms.map && typeof(material.uniforms.map.value) == 'string' && material.uniforms.map.value) {
					material.uniforms.map.value = scene.textures[material.uniforms.map.value];
				}

				if (room && room.filledWithWater) {
					material.uniforms.tintColor.value = new THREE.Vector3(sceneJSON.waterColor.in.r, sceneJSON.waterColor.in.g, sceneJSON.waterColor.in.b);
				}

				if (globalTintColor != null) {
					// used in cut scene 3 in TR1
					material.uniforms.tintColor.value = globalTintColor;
				}

				if (objJSON.has_anims && room && room.lights.length > 0) { // only animated objects are externally lit and need light definitions from the room

					material.uniforms.ambientColor.value = room.ambientColor;
					material.uniforms.pointLightPosition = { type: "v3v", value: [] };
					material.uniforms.pointLightColor = { type: "v3v", value: [] };
					material.uniforms.pointLightDistance = { type: "fv1", value: [] };

					for (var l = 0; l < room.lights.length; ++l) {

						var light = room.lights[l];
						material.uniforms.pointLightPosition.value[l] = new THREE.Vector3(light.x, light.y, light.z);
						material.uniforms.pointLightColor.value[l] = light.color;
						material.uniforms.pointLightDistance.value[l] = light.fadeOut;

					}
				}

				if (material.hasAlpha) {

					material.transparent = true;
					material.blending = THREE.AdditiveBlending;
					material.blendSrc = THREE.OneFactor;
					material.blendDst = THREE.OneMinusSrcColorFactor;
					material.depthWrite = false;
					material.needsUpdate = true;

				}

				if (objJSON.objectid == TRN.ObjectID.skyId) {
					material.transparent = false; 	// in TR4, the sky object has some transparent faces. If we keep transparent=true in the material, those faces will be rendered after all the room geometry
													// because in threeJS all opaque objects are rendered first, then the transparent ones. The problem is that the sky object (its geometry, which is a kind of a shpere) 
													// is not very big, and so the transparent faces may be drawn over the room faces.
													// Note that the opaque faces of the sky object are correctly occluded by the room faces because of the .renderDepth=-1e10 set a number of lines above, meaning the sky opaque faces
													// will always be drawn first, before any other faces
				}
			}
		}

		// put pistols in Lara holsters
		var obj = scene.objects[TRN.Consts.objNameForPistolAnim];
		var lara = oscene.findObjectById(TRN.ObjectID.Lara);

		if (obj && lara) {
			var mswap = new TRN.MeshSwap(obj, lara);

			mswap.swap([TRN.Consts.leftThighIndex, TRN.Consts.rightThighIndex]);
		}

		var camera = scene.currentCamera;

		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

		//camera.position.set(29808.49251,-2111.99851,-56327.35790);
		//camera.quaternion.set(0.13390,0.13249,0.01807,-0.98193);

		if (TRN.Browser.QueryString.pos) {

			var vals = TRN.Browser.QueryString.pos.split(',');
			camera.position.set(parseFloat(vals[0]), parseFloat(vals[1]), parseFloat(vals[2]));

		}

		if (TRN.Browser.QueryString.rot) {

			var vals = TRN.Browser.QueryString.rot.split(',');
			camera.quaternion.set(parseFloat(vals[0]), parseFloat(vals[1]), parseFloat(vals[2]), parseFloat(vals[3]));

		}

		camera.updateMatrix();
		camera.updateMatrixWorld();

		oscene.setCamera(camera);

		if (sceneJSON.cutScene.soundData && TRN.Browser.AudioContext) {

            TRN.Browser.AudioContext.decodeAudioData(

                TRN.Base64Binary.decodeArrayBuffer(sceneJSON.cutScene.soundData),

                function(buffer) {

                    if (!buffer) {
                        console.log('error decoding sound data for cut scene');
                    } else {
						sceneJSON.cutScene.sound = TRN.Browser.AudioContext.createBufferSource();
						sceneJSON.cutScene.sound.buffer = buffer;
						sceneJSON.cutScene.sound.connect(TRN.Browser.AudioContext.destination);
                    }

					callbackLevelLoaded(oscene);
                }    
            );

		} else {

			callbackLevelLoaded(oscene);

		}
	}
}
