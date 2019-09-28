TRN.Behaviours.Flare = function(nbhv, parent) {
    this.nbhv = nbhv;
    this.parent = parent;
}

TRN.Behaviours.Flare.prototype = {

    constructor : TRN.Behaviours.Flare,

    init : function(lstObjs) {

        return TRN.Consts.Behaviour.retKeepBehaviour;
    }

}
