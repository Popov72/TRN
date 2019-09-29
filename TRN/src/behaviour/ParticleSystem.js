TRN.Behaviours.ParticleSystem = function(nbhv, bhvMgr) {
    this.nbhv = nbhv;
}

TRN.Behaviours.ParticleSystem.prototype = {

    constructor : TRN.Behaviours.ParticleSystem,

    init : function(lstObjs) {

        return TRN.Consts.Behaviour.retKeepBehaviour;
    }

}
