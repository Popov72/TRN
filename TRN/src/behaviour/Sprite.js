TRN.Behaviours.Sprite = function(nbhv, gameData) {
    this.objMgr = gameData.objMgr;
    this.camera = gameData.camera;
}

TRN.Behaviours.Sprite.prototype = {

    constructor : TRN.Behaviours.Sprite,

    init : async function(lstObjs, resolve) {
        resolve(TRN.Consts.Behaviour.retKeepBehaviour);
    },

    frameEnded : function() {
        // make sure the object is always facing the camera
        var cameraRot = this.camera;

        var objects = Object.assign({}, this.objMgr.objectList['sprite'], this.objMgr.objectList['spriteseq']);

        for (var objID in objects) {
            var lstObj = objects[objID];

            for (var i = 0; i < lstObj.length; ++i) {
                var obj = lstObj[i];

                obj.quaternion.set(cameraRot.quaternion.x, cameraRot.quaternion.y, cameraRot.quaternion.z, cameraRot.quaternion.w);
                obj.updateMatrix();
            }
        }
    }

}
