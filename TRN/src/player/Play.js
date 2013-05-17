TRN.Play = function (container) {

	this.container = jQuery(container);

	this.camera = null;
	this.scene = null;
	this.sceneJSON = null;
	this.controls = null;
	this.startTime = -1;
	
	this.panel = new TRN.Panel(this.container, this);
	this.progressbar = new TRN.ProgressBar(this.container);

	this.panel.hide();
	this.progressbar.hide();

	this.quantum = 1000/TRN.baseFrameRate;
	this.quantumTime = -1;
	this.quantumRnd = 0;

	this.flickerColor = new THREE.Vector3(1.2, 1.2, 1.2);
	this.unitVec3 = new THREE.Vector3(1.0, 1.0, 1.0);

	this.clock = new THREE.Clock();

	this.renderer = new THREE.WebGLRenderer({ antialias: true });
	this.renderer.setSize(this.container.width(), this.container.height());
	this.renderer.autoUpdateObjects = false; // to avoid having initWebGLObjects called every frame
	//renderer.sortObjects = false;

	this.needWebGLInit = false;

	this.container.append( this.renderer.domElement );

	this.stats = new Stats();
	this.stats.domElement.style.position = 'absolute';
	this.stats.domElement.style.top = '0px';
	this.stats.domElement.style.right = '0px';
	this.stats.domElement.style.zIndex = 100;

	this.container.append(this.stats.domElement);

	this.lara = {};

	this.globalTintColor = null;

}

