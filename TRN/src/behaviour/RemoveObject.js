TRN.Behaviours.RemoveObject = function(nbhv, gameData) {
    this.nbhv = nbhv;
    this.objMgr = gameData.objMgr;
}

TRN.Behaviours.RemoveObject.prototype = {

    constructor : TRN.Behaviours.RemoveObject,

    init : async function(lstObjs, resolve) {
        if (lstObjs) {
            lstObjs.forEach( (obj) => {
                this.objMgr.removeObjectFromScene(obj);
            });
        }

        resolve(TRN.Consts.Behaviour.retDontKeepBehaviour);
    }

}
