TRN.Play = function (container) {

	this.container = jQuery(container);

	this.camera = null;
    this.sceneRender = null;
    this.sceneData = null;
	this.controls = null;
	this.startTime = -1;
    this.singleRoomMode = false;
    this.useAdditionalLights = false;

	this.panel = new TRN.Panel(this.container, this);

	this.panel.hide();

	this.quantum = 1000/TRN.baseFrameRate;
	this.quantumTime = -1;
	this.quantumRnd = 0;

	this.flickerColor = [1.2, 1.2, 1.2];
	this.unitVec3 = [1.0, 1.0, 1.0];

	this.clock = new THREE.Clock();

	this.renderer = new THREE.WebGLRenderer({ antialias: true });
	this.renderer.setSize(this.container.width(), this.container.height());
    this.renderer.autoUpdateObjects = false; // to avoid having initWebGLObjects called every frame
    this.renderer.autoClear = false;
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

	TRN.Browser.bindRequestPointerLock(document.body);
	TRN.Browser.bindRequestFullscreen(document.body);
}

TRN.Play.prototype = {

	constructor : TRN.Play,

	onWindowResize : function () {
		this.camera.aspect = this.container.width() / this.container.height();
		this.camera.updateProjectionMatrix();

		this.renderer.setSize( this.container.width(), this.container.height() );

		this.render();
	},

    buildLists : function() {
        this.objectList = {};

        this.sceneRender.traverse( (obj) => {
            var data = this.sceneData.objects[obj.name];

            if (!data) return;

            var id = data.objectid, type = data.type;

            if (id == undefined) {
                console.log('buildLists: not found objectid property', obj.name, obj);
                return;
            }

            if (type == undefined) {
                console.log('buildLists: not found type property', obj.name, obj);
                return;
            }

            var objs = this.objectList[type];
            if (!objs) {
                objs = {};
                this.objectList[type] = objs;
            }

            if (objs[id] && type == 'room') {
                console.log('Already found room with id ' + id + ':', type, objs[id], data)
            }

            if (type == 'room') {
                objs[id] = obj;
            } else {
                var objsForId = objs[id];
                if (!objsForId) {
                    objsForId = [];
                    objs[id] = objsForId;
                }
                objsForId.push(obj);
            }
        } );
    },

    setUniformsFromRoom : function(obj, roomIndex) {
        var materials = obj.material.materials;
        var roomData = this.sceneData.objects['room' + roomIndex];
        var data = this.sceneData.objects[obj.name];

        for (var mat = 0; mat < materials.length; ++mat) {
            var material = materials[mat];

            material.uniforms.ambientColor.value = roomData.ambientColor;

            if (data.type == 'staticmesh') {
                material.uniforms.lighting.value = data.lighting;
            } else if (data.type == 'moveable') {
				if (data.moveableIsInternallyLit) {
					// item is internally lit
					// todo: for TR3/TR4, need to change to a shader that uses vertex color (like the shader mesh2, but for moveable)
                    material.uniforms.ambientColor.value = data.lighting;
				} else {
                    TRN.Helper.setMaterialLightsUniform(roomData, material, false, this.useAdditionalLights);
                }
            }

            if (!roomData.flickering)      material.uniforms.flickerColor.value = [1, 1, 1];
            if (roomData.filledWithWater)  material.uniforms.tintColor.value = [this.sceneData.waterColor.in.r, this.sceneData.waterColor.in.g, this.sceneData.waterColor.in.b];
        }
    },

	start : function (oscene) {
        this.dbg = oscene.scene;

		this.oscene = oscene;
        this.sceneData = oscene.sceneJSON.data;
		this.sceneRender = oscene.scene.scene;
        this.camera = oscene.scene.currentCamera;
        this.isCutscene = this.sceneData.cutScene.frames != null;

        this.controls = new BasicControls( this.camera, document.body );

        this.confMgr = new TRN.ConfigMgr(this.sceneData.rversion);
        
		var tintColor = this.confMgr.levelColor(this.sceneData.levelShortFileName, 'globaltintcolor', true, null);

		if (tintColor != null) {
			this.globalTintColor = [tintColor.r, tintColor.g, tintColor.b];
		}

		if (this.sceneData.rversion != 'TR4') {
			jQuery('#nobumpmapping').prop('disabled', 'disabled');
		}

        this.sceneBackground = new THREE.Scene();

		//this.camera.position.set(55293.20054,4864.60863,-68762.60736);
		//this.camera.quaternion.set(-0.06961,-0.82905,-0.10597,0.54460);

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

        this.buildLists();

        var moveables = this.objectList['moveable'];
        for (var objID in moveables) {
            var lstObj = moveables[objID];
            for (var i = 0; i < lstObj.length; ++i) {
                var obj = lstObj[i];
                var materials = obj.material ? obj.material.materials : null;
                if (materials) {
                    for (var m = 0; m < materials.length; ++m) {
                        TRN.Helper.createLightsUniforms(materials[m]);
                    }
                }
            }
        }
    
        TRN.Helper.setLightsOnMoveables(this.objectList['moveable'], this.sceneData, this.useAdditionalLights);

        this.sceneRender.traverse( (obj) => {
            var data = this.sceneData.objects[obj.name];

            if (!data || data.roomIndex < 0) return;

            this.setUniformsFromRoom(obj, data.roomIndex);
        });

        TRN.ObjectID.PistolAnim = this.confMgr.levelNumber(this.sceneData.levelShortFileName, 'behaviour[name="Lara"] > pistol_anim > id', true, -1);

        var meshSwapIds = [
            this.confMgr.levelNumber(this.sceneData.levelShortFileName, 'meshswap > objid1', true, 0),
            this.confMgr.levelNumber(this.sceneData.levelShortFileName, 'meshswap > objid2', true, 0),
            this.confMgr.levelNumber(this.sceneData.levelShortFileName, 'meshswap > objid3', true, 0)
        ];
        for (var i = 0; i < meshSwapIds.length; ++i) {
            TRN.ObjectID['meshswap' + (i+1)] = meshSwapIds[i];
        }

        // put pistols in Lara holsters
        var obj = this.objectList['moveable'][TRN.ObjectID.PistolAnim];
		var lara = this.objectList['moveable'][TRN.ObjectID.Lara];

		if (obj && lara) {
			var mswap = new TRN.MeshSwap(obj[0], lara[0]);

			mswap.swap([TRN.Consts.leftThighIndex, TRN.Consts.rightThighIndex]);
		}

        this.bhvMgr = new TRN.Behaviours.BehaviourManager(this.objectList, this.sceneData, this.confMgr, this);
        
        this.bhvMgr.loadBehaviours();
        this.bhvMgr.addBehaviour('Sprite');

		this.panel.show();

        this.panel.updateFromParent();

		window.addEventListener( 'resize', this.onWindowResize.bind(this), false );

		this.renderer.initWebGLObjects(this.sceneRender);
        this.renderer.initWebGLObjects(this.sceneBackground);

        this.startTime = this.quantumTime = (new Date()).getTime();
    
        this.bhvMgr.onBeforeRenderLoop();

		this.renderLoop();

        this.onWindowResize();
	},


	renderLoop : function () {
		requestAnimationFrame( this.renderLoop.bind(this) );

		var delta = this.clock.getDelta();
		var curTime = (new Date()).getTime();

		if (curTime - this.quantumTime > this.quantum) {
			this.quantumRnd = Math.random();
			this.quantumTime = curTime;
		}

		curTime = curTime - this.startTime;

		if (delta > 0.1) delta = 0.1;

		this.controls.update(delta);

        this.bhvMgr.frameStarted(curTime, delta);

		this.animateObjects(delta);

		this.animateTextures(delta);

		this.camera.updateMatrixWorld();

		this.updateObjects(curTime);

        this.bhvMgr.frameEnded(curTime, delta);

		if (this.needWebGLInit) {
			this.needWebGLInit = false;
			this.renderer.initWebGLObjects(this.sceneRender);
		}

		this.render();
	},

	render : function () {
        this.renderer.clear(true, true, true);

        this.renderer.render( this.sceneBackground, this.camera );

		this.renderer.render( this.sceneRender, this.camera );

		this.stats.update();

		this.panel.showInfo();
	},

	animateObjects : function(delta) {
        var animatables = this.objectList['moveable'];

		for (var objID in animatables) {
            var lstObj = this.objectList['moveable'][objID];
            
            for (var i = 0; i < lstObj.length; ++i) {
                var obj = lstObj[i];

                data = this.sceneData.objects[obj.name];

                if (data.trackInstance && (obj.visible || this.isCutscene)) {
                    if (!data.trackInstance.runForward(delta)) {
                        // it's the end of the current track and we are in a cut scene => we link to the next track
                        var trackInstance = data.trackInstance;

                        var nextTrackFrame = trackInstance.track.nextTrackFrame + trackInstance.param.curFrame - trackInstance.track.numFrames;//trackInstance.param.interpFactor;
                        
                        trackInstance = data.allTrackInstances[trackInstance.track.nextTrack];
                        data.trackInstance = trackInstance;

                        trackInstance.setNextTrackInstance(data.allTrackInstances[trackInstance.track.nextTrack], trackInstance.track.nextTrackFrame);
                        trackInstance.setCurrentFrame(nextTrackFrame);

                        trackInstance.setNoInterpolationToNextTrack = this.isCutscene;
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
                        this.needWebGLInit = true;
                        obj.boxHelper.update(obj);
                    }
                }
            }
		}
	},

	animateTextures : function (delta) {
		if (!this.sceneData.animatedTextures) { 
            return; 
        }

		for (var i = 0; i < this.sceneData.animatedTextures.length; ++i) {
			var animTexture = this.sceneData.animatedTextures[i];
			animTexture.progressor.update(delta);
		}
    },

	updateObjects : function (curTime) {
		this.curRoom = -1;

		this.sceneRender.traverse( (obj) => {
            var data = this.sceneData.objects[obj.name];

            if (!data || data.dummy) {
                return;
            }

            // Test camera room membership
			if (data.type == 'room') {
				if (obj.geometry.boundingBox.containsPoint(this.camera.position) && !data.isAlternateRoom) {
					this.curRoom = data.roomIndex;
				}
			}

            // Set the visibility for the object
			if (this.singleRoomMode) {
				obj.visible = data.roomIndex == this.curRoom && !data.isAlternateRoom;
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

            var room = this.sceneData.objects['room' + data.roomIndex];
            
            if (!room) {
                // skies are not in any room, no need to update their uniforms
                return;
            }

			for (var i = 0; i < materials.length; ++i) {

				var material = materials[i], userData = material.userData;

				if (this.globalTintColor != null) {
					material.uniforms.tintColor.value = this.globalTintColor;
				}
				material.uniforms.curTime.value = curTime;
				material.uniforms.rnd.value = this.quantumRnd;
				material.uniforms.flickerColor.value = room && room.flickering ? this.flickerColor : this.unitVec3;

				if (userData.animatedTexture) {

					var animTexture = this.sceneData.animatedTextures[userData.animatedTexture.idxAnimatedTexture];

					if (!animTexture.scrolltexture || !TRN.Consts.useUVRotate) {

						var coords = animTexture.animcoords[(animTexture.progressor.currentTile + userData.animatedTexture.pos) % animTexture.animcoords.length];

						material.uniforms.map.value = this.sceneData.textures[coords.texture];
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
							this.globalTintColor[0] = this.globalTintColor[1] = this.globalTintColor[2] = (this.globalTintColor[0] < 0.5 ? 1.0 : 0.1);
							break;
						}

						case TRN.Animation.Commands.Misc.ANIMCMD_MISC_GETLEFTGUN: {
							var oswap = this.objectList['moveable'][TRN.ObjectID.PistolAnim];

							if (oswap) {
								var mswap = new TRN.MeshSwap(oswap[0], obj);

								mswap.swap([TRN.Consts.leftThighIndex, TRN.Consts.leftHandIndex]);

								updateWebGLObjects = true;
							}
							break;
						}

						case TRN.Animation.Commands.Misc.ANIMCMD_MISC_GETRIGHTGUN: {
							var oswap = this.objectList['moveable'][TRN.ObjectID.PistolAnim];

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
							var oswap = this.objectList['moveable'][TRN.ObjectID['meshswap' + idx]];

							if (oswap) {
								var mswap = new TRN.MeshSwap(obj, oswap[0]);

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
