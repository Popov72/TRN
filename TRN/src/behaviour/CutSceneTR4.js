Object.assign( TRN.Behaviours.CutScene.prototype, {

    makeTR4Cutscene : function(icutscene) {
        var cutscene = [];
        jQuery.ajax({
            type: "GET",
            url: 'TRN/level/tr4/TR4_cutscenes/cut' + icutscene + '.json',
            dataType: "json",
            cache: false,
            async: false
        }).done(function(data) { cutscene.push(data); });

        cutscene[0].index = icutscene;

        if (cutscene[0].index == 1) {
            jQuery.ajax({
                type: "GET",
                url: 'TRN/level/tr4/TR4_cutscenes/cut' + (icutscene+1) + '.json',
                dataType: "json",
                cache: false,
                async: false
            }).done(function(data) { cutscene.push(data); });

            cutscene[1].index = icutscene+1;
        }

        // get the sound for this cut scene
        var promiseSound = cutscene[0].info.audio ? TRN.Helper.loadSoundAsync(this.sceneData.soundPath + cutscene[0].info.audio + '.aac') : Promise.resolve(null);

        this.makeCutsceneData(cutscene);

        return promiseSound;
    },

    makeCutsceneData : function(cutscenes) {

        var ocs = this.cutscene;

        console.log(cutscenes);

        var cutscene = cutscenes[0];

        ocs.position.x = cutscene.originX;
        ocs.position.y = -cutscene.originY;
        ocs.position.z = -cutscene.originZ;
        ocs.quaternion.x = ocs.quaternion.y = ocs.quaternion.z = 0;
        ocs.quaternion.z = 1;

        // hide moveables (except Lara) that are already in the level and that are referenced in the cutscene (we will create them later)
        var idInCutscenes = {};
        for (var ac = 0; ac < cutscene.actors.length; ++ac) {
            var id = cutscene.actors[ac].slotNumber;
            idInCutscenes[id] = true;
        }

        for (var objID in  this.sceneData.objects) {
            var objData = this.sceneData.objects[objID];
            if (objData.type == 'moveable' && objData.roomIndex != -1 && objData.objectid != TRN.ObjectID.Lara && objData.objectid in idInCutscenes) {
                objData.visible = false;
                this.scene.getObjectByName(objID).visible = false;
            }
        }

        if (cutscene.index == 10) {
            var scroll = 'room22_staticmesh3', oscroll = this.scene.getObjectByName(scroll);
            var q = glMatrix.quat.create();

            glMatrix.quat.setAxisAngle(q, [0,1,0], glMatrix.glMatrix.toRadian(60));

            oscroll.quaternion.set(q[0], q[1], q[2], q[3]);
            oscroll.position.x += 850;

            oscroll.updateMatrix();
        }

        var lara = this.objMgr.objectList['moveable'][TRN.ObjectID.Lara][0];
        var laraRoomIndex = this.sceneData.objects[lara.name].roomIndex;

        // create moveable instances used in cutscene
        var actorMoveables = [], mshswap = null;
        for (var ac = 0; ac < cutscene.actors.length; ++ac) {
            var id = cutscene.actors[ac].slotNumber;
            var mvb;
            if (id != TRN.ObjectID.Lara) {
                mvb = this.objMgr.createMoveable(id, laraRoomIndex);
            } else {
                mvb = lara;
                if (cutscene.index in { 1:1, 2:1, 21:1 }) {
                    mshswap = this.objMgr.createMoveable(417, laraRoomIndex);
                    mshswap.position.set(ocs.position.x, ocs.position.y, ocs.position.z);
                    mshswap.quaternion.set(0, 0, 0, 1);
                }
            }
            actorMoveables.push(mvb);

            mvb.position.set(ocs.position.x, ocs.position.y, ocs.position.z);
            mvb.quaternion.set(0, 0, 0, 1);
        }

        // create actor frames
        for (var ac = 0; ac < cutscene.actors.length; ++ac) {
            var actor = cutscene.actors[ac];

            var animation = this.makeAnimationForActor(cutscene, actor, "anim_cutscene_actor" + ac);

            this.sceneData.objects[actorMoveables[ac].name].animationStartIndex = this.sceneData.animTracks.length;

            var oanimation = TRN.Animation.addTrack(animation, this.sceneData.animTracks), oanimationMeshswap = null;

            if (mshswap && ac == 0) {
                var animationMeshswap = Object.assign({}, animation);
    
                animationMeshswap.nextTrack = this.sceneData.animTracks.length;
    
                this.sceneData.objects[mshswap.name].animationStartIndex = this.sceneData.animTracks.length;
    
                if (cutscene.index == 1) {
                    mshswap.visible = false;

                    animationMeshswap.commands = [
                        { cmd:TRN.Animation.Commands.ANIMCMD_MISCACTIONONFRAME , params: [0, TRN.Animation.Commands.Misc.ANIMCMD_MISC_HIDEOBJECT] },
                        { cmd:TRN.Animation.Commands.ANIMCMD_MISCACTIONONFRAME , params: [24, TRN.Animation.Commands.Misc.ANIMCMD_MISC_SHOWOBJECT] }
                    ];
                }
    
                if (cutscene.index == 2) {
                    animationMeshswap.commands = [
                        { cmd:TRN.Animation.Commands.ANIMCMD_MISCACTIONONFRAME , params: [0, TRN.Animation.Commands.Misc.ANIMCMD_MISC_SHOWOBJECT] },
                        { cmd:TRN.Animation.Commands.ANIMCMD_MISCACTIONONFRAME , params: [140, TRN.Animation.Commands.Misc.ANIMCMD_MISC_HIDEOBJECT] }
                    ];
                }

                oanimationMeshswap = TRN.Animation.addTrack(animationMeshswap, this.sceneData.animTracks);
            }

            if (cutscene.index == 1 && ac == 0) {
                var animationCont = this.makeAnimationForActor(cutscenes[1], cutscenes[1].actors[ac], "anim_cutscene2_actor" + ac);

                oanimation.nextTrack = this.sceneData.animTracks.length;
                animationCont.nextTrack = this.sceneData.animTracks.length-2;
    
                TRN.Animation.addTrack(animationCont, this.sceneData.animTracks);

                if (oanimationMeshswap) {
                    var animationContMeshswap = Object.assign({}, animationCont);

                    oanimationMeshswap.nextTrack = this.sceneData.animTracks.length;
                    animationContMeshswap.nextTrack = this.sceneData.animTracks.length-2;
        
                    TRN.Animation.addTrack(animationContMeshswap, this.sceneData.animTracks);
                }
            }
        }

        // create camera frames
        var frames = this.makeAnimationForCamera(cutscene);

        if (cutscene.index == 1) {
            frames = frames.concat(this.makeAnimationForCamera(cutscenes[1]));
        }

        ocs.frames = frames;
    },

    makeAnimationForActor : function(cutscene, actor, animName) {

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

        var animation = {
            "fps": 30,
            "frameRate": 1,
            "keys": [],
            "name": animName,
            "nextTrack": this.sceneData.animTracks.length,
            "nextTrackFrame": 0,
            "numFrames": cutscene.numFrames,
            "numKeys": cutscene.numFrames,
            "frameStart": 0,
            "commands": []
        };

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

        return animation;
    },

    makeAnimationForCamera : function(cutscene) {

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

        return frames;
    }

});

