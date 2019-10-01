TRN.Play = function (container) {

	this.container = jQuery(container);

    this.gameData = {
        "curRoom": -1,
        "camera": null,

        "sceneRender":  null,
        "sceneData": null,
        "sceneBackground": null,

        "controls": null,

        "singleRoomMode": false,

        "panel": null,
        
        "bhvMgr": null,
        "objMgr": null,
        "matMgr": null,
        "confMgr": null,

        "startTime": -1,
        "quantum": 1000/TRN.baseFrameRate,
        "quantumTime": -1,
        "quantumRnd": 0,
    
        "flickerColor" : [1.2, 1.2, 1.2],
        "unitVec3" : [1.0, 1.0, 1.0],
        "globalTintColor":  null,

        "needWebGLInit": false
    };

    this.clock = new THREE.Clock();
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.container.width(), this.container.height());
    this.renderer.autoUpdateObjects = false; // to avoid having initWebGLObjects called every frame
    this.renderer.autoClear = false;
	//renderer.sortObjects = false;

	this.container.append( this.renderer.domElement );

    this.gameData.panel = new TRN.Panel(this.container, this.gameData, this.renderer);
	this.gameData.panel.hide();

	this.stats = new Stats();
	this.stats.domElement.style.position = 'absolute';
	this.stats.domElement.style.top = '0px';
	this.stats.domElement.style.right = '0px';
	this.stats.domElement.style.zIndex = 100;

	this.container.append(this.stats.domElement);

	TRN.Browser.bindRequestPointerLock(document.body);
	TRN.Browser.bindRequestFullscreen(document.body);
}

