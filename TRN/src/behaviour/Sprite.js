TRN.Behaviours.Sprite = function(nbhv, bhvMgr) {
    this.bhvMgr = bhvMgr;
}

TRN.Behaviours.Sprite.prototype = {

    constructor : TRN.Behaviours.Sprite,

    init : function(lstObjs) {
        this.objects = this.bhvMgr.objectList['sprite'];

        return TRN.Consts.Behaviour.retKeepBehaviour;
    },

    frameEnded : function() {
        // make sure the object is always facing the camera
        var cameraRot = this.bhvMgr.parent.camera;

        for (var objID in this.objects) {
            var lstObj = this.objects[objID];

            for (var i = 0; i < lstObj.length; ++i) {
                var obj = lstObj[i];

                obj.quaternion.set(cameraRot.quaternion.x, cameraRot.quaternion.y, cameraRot.quaternion.z, cameraRot.quaternion.w);
                obj.updateMatrix();
            }
        }
    }

}