TRN.Play.prototype = {

	constructor : TRN.Play,

	onWindowResize : function () {

		this.camera.aspect = this.container.width() / this.container.height();
		this.camera.updateProjectionMatrix();

		this.renderer.setSize( this.container.width(), this.container.height() );

		this.render();

	},

	showLevel : function (trlevel) {

		var this_ = this;

		this.progressbar.show();

		if (typeof(trlevel) == 'string') {

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

		    		this_.progressbar.progress(pct);

		    	}
		    }

		    request.onreadystatechange = function() {
		        if (request.readyState != 4) return;

		        if (request.status != 200) {
			   		console.log('Could not read the level', trlevel, request.status, request.statusText);
		        } else {
		        	this_.progressbar.progress(1);
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
		    		this_.levelConverted(sc);
		        }
		    }

			request.send();

		} else {

			var converter = new TRN.LevelConverter(trlevel.confMgr);

			converter.convert(trlevel, this.levelConverted.bind(this));

		}
	},

	levelConverted : function (sc) {

		this.sceneJSON = sc;
		this.confMgr = new TRN.ConfigMgr(sc.rversion);

		TRN.ObjectID.Lara = this.confMgr.levelNumber(sc.levelShortFileName, 'lara > id', true, 0);

		var tintColor = this.confMgr.levelColor(sc.levelShortFileName, 'globaltintcolor', true, null);

		if (tintColor != null) {
			this.globalTintColor = new THREE.Vector3(tintColor.r, tintColor.g, tintColor.b);
		}

		var this_ = this;

		if (sc.cutScene.soundData && TRN.Browser.AudioContext) {

            TRN.Browser.AudioContext.decodeAudioData(

                TRN.Base64Binary.decodeArrayBuffer(sc.cutScene.soundData),

                function(buffer) {

                    if (!buffer) {
                        console.log('error decoding sound data for cut scene');
                    } else {
						sc.cutScene.sound = TRN.Browser.AudioContext.createBufferSource();
						sc.cutScene.sound.buffer = buffer;
						sc.cutScene.sound.connect(TRN.Browser.AudioContext.destination);
                    }

					this_.parseLevel();
                }    
            );

		} else {

			this.parseLevel();

		}
	},

	parseLevel : function () {

		var this_ = this;

		var loader = new THREE.SceneLoader();

		loader.callbackProgress = function (progress, result) {

			var	pct = 0,
				total = progress.totalModels + progress.totalTextures,
				loaded = progress.loadedModels + progress.loadedTextures;

			if (total)
				pct = loaded / total;

			this_.progressbar.progress(pct);

		};

		loader.parse(this.sceneJSON, function(result) {

		    window.setTimeout(function() {

		    	this_.progressbar.setMessage('Processing...');

			    window.setTimeout(function() {

					this_.levelParsed(result);

				}, 100);

			}, 100);

		}, '');

	},

	levelParsed : function (result) {

		this.scene = result;

		this.sceneJSON.curRoom = -1;

		this.getLaraConfig();

		// make sure the sky is displayed first
		if (this.scene.objects.sky) {
			this.scene.objects.sky.renderDepth = -1e10;
			//scene.objects.sky.frustumCulled = false;
		}

		// initialize the animated textures
		this.scene.animatedTextures = this.sceneJSON.animatedTextures;
		
		if (this.scene.animatedTextures) {

			for (var i = 0; i < this.scene.animatedTextures.length; ++i) {
				var animTexture = this.scene.animatedTextures[i];
				animTexture.progressor = new TRN.Sequence(animTexture.animcoords.length, 1.0/animTexture.animspeed);
			}

		}

		// animations
		if (this.sceneJSON.animTracks) {

			this.scene.animTracks = [];

			// create one track per animation
			for (var t = 0; t < this.sceneJSON.animTracks.length; ++t) {

				var trackJSON = this.sceneJSON.animTracks[t], keys = trackJSON.keys;

				var track = new TRN.Animation.Track(trackJSON.numKeys, trackJSON.numFrames, trackJSON.frameRate, trackJSON.fps, trackJSON.name);

				trackJSON.commands.frameStart = trackJSON.frameStart;

				track.setNextTrack(trackJSON.nextTrack, trackJSON.nextTrackFrame);
				track.setCommands(trackJSON.commands);

				this.scene.animTracks.push(track);

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
			for (var objID in this.scene.objects) {

				var obj = this.scene.objects[objID];
				var objJSON = this.sceneJSON.objects[objID];

				if (!objJSON.has_anims) continue;

				if (this.sceneJSON.cutScene.frames) {

					// register all animations we will need in the cut scene
					var registered = {}, anmIndex = objJSON.animationStartIndex, allTrackInstances = {};

					while (true) {

						if (registered[anmIndex]) break;
						
						registered[anmIndex] = true;

						var track = this.scene.animTracks[anmIndex];
						var trackInstance = new TRN.Animation.TrackInstance(track, obj, this.sceneJSON.embeds[objJSON.geometry].bones);

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

					var track = this.scene.animTracks[animIndex];
					var trackInstance = new TRN.Animation.TrackInstance(track, obj, this.sceneJSON.embeds[objJSON.geometry].bones);

					trackInstance.setNextTrackInstance(trackInstance, track.nextTrackFrame);

					trackInstance.runForward(Math.random()*track.getLength()); // pass a delta time, to desynchro identical objects
					trackInstance.interpolate();
		
					obj.trackInstance = trackInstance;

				}

				obj.prevTrackInstance = obj.trackInstance;
				obj.prevTrackInstanceFrame = 0;

			}
		}

		// Set all objects except camera/sky + animated objects as auto update=false
		for (var objID in this.scene.objects) {

			var obj = this.scene.objects[objID];
			var objJSON = this.sceneJSON.objects[objID];

			if (!objJSON.has_anims && objID.indexOf('camera') < 0 && objID != 'sky') {

				obj.updateMatrix();
				obj.matrixAutoUpdate = false;

			}
		}

		// don't flip Y coordinates in textures
		for (var texture in this.scene.textures) {

			if (!this.scene.textures.hasOwnProperty(texture)) continue;

			this.scene.textures[texture].flipY = false;

		}

		// create the material for each mesh and set the loaded texture in the ShaderMaterial materials
		for (var objID in this.scene.objects) {

			var obj = this.scene.objects[objID];
			var objJSON = this.sceneJSON.objects[objID];

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

			var room = objJSON.type == 'room' ? objJSON : this.sceneJSON.objects['room' + objJSON.roomIndex];

			var attributes = this.sceneJSON.embeds[this.sceneJSON.geometries[objJSON.geometry].id].attributes;

			if (attributes) {
				attributes.flags.needsUpdate = true;
			}

			for (var mt_ = 0; mt_ < objJSON.material.length; ++mt_) {

				var elem = objJSON.material[mt_];
				material.materials[mt_] = this.scene.materials[elem.material].clone();
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
					material.uniforms.map.value = this.scene.textures[material.uniforms.map.value];
				}

				if (room && room.filledWithWater) {
					material.uniforms.tintColor.value = new THREE.Vector3(this.sceneJSON.waterColor.in.r, this.sceneJSON.waterColor.in.g, this.sceneJSON.waterColor.in.b);
				}

				if (this.globalTintColor != null) {
					// used in cut scene 3 in TR1
					material.uniforms.tintColor.value = this.globalTintColor;
				}

				if (objJSON.has_anims && room) { // only animated objects are externally lit and need light definitions from the room

					material.uniforms.ambientColor.value = room.ambientColor;
					material.uniforms.pointLightPosition = { type: "v3v", value: [] };
					material.uniforms.pointLightColor = { type: "v3v", value: [] };
					material.uniforms.pointLightDistance = { type: "f", value: [] };

					for (var l = 0; l < room.lights.length; ++l) {

						var light = room.lights[l];
						material.uniforms.pointLightPosition.value[l] = new THREE.Vector3(light.x, light.y, light.z);
						material.uniforms.pointLightColor.value[l] = light.color;
						material.uniforms.pointLightDistance.value[l] = light.fadeOut;

					}
				}

				if (material.hasAlpha) {

					isTransparent = true;
					material.transparent = true;
					material.blending = THREE.AdditiveBlending;
					material.blendSrc = THREE.OneFactor;
					material.blendDst = THREE.OneMinusSrcColorFactor;
					material.depthWrite = false;
					material.needsUpdate = true;

				}
			}
		}

		// put pistols in Lara holsters
		var obj = this.scene.objects[this.lara.objNameForPistolAnim];
		var lara = this.findObjectById(TRN.ObjectID.Lara);

		if (obj && lara) {
			var mswap = new TRN.MeshSwap(obj, lara);

			mswap.swap([this.lara.leftThighIndex, this.lara.rightThighIndex]);
		}

		this.camera = this.scene.currentCamera;
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();

		//camera.position.set(63514.36027899013,-3527.280854978113,-57688.901507514056);
		//camera.quaternion.set(-0.050579906399909495,-0.2148394919749775,-0.011142047403773734,0.9752750999262544);

		if (TRN.Browser.QueryString.pos) {

			var vals = TRN.Browser.QueryString.pos.split(',');
			this.camera.position.set(parseFloat(vals[0]), parseFloat(vals[1]), parseFloat(vals[2]));

		}

		if (TRN.Browser.QueryString.rot) {

			var vals = TRN.Browser.QueryString.rot.split(',');
			this.camera.quaternion.set(parseFloat(vals[0]), parseFloat(vals[1]), parseFloat(vals[2]), parseFloat(vals[3]));

		}

		this.camera.updateMatrix();
		this.camera.updateMatrixWorld();
		
		var elem = document.body;

		this.controls = new BasicControls( this.camera, elem );

		TRN.Browser.bindRequestPointerLock(elem);
		TRN.Browser.bindRequestFullscreen(elem);

		this.panel.show();

		if (TRN.Browser.QueryString.autostart == '1') {
			this.start();
		} else {
			this.progressbar.showStart(this.start.bind(this));
		}

	},

	start : function () {

		this.progressbar.hide();

		window.addEventListener( 'resize', this.onWindowResize.bind(this), false );

		if (this.sceneJSON.cutScene.frames != null) {
			TRN.Helper.startSound(this.sceneJSON.cutScene.sound);
		}

		this.renderer.initWebGLObjects(this.scene.scene);

		this.startTime = this.quantumTime = (new Date()).getTime();

		this.animate();

		this.onWindowResize();

	},

	animateObjects : function(delta) {

		for (var objID in this.scene.objects) {

			var obj = this.scene.objects[objID];

			if (obj.trackInstance && obj.visible) {

				if (!obj.trackInstance.runForward(delta)) {

					// it's the end of the current track and we are in a cut scene => we link to the next track
					var trackInstance = obj.trackInstance;

					var nextTrackFrame = trackInstance.track.nextTrackFrame + trackInstance.param.curFrame - trackInstance.track.numFrames;//trackInstance.param.interpFactor;
					
					trackInstance = obj.allTrackInstances[trackInstance.track.nextTrack];
					obj.trackInstance = trackInstance;

					trackInstance.setNextTrackInstance(obj.allTrackInstances[trackInstance.track.nextTrack], trackInstance.track.nextTrackFrame);
					trackInstance.setCurrentFrame(nextTrackFrame);

					trackInstance.setNoInterpolationToNextTrack = this.sceneJSON.cutScene.frames != null;

				}

				if (obj.trackInstance != obj.prevTrackInstance) {
					this.processAnimCommands(obj.prevTrackInstance, obj.prevTrackInstanceFrame, 1e10, obj);
					this.processAnimCommands(obj.trackInstance, 0, obj.trackInstance.param.curFrame, obj);

				} else {

					this.processAnimCommands(obj.trackInstance, obj.prevTrackInstanceFrame, obj.trackInstance.param.curFrame, obj);

				}

				obj.prevTrackInstance = obj.trackInstance;
				obj.prevTrackInstanceFrame = obj.trackInstance.param.curFrame;

				obj.trackInstance.interpolate();

				var boundingBox = obj.trackInstance.track.keys[obj.trackInstance.param.curKey].boundingBox;

				boundingBox.getBoundingSphere(obj.geometry.boundingSphere);
				obj.geometry.boundingBox = boundingBox;

				if (obj.boxHelper) {
					this.needWebGLInit = true;
					obj.boxHelper.update(obj);
				}
			}
		}

	},

	animateCutScene : function (delta) {

		if (this.sceneJSON.cutScene.frames == null) { return; }

		this.sceneJSON.cutScene.curFrame += TRN.baseFrameRate * delta;

		var cfrm = parseInt(this.sceneJSON.cutScene.curFrame);

		if (cfrm < this.sceneJSON.cutScene.frames.length) {

			var frm1 = this.sceneJSON.cutScene.frames[cfrm];
			var fov = frm1.fov * 70.0 / 16384.0;
			var roll = -frm1.roll * 180.0 / 32768.0;

			if (!this.controls.captureMouse) {

				var q = new THREE.Quaternion();
				q.setFromAxisAngle( {x:0,y:1,z:0}, THREE.Math.degToRad(this.sceneJSON.cutScene.origin.rotY) );

				var lkat = new THREE.Vector3(frm1.targetX, -frm1.targetY, -frm1.targetZ);
				lkat.applyQuaternion(q);

				this.camera.fov = fov;
				this.camera.position.set(frm1.posX, -frm1.posY, -frm1.posZ);
				this.camera.position.applyQuaternion(q);
				this.camera.lookAt(lkat);
				this.camera.position.add(this.sceneJSON.cutScene.origin);
				this.camera.quaternion.multiplyQuaternions(q.setFromAxisAngle( {x:0,y:1,z:0}, THREE.Math.degToRad(roll) ), this.camera.quaternion);
				this.camera.updateProjectionMatrix();
			}

		} else {

			this.sceneJSON.cutScene.frames = null;

		}

	},

	animateTextures : function (delta) {

		if (!this.scene.animatedTextures) { return; }

		for (var i = 0; i < this.scene.animatedTextures.length; ++i) {
			var animTexture = this.scene.animatedTextures[i];
			animTexture.progressor.update(delta);
		}

	},

	updateObjects : function (curTime) {

		if (this.scene.objects.sky) {
			this.scene.objects.sky.position = this.camera.position;
		}

		var singleRoomMode = this.panel.singleRoomMode();

		this.sceneJSON.curRoom = -1;

		for (var objID in this.scene.objects) {

			var obj = this.scene.objects[objID], objJSON = this.sceneJSON.objects[objID];

			if (obj.dummy) continue;

			if (objJSON.type == 'room') {

				if (obj.geometry.boundingBox.containsPoint(this.camera.position) && !objJSON.isAlternateRoom) {
					this.sceneJSON.curRoom = objJSON.roomIndex;
				}

			}

			if (singleRoomMode) {
				obj.visible = objJSON.roomIndex == this.sceneJSON.curRoom && !objJSON.isAlternateRoom;
			} else {
				obj.visible = !objJSON.isAlternateRoom;
			}

			if (obj.boxHelper) obj.boxHelper.visible = obj.visible;

			if (!(obj instanceof THREE.Mesh)) continue;

			if (objJSON.isSprite) {

				// make sure the object is always facing the camera
				obj.quaternion.set(this.camera.quaternion.x, this.camera.quaternion.y, this.camera.quaternion.z, this.camera.quaternion.w);

				obj.updateMatrix();
				obj.updateMatrixWorld();
			}

			var materials = obj.material.materials;
			if (!materials || !materials.length) continue;

			var room = objJSON.type == 'room' ? objJSON : this.sceneJSON.objects['room' + objJSON.roomIndex];

			for (var i = 0; i < materials.length; ++i) {

				var material = materials[i], userData = material.userData;

				material.uniforms.curTime.value = curTime;
				material.uniforms.rnd.value = this.quantumRnd;
				material.uniforms.flickerColor.value = room && room.flickering ? this.flickerColor : this.unitVec3;

				if (userData.animatedTexture) {

					var animTexture = this.scene.animatedTextures[userData.animatedTexture.idxAnimatedTexture];
					var coords = animTexture.animcoords[(animTexture.progressor.currentTile + userData.animatedTexture.pos) % animTexture.animcoords.length];

					material.uniforms.map.value = this.scene.textures[coords.texture];
					material.uniforms.offsetRepeat.value.x = coords.minU;
					material.uniforms.offsetRepeat.value.y = coords.minV;

				}

			}
		}

	},

	animate : function () {

		requestAnimationFrame( this.animate.bind(this) );

		var delta = this.clock.getDelta();
		var curTime = (new Date()).getTime();

		if (curTime - this.quantumTime > this.quantum) {
			this.quantumRnd = Math.random();
			this.quantumTime = curTime;
		}

		curTime = curTime - this.startTime;

		this.controls.update(delta);

		this.animateObjects(delta);

		this.animateCutScene(delta);
		
		this.animateTextures(delta);

		this.camera.updateMatrixWorld();

		this.updateObjects(curTime);

		if (this.needWebGLInit) {
			this.needWebGLInit = false;
			this.renderer.initWebGLObjects(this.scene.scene);
		}

		this.render();

	},

	render : function () {

		this.renderer.render( this.scene.scene, this.camera );

		this.stats.update();

		this.panel.showInfo();

	}
}
