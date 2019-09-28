TRN.Behaviours.Lara = function(nbhv, parent) {
    this.nbhv = nbhv;
    this.parent = parent;
}

TRN.Behaviours.Lara.prototype = {

    constructor : TRN.Behaviours.Lara,

    init : function(lstObjs) {

        return TRN.Consts.Behaviour.retKeepBehaviour;
    }

}