TRN.Play.prototype = {

	constructor : TRN.Play,

	onWindowResize : function () {
		this.gameData.camera.aspect = this.container.width() / this.container.height();
		this.gameData.camera.updateProjectionMatrix();

		this.renderer.setSize( this.container.width(), this.container.height() );

		this.render();
	},

	start : async function (oscene) {
        this.dbg = oscene.scene;

        this.gameData.sceneData = oscene.sceneJSON.data;
		this.gameData.sceneRender = oscene.scene.scene;
        this.gameData.camera = oscene.scene.currentCamera;

        this.gameData.controls = new BasicControls( this.gameData.camera, document.body );

        this.gameData.confMgr = new TRN.ConfigMgr(this.gameData.sceneData.rversion);

        var cutsceneIndex = this.gameData.sceneData.rversion == 'TR4' && TRN.Browser.QueryString.cutscene != undefined ? parseInt(TRN.Browser.QueryString.cutscene) : -1;

        this.gameData.isCutscene = this.gameData.sceneData.cutScene.frames != null || cutsceneIndex >= 0;

		var tintColor = this.gameData.confMgr.levelColor(this.gameData.sceneData.levelShortFileName, 'globaltintcolor', true, null);

		if (tintColor != null) {
			this.gameData.globalTintColor = [tintColor.r, tintColor.g, tintColor.b];
		}

		if (this.gameData.sceneData.rversion != 'TR4') {
			jQuery('#nobumpmapping').prop('disabled', 'disabled');
		}

        this.gameData.sceneBackground = new THREE.Scene();

		//this.gameData.camera.position.set(55293.20054,4864.60863,-68762.60736);
		//this.gameData.camera.quaternion.set(-0.06961,-0.82905,-0.10597,0.54460);

		if (TRN.Browser.QueryString.pos) {
			var vals = TRN.Browser.QueryString.pos.split(',');
			this.gameData.camera.position.set(parseFloat(vals[0]), parseFloat(vals[1]), parseFloat(vals[2]));
		}

		if (TRN.Browser.QueryString.rot) {
			var vals = TRN.Browser.QueryString.rot.split(',');
			this.gameData.camera.quaternion.set(parseFloat(vals[0]), parseFloat(vals[1]), parseFloat(vals[2]), parseFloat(vals[3]));
		}

		this.gameData.camera.updateMatrix();
		this.gameData.camera.updateMatrixWorld();

        this.gameData.matMgr = new TRN.MaterialManager(this.gameData);
        this.gameData.objMgr = new TRN.ObjectManager(this.gameData);
        this.gameData.bhvMgr = new TRN.Behaviours.BehaviourManager(this.gameData);

        this.gameData.objMgr.setBehaviourManager(this.gameData.bhvMgr);
        this.gameData.bhvMgr.setObjectManager(this.gameData.objMgr);
        
        var moveables = this.gameData.objMgr.objectList['moveable'];
        for (var objID in moveables) {
            moveables[objID].forEach( (obj) => this.gameData.matMgr.createLightUniformsForObject(obj) );
        }
    
        this.gameData.sceneRender.traverse( (obj) => {
            var data = this.gameData.sceneData.objects[obj.name];

            if (!data || data.roomIndex < 0) return;

            this.gameData.matMgr.setUniformsFromRoom(obj, data.roomIndex);
        });

        // create pistolanim object
        TRN.ObjectID.PistolAnim = this.gameData.confMgr.levelNumber(this.gameData.sceneData.levelShortFileName, 'behaviour[name="Lara"] > pistol_anim > id', true, -1);

        if (TRN.ObjectID.PistolAnim >= 0) {
            var mvb = this.gameData.objMgr.createMoveable(TRN.ObjectID.PistolAnim, -1, false);
            if (mvb) {
                this.gameData.sceneData.objects[mvb.name].visible = false;
                this.gameData.sceneData.objects[mvb.name].has_anims = false;
            }
        }

        // create the meshswap objects
        var meshSwapIds = [
            this.gameData.confMgr.levelNumber(this.gameData.sceneData.levelShortFileName, 'meshswap > objid1', true, 0),
            this.gameData.confMgr.levelNumber(this.gameData.sceneData.levelShortFileName, 'meshswap > objid2', true, 0),
            this.gameData.confMgr.levelNumber(this.gameData.sceneData.levelShortFileName, 'meshswap > objid3', true, 0)
        ];
        for (var i = 0; i < meshSwapIds.length; ++i) {
            TRN.ObjectID['meshswap' + (i+1)] = meshSwapIds[i];
            if (TRN.ObjectID['meshswap' + (i+1)] > 0) {
                var mvb = this.gameData.objMgr.createMoveable(TRN.ObjectID['meshswap' + (i+1)], -1, false);
                if (mvb) {
                    this.gameData.sceneData.objects[mvb.name].visible = false;
                    this.gameData.sceneData.objects[mvb.name].has_anims = false;
                }
            }
        }

        // put pistols in Lara holsters
        var obj = this.gameData.objMgr.objectList['moveable'][TRN.ObjectID.PistolAnim];
		var lara = this.gameData.objMgr.objectList['moveable'][TRN.ObjectID.Lara];

		if (obj && lara) {
			var mswap = new TRN.MeshSwap(obj[0], lara[0]);

			mswap.swap([TRN.Consts.leftThighIndex, TRN.Consts.rightThighIndex]);
		}

        var allPromises = null;

        allPromises = this.gameData.bhvMgr.loadBehaviours();
        allPromises.push(this.gameData.bhvMgr.addBehaviour('Sprite'));

        if (cutsceneIndex >= 0) {
            allPromises.push(this.gameData.bhvMgr.addBehaviour('CutScene', { "index": cutsceneIndex, "useadditionallights": true }));
        }

        await Promise.all(allPromises);

		this.gameData.panel.show();

        this.gameData.panel.updateFromParent();

		window.addEventListener( 'resize', this.onWindowResize.bind(this), false );

		this.renderer.initWebGLObjects(this.gameData.sceneRender);
        this.renderer.initWebGLObjects(this.gameData.sceneBackground);

        this.gameData.startTime = this.gameData.quantumTime = (new Date()).getTime();
    
        this.gameData.bhvMgr.onBeforeRenderLoop();

		this.renderLoop();

        this.onWindowResize();
	},


	renderLoop : function () {
		requestAnimationFrame( this.renderLoop.bind(this) );

		var delta = this.clock.getDelta();
		var curTime = (new Date()).getTime();

		if (curTime - this.gameData.quantumTime > this.gameData.quantum) {
			this.gameData.quantumRnd = Math.random();
			this.gameData.quantumTime = curTime;
		}

		curTime = curTime - this.gameData.startTime;

		if (delta > 0.1) delta = 0.1;

		this.gameData.controls.update(delta);

        this.gameData.bhvMgr.frameStarted(curTime, delta);

		this.animateObjects(delta);

		this.animateTextures(delta);

		this.gameData.camera.updateMatrixWorld();

		this.updateObjects(curTime);

        this.gameData.bhvMgr.frameEnded(curTime, delta);

		if (this.gameData.needWebGLInit) {
			this.gameData.needWebGLInit = false;
			this.renderer.initWebGLObjects(this.gameData.sceneRender);
		}

		this.render();
	},

	render : function () {
        this.renderer.clear(true, true, true);

        this.renderer.render( this.gameData.sceneBackground, this.gameData.camera );

		this.renderer.render( this.gameData.sceneRender, this.gameData.camera );

		this.stats.update();

		this.gameData.panel.showInfo();
	},

	animateObjects : function(delta) {
        var animatables = this.gameData.objMgr.objectList['moveable'];

		for (var objID in animatables) {
            var lstObj =animatables[objID];
            
            for (var i = 0; i < lstObj.length; ++i) {
                var obj = lstObj[i];

                data = this.gameData.sceneData.objects[obj.name];

                if (data.has_anims && data.trackInstance && (obj.visible || this.gameData.isCutscene)) {
                    if (!data.trackInstance.runForward(delta)) {
                        // it's the end of the current track and we are in a cut scene => we link to the next track
                        var trackInstance = data.trackInstance;

                        var nextTrackFrame = trackInstance.track.nextTrackFrame + trackInstance.param.curFrame - trackInstance.track.numFrames;//trackInstance.param.interpFactor;
                        
                        trackInstance = data.allTrackInstances[trackInstance.track.nextTrack];
                        data.trackInstance = trackInstance;

                        trackInstance.setNextTrackInstance(data.allTrackInstances[trackInstance.track.nextTrack], trackInstance.track.nextTrackFrame);
                        trackInstance.setCurrentFrame(nextTrackFrame);

                        trackInstance.setNoInterpolationToNextTrack = this.gameData.isCutscene;
                    }

                    if (data.trackInstance != data.prevTrackInstance) {
                        this.processAnimCommands(data.prevTrackInstance, data.prevTrackInstanceFrame, 1e10, obj);
                        this.processAnimCommands(data.trackInstance, 0, data.trackInstance.param.curFrame, obj);
                    } else {
                        var frm1 = data.prevTrackInstanceFrame, frm2 = data.trackInstance.param.curFrame;
                        if (frm1 > frm2) {
                            // we have looped in the same animation
                            this.processAnimCommands(data.trackInstance, frm1, 1e10, obj);
                            this.processAnimCommands(data.trackInstance, 0, frm2, obj);
                        } else {
                            this.processAnimCommands(data.trackInstance, frm1, frm2, obj);
                        }
                    }

                    data.visible = obj.visible;

                    data.prevTrackInstance = data.trackInstance;
                    data.prevTrackInstanceFrame = data.trackInstance.param.curFrame;

                    data.trackInstance.interpolate();

                    var boundingBox = data.trackInstance.track.keys[data.trackInstance.param.curKey].boundingBox;

                    boundingBox.getBoundingSphere(obj.geometry.boundingSphere);
                    obj.geometry.boundingBox = boundingBox;

                    if (obj.boxHelper) {
                        this.gameData.needWebGLInit = true;
                        obj.boxHelper.update(obj);
                    }
                }
            }
		}
	},

	animateTextures : function (delta) {
		if (!this.gameData.sceneData.animatedTextures) { 
            return; 
        }

		for (var i = 0; i < this.gameData.sceneData.animatedTextures.length; ++i) {
			var animTexture = this.gameData.sceneData.animatedTextures[i];
			animTexture.progressor.update(delta);
		}
    },

	updateObjects : function (curTime) {
		this.gameData.curRoom = -1;

		this.gameData.sceneRender.traverse( (obj) => {
            var data = this.gameData.sceneData.objects[obj.name];

            if (!data) {
                return;
            }

            // Test camera room membership
			if (data.type == 'room') {
				if (obj.geometry.boundingBox.containsPoint(this.gameData.camera.position) && !data.isAlternateRoom) {
					this.gameData.curRoom = data.roomIndex;
				}
			}

            // Set the visibility for the object
			if (this.gameData.singleRoomMode) {
				obj.visible = data.roomIndex == this.gameData.curRoom && !data.isAlternateRoom;
			} else {
				obj.visible = data.visible;
			}

			if (obj.boxHelper) {
                obj.boxHelper.visible = obj.visible;
            }

            // We continue only if it is a displayable object
			if (!(obj instanceof THREE.Mesh)) {
                return;
            }

            // Update material uniforms
            var materials = obj.material.materials;
            
			if (!materials || !materials.length) {
                return;
            }

            var room = this.gameData.sceneData.objects['room' + data.roomIndex];
            
            if (!room) {
                // skies are not in any room, no need to update their uniforms
                return;
            }

			for (var i = 0; i < materials.length; ++i) {

				var material = materials[i], userData = material.userData;

				if (this.gameData.globalTintColor != null) {
					material.uniforms.tintColor.value = this.gameData.globalTintColor;
				}
				material.uniforms.curTime.value = curTime;
				material.uniforms.rnd.value = this.gameData.quantumRnd;
				material.uniforms.flickerColor.value = room && room.flickering ? this.gameData.flickerColor : this.gameData.unitVec3;

				if (userData.animatedTexture) {

					var animTexture = this.gameData.sceneData.animatedTextures[userData.animatedTexture.idxAnimatedTexture];

					if (!animTexture.scrolltexture || !TRN.Consts.useUVRotate) {

						var coords = animTexture.animcoords[(animTexture.progressor.currentTile + userData.animatedTexture.pos) % animTexture.animcoords.length];

						material.uniforms.map.value = this.gameData.sceneData.textures[coords.texture];
						material.uniforms.offsetRepeat.value[0] = coords.minU - userData.animatedTexture.minU;
                        material.uniforms.offsetRepeat.value[1] = coords.minV - userData.animatedTexture.minV;
					} else {
						var coords = animTexture.animcoords[0];
						var pgr = curTime / (5*material.uniforms.map.value.image.height), h = (TRN.Consts.uvRotateTileHeight/2.0)/material.uniforms.map.value.image.height;
						pgr = pgr - h * Math.floor(pgr / h);
						material.uniforms.offsetRepeat.value[0] = coords.minU - userData.animatedTexture.minU;
						material.uniforms.offsetRepeat.value[1] = coords.minV - userData.animatedTexture.minV*0.5 + h - pgr;
                        material.uniforms.offsetRepeat.value[3] = 0.5;
					}

				} else if (data.hasScrollAnim) {
					var pgr = curTime / (5*material.uniforms.map.value.image.height), h = (TRN.Consts.moveableScrollAnimTileHeight/2.0)/material.uniforms.map.value.image.height;
					pgr = pgr - h * Math.floor(pgr / h);
					material.uniforms.offsetRepeat.value[1] = h - pgr;
				}

			}
        });
        
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
							this.gameData.globalTintColor[0] = this.gameData.globalTintColor[1] = this.gameData.globalTintColor[2] = (this.gameData.globalTintColor[0] < 0.5 ? 1.0 : 0.1);
							break;
						}

						case TRN.Animation.Commands.Misc.ANIMCMD_MISC_GETLEFTGUN: {
							var oswap = this.gameData.objMgr.objectList['moveable'][TRN.ObjectID.PistolAnim];

							if (oswap) {
								var mswap = new TRN.MeshSwap(oswap[0], obj);

								mswap.swap([TRN.Consts.leftThighIndex, TRN.Consts.leftHandIndex]);

								updateWebGLObjects = true;
							}
							break;
						}

						case TRN.Animation.Commands.Misc.ANIMCMD_MISC_GETRIGHTGUN: {
							var oswap = this.gameData.objMgr.objectList['moveable'][TRN.ObjectID.PistolAnim];

							if (oswap) {
								var mswap = new TRN.MeshSwap(oswap[0], obj);

								mswap.swap([TRN.Consts.rightThighIndex, TRN.Consts.rightHandIndex]);

								updateWebGLObjects = true;
							}
							break;
						}

						case TRN.Animation.Commands.Misc.ANIMCMD_MISC_MESHSWAP1:
						case TRN.Animation.Commands.Misc.ANIMCMD_MISC_MESHSWAP2:
						case TRN.Animation.Commands.Misc.ANIMCMD_MISC_MESHSWAP3: {
							var idx = action - TRN.Animation.Commands.Misc.ANIMCMD_MISC_MESHSWAP1 + 1;
							var oswap = this.gameData.objMgr.objectList['moveable'][TRN.ObjectID['meshswap' + idx]];

							if (oswap) {
								var mswap = new TRN.MeshSwap(obj, oswap[0]);

								mswap.swapall();

                                this.gameData.matMgr.setUniformsFromRoom(obj, this.gameData.sceneData.objects[obj.name].roomIndex);

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

		this.gameData.needWebGLInit |= updateWebGLObjects;

	}
}
