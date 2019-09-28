TRN.Behaviours.BasicControl = function(nbhv, parent) {
    this.nbhv = nbhv;
    this.parent = parent;
}

TRN.Behaviours.BasicControl.prototype = {

    constructor : TRN.Behaviours.BasicControl,

    init : function(lstObjs) {

        return TRN.Consts.Behaviour.retKeepBehaviour;
    }

}
