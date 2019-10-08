TRN.Behaviours.Lara = function(nbhv, gameData) {
    this.nbhv = nbhv;
    this.gameData = gameData;
    this.sceneData = gameData.sceneData;
    this.confMgr = gameData.confMgr;
    this.anmMgr = gameData.anmMgr;
    this.objMgr = gameData.objMgr;
}

TRN.Behaviours.Lara.prototype = {

    constructor : TRN.Behaviours.Lara,

    init : async function(lstObjs, resolve) {
        var startTrans = this.nbhv.starttrans,
            startAnim = this.nbhv.startanim,
            laraAngle = this.nbhv.angle;

        this.lara = lstObjs[0];

        if (!this.gameData.isCutscene) {
            if (startTrans) {
                this.lara.position.x += parseFloat(startTrans.x);
                this.lara.position.y += parseFloat(startTrans.y);
                this.lara.position.z += parseFloat(startTrans.z);
            }

            var laraQuat = this.lara.quaternion;
            if (laraAngle != undefined) {
                var q = glMatrix.quat.create();
                glMatrix.quat.setAxisAngle(q, [0,1,0], glMatrix.glMatrix.toRadian(parseFloat(laraAngle)));
                laraQuat.x = q[0];
                laraQuat.y = q[1];
                laraQuat.z = q[2];
                laraQuat.w = q[3];
            }

            var camPos = { x:this.lara.position.x, y:this.lara.position.y, z:this.lara.position.z }

			var ofstDir = parseFloat(this.nbhv.dirdist);
			var ofstUp = parseFloat(this.nbhv.updist);

			var v3 = [0, ofstUp, ofstDir];
			var q = [laraQuat.x, laraQuat.y, laraQuat.z, laraQuat.w];

			glMatrix.vec3.transformQuat(v3, v3, q);

			camPos.x += v3[0];
			camPos.y += v3[1];
            camPos.z += v3[2];
            
            this.gameData.camera.position.set(camPos.x, camPos.y, camPos.z);
            this.gameData.camera.quaternion.set(laraQuat.x, laraQuat.y, laraQuat.z, laraQuat.w);

            if (startAnim !== undefined) {
                this.anmMgr.setAnimation(this.lara, parseInt(startAnim), false);
            }

        }

		TRN.Consts.leftThighIndex = parseInt(this.nbhv.pistol_anim.left_dthigh) - 1;
		TRN.Consts.rightThighIndex = parseInt(this.nbhv.pistol_anim.right_thigh) - 1;
		TRN.Consts.leftHandIndex = parseInt(this.nbhv.pistol_anim.left_hand) - 1;
		TRN.Consts.rightHandIndex = parseInt(this.nbhv.pistol_anim.right_hand) - 1;

        // create pistolanim object
        /*!TRN.ObjectID.PistolAnim = parseInt(this.nbhv.pistol_anim.id);

        var mvb = this.objMgr.createMoveable(TRN.ObjectID.PistolAnim, -1, undefined, false, false);
        if (mvb) {
            this.sceneData.objects[mvb.name].visible = false;
            this.sceneData.objects[mvb.name].has_anims = false;
        }

        // create the meshswap objects
        var meshSwapIds = [
            this.confMgr.number('meshswap > objid1', true, 0),
            this.confMgr.number('meshswap > objid2', true, 0),
            this.confMgr.number('meshswap > objid3', true, 0)
        ];
        for (var i = 0; i < meshSwapIds.length; ++i) {
            TRN.ObjectID['meshswap' + (i+1)] = meshSwapIds[i];
            if (TRN.ObjectID['meshswap' + (i+1)] > 0) {
                var mvb = this.objMgr.createMoveable(TRN.ObjectID['meshswap' + (i+1)], -1, undefined, false, false);
                if (mvb) {
                    this.sceneData.objects[mvb.name].visible = false;
                    this.sceneData.objects[mvb.name].has_anims = false;
                }
            }
        }

        // put pistols in Lara holsters
        var obj = this.objMgr.objectList['moveable'][TRN.ObjectID.PistolAnim];
		var lara = this.objMgr.objectList['moveable'][TRN.ObjectID.Lara];

		if (obj && lara) {
			var mswap = new TRN.MeshSwap(obj[0], lara[0]);

			mswap.swap([TRN.Consts.leftThighIndex, TRN.Consts.rightThighIndex]);
		}*/

        resolve(TRN.Consts.Behaviour.retKeepBehaviour);
    },

    getObject : function() {
        return this.lara;
    }

}
