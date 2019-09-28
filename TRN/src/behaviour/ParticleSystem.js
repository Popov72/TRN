TRN.Behaviours.ParticleSystem = function(nbhv, parent) {
    this.nbhv = nbhv;
    this.parent = parent;
}

TRN.Behaviours.ParticleSystem.prototype = {

    constructor : TRN.Behaviours.ParticleSystem,

    init : function(lstObjs) {

        return TRN.Consts.Behaviour.retKeepBehaviour;
    }

}
