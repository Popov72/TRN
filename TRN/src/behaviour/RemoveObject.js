TRN.Behaviours.RemoveObject = function(nbhv, parent) {
    this.nbhv = nbhv;
    this.parent = parent;
}

TRN.Behaviours.RemoveObject.prototype = {

    constructor : TRN.Behaviours.RemoveObject,

    init : function(lstObjs) {

        lstObjs.forEach( (obj) => {
            this.parent.scene.scene.remove(obj);
        });

        return TRN.Consts.Behaviour.retDontKeepBehaviour;
    }

}
