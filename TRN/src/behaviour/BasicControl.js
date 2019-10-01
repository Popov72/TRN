TRN.Behaviours.BasicControl = function(nbhv, gameData) {
    this.nbhv = nbhv;
}

TRN.Behaviours.BasicControl.prototype = {

    constructor : TRN.Behaviours.BasicControl,

    init : async function(lstObjs, resolve) {
        resolve(TRN.Consts.Behaviour.retKeepBehaviour);
    }

}
