TRN.Play = function (container) {

	this.container = jQuery(container);

	this.camera = null;
	this.scene = null;
	this.sceneJSON = null;
	this.controls = null;
	this.startTime = -1;
	this.gcounter = 0;

	this.panel = new TRN.Panel(this.container, this);

	this.panel.hide();

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

	this.globalTintColor = null;

	//this.initPhysics();

	TRN.Browser.bindRequestPointerLock(document.body);
	TRN.Browser.bindRequestFullscreen(document.body);
}

TRN.Play.prototype = {

	constructor : TRN.Play,

	initPhysics : function() {

        this.world = new CANNON.World();
        this.world.quatNormalizeSkip = 0;
        this.world.quatNormalizeFast = false;

        var solver = new CANNON.GSSolver();

        this.world.defaultContactMaterial.contactEquationStiffness = 1e9;
        this.world.defaultContactMaterial.contactEquationRegularizationTime = 4;

        solver.iterations = 7;
        solver.tolerance = 0.1;
        var split = true;
        if(split)
            this.world.solver = new CANNON.SplitSolver(solver);
        else
            this.world.solver = solver;

        this.world.gravity.set(0,-30*20,0);
        this.world.broadphase = new CANNON.NaiveBroadphase();

        // Create a slippery material (friction coefficient = 0.0)
        physicsMaterial = new CANNON.Material("slipperyMaterial");
        var physicsContactMaterial = new CANNON.ContactMaterial(physicsMaterial,
                                                                physicsMaterial,
                                                                0.0, // friction coefficient
                                                                0.3  // restitution
                                                                );
        // We must add the contact materials to the world
        this.world.addContactMaterial(physicsContactMaterial);

	},

	onWindowResize : function () {

		this.camera.aspect = this.container.width() / this.container.height();
		this.camera.updateProjectionMatrix();

		this.renderer.setSize( this.container.width(), this.container.height() );

		this.render();

	},

	start : function (oscene) {

		this.oscene = oscene;
		this.sceneJSON = oscene.sceneJSON;
		this.scene = oscene.scene;
		this.camera = oscene.camera;

		this.controls = new BasicControls( this.camera, document.body );

		var confMgr = new TRN.ConfigMgr(this.sceneJSON.rversion);
		var tintColor = confMgr.levelColor(this.sceneJSON.levelShortFileName, 'globaltintcolor', true, null);

		if (tintColor != null) {
			this.globalTintColor = new THREE.Vector3(tintColor.r, tintColor.g, tintColor.b);
		}

		//this.ponytail = new THREE.Ponytail(oscene.findObjectById(TRN.ObjectID.Lara), this.scene, this.world);

		this.panel.show();

		window.addEventListener( 'resize', this.onWindowResize.bind(this), false );

		this.renderer.initWebGLObjects(this.scene.scene);

		this.startTime = this.quantumTime = (new Date()).getTime();

		this.animate();

		this.onWindowResize();

		if (this.sceneJSON.cutScene.frames != null) {
			TRN.Helper.startSound(this.sceneJSON.cutScene.sound);
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

		if (delta > 0.1) delta = 0.1;

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

		/*if (TRN.ObjectID.Ponytail != -1) {
			this.ponytail.update(delta);
		}*/

	},

	animateCutScene : function (delta) {

		if (this.sceneJSON.cutScene.frames == null) { return; }

		this.sceneJSON.cutScene.curFrame += TRN.baseFrameRate * delta;

		var t = this.sceneJSON.cutScene.curFrame - parseInt(this.sceneJSON.cutScene.curFrame);
		var cfrmA = Math.min(parseInt(this.sceneJSON.cutScene.curFrame), this.sceneJSON.cutScene.frames.length-3);
		var cfrmB = Math.min(cfrmA+1, this.sceneJSON.cutScene.frames.length-3);

		if (cfrmA < this.sceneJSON.cutScene.frames.length-3) {

			if (!this.controls.captureMouse) {

				var frm1 = this.sceneJSON.cutScene.frames[cfrmA];
				var frm2 = this.sceneJSON.cutScene.frames[cfrmB];
				var maxDelta = 512.0 * 512.0, fovMult = 60.0 / 16384.0, rollMult = -90.0 / 16384.0;

                var dp = (new THREE.Vector3(frm1.posX, -frm1.posY, -frm1.posZ)).sub(new THREE.Vector3(frm2.posX, -frm2.posY, -frm1.posZ)).lengthSq();
                var dt = (new THREE.Vector3(frm1.targetX, -frm1.targetY, -frm1.targetZ)).sub(new THREE.Vector3(frm2.targetX, -frm2.targetY, -frm1.targetZ)).lengthSq();
                
                var eyePos = new THREE.Vector3(frm1.posX, -frm1.posY, -frm1.posZ);
                var lkat = new THREE.Vector3(frm1.targetX, -frm1.targetY, -frm1.targetZ);
                var fov = frm1.fov * fovMult;
				var roll = frm1.roll * rollMult;

                if (dp <= maxDelta && dt <= maxDelta) {
                    eyePos.lerp(new THREE.Vector3(frm2.posX, -frm2.posY, -frm2.posZ), t);
                    lkat.lerp(new THREE.Vector3(frm2.targetX, -frm2.targetY, -frm2.targetZ), t);
                    fov = TRN.Helper.lerp(frm1.fov * fovMult, frm2.fov * fovMult, t);
                    roll = TRN.Helper.lerp(frm1.roll * rollMult, frm2.roll * rollMult, t);
                }

				var q = new THREE.Quaternion();
				q.setFromAxisAngle( {x:0,y:1,z:0}, THREE.Math.degToRad(this.sceneJSON.cutScene.origin.rotY) );

				lkat.applyQuaternion(q);

				this.camera.fov = fov;
				this.camera.position = eyePos;
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

				if (this.globalTintColor != null) {
					material.uniforms.tintColor.value = this.globalTintColor;
				}
				material.uniforms.curTime.value = curTime;
				material.uniforms.rnd.value = this.quantumRnd;
				material.uniforms.flickerColor.value = room && room.flickering ? this.flickerColor : this.unitVec3;

				if (userData.animatedTexture) {

					var animTexture = this.scene.animatedTextures[userData.animatedTexture.idxAnimatedTexture];

					if (!animTexture.scrolltexture || !TRN.Consts.useUVRotate) {

						var coords = animTexture.animcoords[(animTexture.progressor.currentTile + userData.animatedTexture.pos) % animTexture.animcoords.length];

						material.uniforms.map.value = this.scene.textures[coords.texture];
						material.uniforms.offsetRepeat.value.x = coords.minU;
						material.uniforms.offsetRepeat.value.y = coords.minV;
					} else {
						//console.log(obj, i, material);
						//var coords = animTexture.animcoords[(animTexture.progressor.currentTile + userData.animatedTexture.pos) % animTexture.animcoords.length];
						var coords = animTexture.animcoords[0];
						if (!material.uniforms.map.value) {
							material.uniforms.map.value = this.scene.textures[coords.texture];
							material.uniforms.offsetRepeat.value.w = 0.5;
							//if (this.gcounter==0 && objJSON.roomIndex == 76) console.log(material.uniforms.map.value)
						}
						var pgr = curTime / (15*material.uniforms.map.value.image.height), h = (TRN.Consts.uvRotateTileHeight/2.0)/material.uniforms.map.value.image.height;
						pgr = pgr - h * Math.floor(pgr / h);
						material.uniforms.offsetRepeat.value.x = coords.minU;
						material.uniforms.offsetRepeat.value.y = coords.minV + h - pgr;
					}

				} else if (objJSON.hasScrollAnim) {
					//if (this.gcounter == 0 && objJSON.roomIndex == 76) console.log(objJSON);
					var pgr = curTime / (5*material.uniforms.map.value.image.height), h = (TRN.Consts.moveableScrollAnimTileHeight/2.0)/material.uniforms.map.value.image.height;
					pgr = pgr - h * Math.floor(pgr / h);
					material.uniforms.offsetRepeat.value.y = h - pgr;
				}

			}
		}
		this.gcounter++;

	},

	processAnimCommands : function (trackInstance, prevFrame, curFrame, obj) {

		var commands = trackInstance.track.commands;
		var updateWebGLObjects = false;

		for (var i = 0; i < commands.length; ++i) {
			var command = commands[i];

			switch (command.cmd) {

				case TRN.Animation.Commands.ANIMCMD_MISCACTIONONFRAME: {

					var frame = command.params[0] - commands.frameStart, action = command.params[1];
					if (frame < prevFrame || frame >= curFrame) { continue; }

					//console.log(action,'done for frame',frame,obj.name)

					switch (action) {

						case TRN.Animation.Commands.Misc.ANIMCMD_MISC_COLORFLASH: {
							this.globalTintColor.x = this.globalTintColor.y = this.globalTintColor.z = (this.globalTintColor.x < 0.5 ? 1.0 : 0.1);
							break;
						}

						case TRN.Animation.Commands.Misc.ANIMCMD_MISC_GETLEFTGUN: {
							var oswap = this.scene.objects[TRN.Consts.objNameForPistolAnim];

							if (oswap) {
								var mswap = new TRN.MeshSwap(oswap, obj);

								mswap.swap([TRN.Consts.leftThighIndex, TRN.Consts.leftHandIndex]);

								updateWebGLObjects = true;
							}
							break;
						}

						case TRN.Animation.Commands.Misc.ANIMCMD_MISC_GETRIGHTGUN: {
							var oswap = this.scene.objects[TRN.Consts.objNameForPistolAnim];

							if (oswap) {
								var mswap = new TRN.MeshSwap(oswap, obj);

								mswap.swap([TRN.Consts.rightThighIndex, TRN.Consts.rightHandIndex]);

								updateWebGLObjects = true;
							}
							break;
						}

						case TRN.Animation.Commands.Misc.ANIMCMD_MISC_MESHSWAP1:
						case TRN.Animation.Commands.Misc.ANIMCMD_MISC_MESHSWAP2:
						case TRN.Animation.Commands.Misc.ANIMCMD_MISC_MESHSWAP3: {
							var idx = action - TRN.Animation.Commands.Misc.ANIMCMD_MISC_MESHSWAP1 + 1;
							var oswap = this.scene.objects['meshswap' + idx];

							if (oswap) {
								var mswap = new TRN.MeshSwap(obj, oswap);

								mswap.swapall();

								updateWebGLObjects = true;
							} else {
								console.log('Could not apply anim command meshswap (' , action, '): object meshswap' + idx + ' not found.');
							}
							break;
						}

						case TRN.Animation.Commands.Misc.ANIMCMD_MISC_HIDEOBJECT: {
							obj.visible = false;
							break;
						}

						case TRN.Animation.Commands.Misc.ANIMCMD_MISC_SHOWOBJECT: {
							obj.visible = true;
							break;
						}
					}

					break;
				}
			}
		}

		this.needWebGLInit |= updateWebGLObjects;

	}
}
