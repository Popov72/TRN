TRN.Behaviours.Sky = function(nbhv, bhvMgr) {
    this.nbhv = nbhv;
    this.bhvMgr = bhvMgr;
    this.scene = bhvMgr.scene;
    this.sceneBackground = bhvMgr.parent.sceneBackground;
}

TRN.Behaviours.Sky.prototype = {

    constructor : TRN.Behaviours.Sky,

    init : function(lstObjs) {
        var id = this.nbhv.id, hide = this.nbhv.hide == 'true';
        var objSky = this.bhvMgr.objectList['moveable'][id];

        if (!objSky || objSky.length != 1) {
            return TRN.Consts.Behaviour.retDontKeepBehaviour;
        }

        this.objSky = objSky[0];

        this.scene.remove(this.objSky);

        if (hide) {
            this.bhvMgr.removeObject(this.objSky);
            
            return TRN.Consts.Behaviour.retDontKeepBehaviour;
        }

        this.objSky.renderDepth = 1;
        this.objSky.matrixAutoUpdate = true;

        this.sceneBackground.add(this.objSky);

        var shaderMgr = new TRN.ShaderMgr();

        var materials = this.objSky.material.materials;
        for (var mat = 0; mat < materials.length; ++mat) {
            var material = materials[mat];
            
            material.depthWrite = false;
            material.fragmentShader = shaderMgr.getFragmentShader('sky');
            material.vertexShader = shaderMgr.getVertexShader('sky');
            //material.depthTest = false;
        }

        return TRN.Consts.Behaviour.retKeepBehaviour;
    },

    frameEnded : function() {
        this.objSky.position = this.bhvMgr.parent.camera.position;
    }

}
