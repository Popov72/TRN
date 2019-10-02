TRN.AnimationManager = function(gameData) {
    this.gameData = gameData;
    this.sceneData = gameData.sceneData;
    this.matMgr = gameData.matMgr;
    this.objMgr = gameData.objMgr;

    this.initialize();
}

TRN.AnimationManager.prototype = {

    constructor : TRN.AnimationManager,

    initialize : function() {
        var animTracks = [];

        // create one track per animation
        for (var t = 0; t < this.sceneData.animTracks.length; ++t) {
            TRN.Animation.addTrack(this.sceneData.animTracks[t], animTracks);
        }

        this.sceneData.animTracks = animTracks;

        // instanciate the first track for each animated object
        this.gameData.sceneRender.traverse( (obj) => {
            var data = this.sceneData.objects[obj.name];

            if (!data || !data.has_anims) {
                return;
            }

            obj.traverse( (o) => o.matrixAutoUpdate = true );

            this.setAnimation(obj, data.animationStartIndex, true);
        });
    },

    setAnimation : function (obj, animIndex, desynchro) {
        var data = this.sceneData.objects[obj.name],
            track = this.sceneData.animTracks[animIndex],
            trackInstance = track ? new TRN.Animation.TrackInstance(track, obj, data.bonesStartingPos) : null;

        if (trackInstance) {
            trackInstance.setNextTrackInstance(trackInstance, track.nextTrackFrame);

            trackInstance.runForward(desynchro ? Math.random()*track.getLength() : 0);
            trackInstance.interpolate();

            data.trackInstance = trackInstance;
            data.prevTrackInstance = data.trackInstance;
            data.prevTrackInstanceFrame = 0;
        }

        return trackInstance;
    },

	animateObjects : function(delta) {
        var animatables = this.objMgr.objectList['moveable'];

		for (var objID in animatables) {
            var lstObj = animatables[objID];
            
            for (var i = 0; i < lstObj.length; ++i) {
                var obj = lstObj[i];

                data = this.sceneData.objects[obj.name];

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
							var oswap = this.objMgr.objectList['moveable'][TRN.ObjectID.PistolAnim];

							if (oswap) {
								var mswap = new TRN.MeshSwap(oswap[0], obj);

								mswap.swap([TRN.Consts.leftThighIndex, TRN.Consts.leftHandIndex]);

								updateWebGLObjects = true;
							}
							break;
						}

						case TRN.Animation.Commands.Misc.ANIMCMD_MISC_GETRIGHTGUN: {
							var oswap = this.objMgr.objectList['moveable'][TRN.ObjectID.PistolAnim];

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
							var oswap = this.objMgr.objectList['moveable'][TRN.ObjectID['meshswap' + idx]];

							if (oswap) {
								var mswap = new TRN.MeshSwap(obj, oswap[0]);

								mswap.swapall();

                                this.matMgr.setUniformsFromRoom(obj, this.gameData.sceneData.objects[obj.name].roomIndex);

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