TRN.Behaviours.CutScene = function(nbhv, bhvMgr) {
    this.nbhv = nbhv;
    this.bhvMgr = bhvMgr;
    this.parent = bhvMgr.parent;
    this.scene = bhvMgr.scene;
    this.sceneData = bhvMgr.sceneData;
    this.cutscene = this.sceneData.cutScene;
    this.cutSceneEnded = false;
}

TRN.Behaviours.CutScene.prototype = {

    constructor : TRN.Behaviours.CutScene,

    init : function(lstObjs) {
        var useAddLights = this.nbhv.useadditionallights == 'true';

        this.parent.useAdditionalLights = useAddLights;

        TRN.Helper.setLightsOnMoveables(this.bhvMgr.objectList['moveable'], this.sceneData, useAddLights);

        this.makeObjectList();
        this.registerAnimations();

        return TRN.Consts.Behaviour.retKeepBehaviour;
    },

    makeObjectList : function() {
        var moveables = this.bhvMgr.objectList['moveable'];

        this.objects = {};
        for (var objID in moveables) {
            var lstObj = moveables[objID];
            for (var i = 0; i < lstObj.length; ++i) {
                var obj = lstObj[i];
                var data = this.sceneData.objects[obj.name];

                if (data.dummy || !(obj instanceof THREE.SkinnedMesh) || !data.has_anims || !data.visible) continue;

                this.objects[obj.name] = obj;
            }
        }
    },

    // register all animations we will need in the cut scene
    registerAnimations : function() {
        for (var objID in this.objects) {
            var obj = this.objects[objID], data = this.sceneData.objects[obj.name];
            var registered = {}, anmIndex = data.animationStartIndex, allTrackInstances = {};

            while (true) {
                if (registered[anmIndex]) break;
                
                registered[anmIndex] = true;

                var track = this.sceneData.animTracks[anmIndex];
                var trackInstance = new TRN.Animation.TrackInstance(track, obj, data.bonesStartingPos);

                allTrackInstances[anmIndex] = trackInstance;

                anmIndex = track.nextTrack;
            }

            data.allTrackInstances = allTrackInstances;

            var trackInstance = allTrackInstances[data.animationStartIndex];

            trackInstance.setNextTrackInstance(data.allTrackInstances[trackInstance.track.nextTrack], trackInstance.track.nextTrackFrame);
            trackInstance.setNoInterpolationToNextTrack = true;

            trackInstance.runForward(0);
            trackInstance.interpolate();

            data.trackInstance = trackInstance;

            data.prevTrackInstance = data.trackInstance;
            data.prevTrackInstanceFrame = 0;
        }
    },

    onBeforeRenderLoop : function() {
		if (this.cutscene.sound != null) {
			TRN.Helper.startSound(this.cutscene.sound);
        }
    },

    frameStarted : function(curTime, delta) {
        // Update object lights
        for (var objID in this.objects) {
            var obj = this.objects[objID], data = this.sceneData.objects[obj.name];

            var pos = { x:obj.position.x, y:obj.position.y, z:obj.position.z };

            pos.x += obj.bones[0].position.x;
            pos.y += obj.bones[0].position.y;
            pos.z += obj.bones[0].position.z;

            var roomObj = TRN.Helper.findRoom(pos, this.bhvMgr.objectList['room'], this.sceneData);

            if (roomObj >= 0 && roomObj != data.roomIndex) {
                data.roomIndex = roomObj;

                var materials = obj.material.materials;
                for (var i = 0; i < materials.length; ++i) {
                    if (materials[i].uniforms.numPointLight !== undefined) {
                        TRN.Helper.setMaterialLightsUniform(this.sceneData.objects['room' + roomObj], materials[i], false, this.parent.useAdditionalLights);
                    }
                }
            }
        }
        
        if (this.cutSceneEnded) {
            return;
        }

		this.cutscene.curFrame += TRN.baseFrameRate * delta;

        // Update camera
		var t = this.cutscene.curFrame - Math.floor(this.cutscene.curFrame);
		var cfrmA = Math.min(Math.floor(this.cutscene.curFrame), this.cutscene.frames.length-3);
		var cfrmB = Math.min(cfrmA+1, this.cutscene.frames.length-3);

		if (cfrmA < this.cutscene.frames.length-3) {
			if (!this.parent.controls.captureMouse) {
				var frm1 = this.cutscene.frames[cfrmA];
				var frm2 = this.cutscene.frames[cfrmB];
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
				q.setFromAxisAngle( {x:0,y:1,z:0}, THREE.Math.degToRad(this.cutscene.origin.rotY) );

				lkat.applyQuaternion(q);

				this.parent.camera.fov = fov;
				this.parent.camera.position = eyePos;
				this.parent.camera.position.applyQuaternion(q);
				this.parent.camera.lookAt(lkat);
				this.parent.camera.position.add(this.cutscene.origin);
				this.parent.camera.quaternion.multiplyQuaternions(q.setFromAxisAngle( {x:0,y:1,z:0}, THREE.Math.degToRad(roll) ), this.parent.camera.quaternion);
				this.parent.camera.updateProjectionMatrix();
			}

		} else {
			this.cutSceneEnded = true;
		}
    }

}
