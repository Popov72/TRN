TRN.Behaviours.Light = function(nbhv, parent) {
    this.nbhv = nbhv;
    this.parent = parent;
}

TRN.Behaviours.Light.prototype = {

    constructor : TRN.Behaviours.Light,

    init : function(lstObjs) {

        return TRN.Consts.Behaviour.retKeepBehaviour;
    }

}
