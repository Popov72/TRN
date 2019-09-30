TRN.Behaviours.CutScene = function(nbhv, bhvMgr) {
    this.nbhv = nbhv;
    this.bhvMgr = bhvMgr;
    this.parent = bhvMgr.parent;
    this.scene = bhvMgr.parent.scene;
    this.sceneJSON = bhvMgr.parent.sceneJSON;
    this.cutscene = this.parent.sceneJSON.cutScene;
    this.cutSceneEnded = false;
}

TRN.Behaviours.CutScene.prototype = {

    constructor : TRN.Behaviours.CutScene,

    init : function(lstObjs) {

        var useAddLights = this.nbhv.useadditionallights == 'true';

        this.parent.useAdditionalLights = useAddLights;

        TRN.Helper.setLightsOnMoveables(this.parent.scene.objects, this.parent.sceneJSON, useAddLights);

        this.makeObjectList();
        this.registerAnimations();

        return TRN.Consts.Behaviour.retKeepBehaviour;
    },

    makeObjectList : function() {

        this.objects = {};
        for (var objID in this.scene.objects) {

            var obj = this.scene.objects[objID];
            var objJSON = this.sceneJSON.objects[objID];

            if (objJSON.dummy || !(obj instanceof THREE.SkinnedMesh) || !objJSON.has_anims || !objJSON.visible) continue;

            this.objects[objID] = obj;
        }

    },

    // register all animations we will need in the cut scene
    registerAnimations : function() {

        for (var objID in this.objects) {

            var obj = this.objects[objID], objJSON = this.sceneJSON.objects[objID];
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

            obj.prevTrackInstance = obj.trackInstance;
            obj.prevTrackInstanceFrame = 0;
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
            var obj = this.objects[objID], objJSON = this.sceneJSON.objects[objID];

            var pos = { x:obj.position.x, y:obj.position.y, z:obj.position.z };

            pos.x += obj.bones[0].position.x;
            pos.y += obj.bones[0].position.y;
            pos.z += obj.bones[0].position.z;

            var roomObj = TRN.Helper.findRoom(pos, this.parent.objectList['room'], this.sceneJSON);

            if (roomObj >= 0 && roomObj != objJSON.roomIndex) {
                objJSON.roomIndex = roomObj;

                var materials = obj.material.materials;
                for (var i = 0; i < materials.length; ++i) {
                    if (materials[i].uniforms.numPointLight !== undefined) {
                        TRN.Helper.setMaterialLightsUniform(this.sceneJSON.objects['room' + roomObj], materials[i], false, this.parent.useAdditionalLights);
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
