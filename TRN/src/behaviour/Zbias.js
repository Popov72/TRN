TRN.Behaviours.Zbias = function(nbhv, gameData) {
    this.nbhv = nbhv;
}

TRN.Behaviours.Zbias.prototype = {

    constructor : TRN.Behaviours.Zbias,

    init : async function(lstObjs, resolve) {
        var params = this.nbhv.polygoneoffset;
        if (params) {
            var factor = params.factor, unit = params.unit;
            lstObjs.forEach( (obj) => {
                var materials = obj.material.materials;
                for (var m = 0; m < materials.length; ++m) {
                    var material = materials[m];
                    material.polygonOffset = true;
                    material.polygonOffsetFactor = factor;
                    material.polygonOffsetUnits = unit;
                }
            });
        }

        resolve(TRN.Consts.Behaviour.retDontKeepBehaviour);
    }

}
