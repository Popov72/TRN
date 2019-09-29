TRN.Behaviours.Light = function(nbhv, bhvMgr) {
    this.nbhv = nbhv;
}

TRN.Behaviours.Light.prototype = {

    constructor : TRN.Behaviours.Light,

    init : function(lstObjs) {

        return TRN.Consts.Behaviour.retKeepBehaviour;
    }

}
