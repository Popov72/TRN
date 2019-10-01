TRN.Behaviours.Lara = function(nbhv, gameData) {
    this.nbhv = nbhv;
}

TRN.Behaviours.Lara.prototype = {

    constructor : TRN.Behaviours.Lara,

    init : async function(lstObjs, resolve) {
        var startTrans = this.nbhv.starttrans;

        this.lara = lstObjs[0];

        if (startTrans) {
            startTrans.x = parseFloat(startTrans.x);
            startTrans.y = parseFloat(startTrans.y);
            startTrans.z = parseFloat(startTrans.z);

            this.lara.position.add(startTrans);
        }

        resolve(TRN.Consts.Behaviour.retKeepBehaviour);
    }

}
