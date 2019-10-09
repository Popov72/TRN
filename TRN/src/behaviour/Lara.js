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

        const dataLara = this.sceneData.objects[this.lara.name],
              layer = new TRN.Layer(this.lara, this.gameData);

        dataLara.layer = layer;

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

        // create pistolanim object
        TRN.ObjectID.PistolAnim = this.nbhv.animobject && this.nbhv.animobject.pistol ? parseInt(this.nbhv.animobject.pistol) : -1;

        var mvbPistolAnim = this.objMgr.createMoveable(TRN.ObjectID.PistolAnim, -1, undefined, true, dataLara.skeleton);
        if (mvbPistolAnim) {
            layer.setMesh(TRN.Layer.LAYER.WEAPON, mvbPistolAnim, 0);
        }

        // create holster empty object
        TRN.ObjectID.HolsterEmpty = this.nbhv.animobject && this.nbhv.animobject.holster ? parseInt(this.nbhv.animobject.holster) : -1;

        var mvbHolsterEmpty = this.objMgr.createMoveable(TRN.ObjectID.HolsterEmpty, -1, undefined, true, dataLara.skeleton);
        if (mvbHolsterEmpty) {
            layer.setMesh(TRN.Layer.LAYER.HOLSTER_EMPTY, mvbHolsterEmpty, 0);
        }

        // create holster full object
        TRN.ObjectID.HolsterFull = this.nbhv.animobject && this.nbhv.animobject.holster_pistols ? parseInt(this.nbhv.animobject.holster_pistols) : -1;

        var mvbHolsterFull = this.objMgr.createMoveable(TRN.ObjectID.HolsterFull, -1, undefined, true, dataLara.skeleton);
        if (mvbHolsterFull) {
            const skinIndices = mvbHolsterFull.geometry.attributes.skinIndex.array;
            for (let i = 0; i < skinIndices.length; ++i) {
                if (skinIndices[i] == 4) {
                    skinIndices[i] = 1;
                } else if (skinIndices[i] == 8) {
                    skinIndices[i] = 4;
                }
            }
            layer.setMesh(TRN.Layer.LAYER.HOLSTER_FULL, mvbHolsterFull, 0);
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
                var mvb = this.objMgr.createMoveable(TRN.ObjectID['meshswap' + (i+1)], -1, undefined, true, dataLara.skeleton);
                if (mvb) {
                    layer.makeSkinIndicesList(mvb.geometry);
                    layer.setMask(mvb, 0);
                }
            }
        }

        layer.update();
        layer.setBoundingObjects();

        if (this.confMgr.trversion == 'TR4') {
            if (mvbHolsterFull) {
                layer.updateMask(TRN.Layer.LAYER.HOLSTER_FULL, TRN.Layer.MASK.LEG_L1 | TRN.Layer.MASK.LEG_R1);
            }
        } else if (mvbPistolAnim) {
            // put pistols in Lara holsters
            layer.updateMask(TRN.Layer.LAYER.WEAPON, TRN.Layer.MASK.LEG_L1 | TRN.Layer.MASK.LEG_R1);
            //layer.updateMask(TRN.Layer.LAYER.MAIN,   TRN.Layer.MASK.LEG_L1 | TRN.Layer.MASK.LEG_R1);
        }

        resolve(TRN.Consts.Behaviour.retKeepBehaviour);
    },

    getObject : function() {
        return this.lara;
    }

}
