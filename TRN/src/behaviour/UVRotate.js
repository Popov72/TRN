TRN.Behaviours.UVRotate = function(nbhv, gameData) {
    this.nbhv = nbhv;
    this.animatedTextures = gameData.sceneData.animatedTextures;
}

TRN.Behaviours.UVRotate.prototype = {

    constructor : TRN.Behaviours.UVRotate,

    init : async function(lstObjs, resolve) {
        if (lstObjs == null) {
            resolve(TRN.Consts.Behaviour.retDontKeepBehaviour);
            return;
        }

        var lstMaterials = [];

        for (var i = 0; i < lstObjs.length; ++i) {
            var obj = lstObjs[i],
                materials = obj.material.materials;
            
            for (var m = 0; m < materials.length; ++m) {
                var material = materials[m],
                    userData = material.userData;

                if (!userData || !userData.animatedTexture) {
                    continue;
                }

                var animTexture = this.animatedTextures[userData.animatedTexture.idxAnimatedTexture];

                if (animTexture.scrolltexture) {
                    lstMaterials.push(material);
                }
            }
        }

        this.matList = lstMaterials;

        resolve(TRN.Consts.Behaviour.retKeepBehaviour);
    },

    frameEnded : function(curTime, delta) {
        for (var i = 0; i < this.matList.length; ++i) {
            var material = this.matList[i],
                userData = material.userData,
                animTexture = this.animatedTextures[userData.animatedTexture.idxAnimatedTexture],
                coords = animTexture.animcoords[0],
                pgr = (curTime * 1000.0) / (5*material.uniforms.map.value.image.height), 
                h = (TRN.Consts.uvRotateTileHeight/2.0)/material.uniforms.map.value.image.height;

            pgr = pgr - h * Math.floor(pgr / h);

            material.uniforms.offsetRepeat.value[0] = coords.minU - userData.animatedTexture.minU;
            material.uniforms.offsetRepeat.value[1] = coords.minV - userData.animatedTexture.minV*0.5 + h - pgr;
            material.uniforms.offsetRepeat.value[3] = 0.5;
        }
    }

}
