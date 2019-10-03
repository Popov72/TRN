TRN.Behaviours.ScrollTexture = function(nbhv, gameData) {
    this.nbhv = nbhv;
}

TRN.Behaviours.ScrollTexture.prototype = {

    constructor : TRN.Behaviours.ScrollTexture,

    init : async function(lstObjs, resolve) {
        if (lstObjs == null) {
            resolve(TRN.Consts.Behaviour.retDontKeepBehaviour);
            return;
        }

        this.lstObjs = lstObjs;

        resolve(TRN.Consts.Behaviour.retKeepBehaviour);
    },

    frameEnded : function(curTime, delta) {
        for (var i = 0; i < this.lstObjs.length; ++i) {
            var obj = this.lstObjs[i],
                materials = obj.material.materials;
            
            for (var m = 0; m < materials.length; ++m) {
                var material = materials[m],
                    pgr = curTime / (5*material.uniforms.map.value.image.height), 
                    h = (TRN.Consts.moveableScrollAnimTileHeight/2.0)/material.uniforms.map.value.image.height;

                pgr = pgr - h * Math.floor(pgr / h);
                material.uniforms.offsetRepeat.value[1] = h - pgr;
            }
        }
    }

}