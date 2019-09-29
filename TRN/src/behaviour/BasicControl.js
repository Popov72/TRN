TRN.Behaviours.BasicControl = function(nbhv, bhvMgr) {
    this.nbhv = nbhv;
}

TRN.Behaviours.BasicControl.prototype = {

    constructor : TRN.Behaviours.BasicControl,

    init : function(lstObjs) {

        return TRN.Consts.Behaviour.retKeepBehaviour;
    }

}
