TRN.Behaviours.RemoveObject = function(nbhv, bhvMgr) {
    this.nbhv = nbhv;
    this.bhvMgr = bhvMgr;
}

TRN.Behaviours.RemoveObject.prototype = {

    constructor : TRN.Behaviours.RemoveObject,

    init : function(lstObjs) {

        lstObjs.forEach( (obj) => {
            this.bhvMgr.removeObject(obj);
        });

        return TRN.Consts.Behaviour.retDontKeepBehaviour;
    }

}
