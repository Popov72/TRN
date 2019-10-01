TRN.Behaviours.Sky = function(nbhv, gameData) {
    this.nbhv = nbhv;
    this.scene = gameData.sceneRender;
    this.sceneData = gameData.sceneData;
    this.sceneBackground = gameData.sceneBackground;
    this.bhvMgr = gameData.bhvMgr;
    this.confMgr = gameData.confMgr;
    this.objMgr = gameData.objMgr;
    this.camera = gameData.camera;
}

TRN.Behaviours.Sky.prototype = {

    constructor : TRN.Behaviours.Sky,

    init : async function(lstObjs, resolve) {
        var id = this.nbhv.id, 
            hide = this.nbhv.hide == 'true', 
            noanim = this.nbhv.noanim == 'true';

        if (hide) {
            resolve(TRN.Consts.Behaviour.retDontKeepBehaviour);
            return;
        }

        this.objSky = this.objMgr.createMoveable(id, -1, false);

        if (this.objSky == null) {
            resolve(TRN.Consts.Behaviour.retDontKeepBehaviour);
            return;
        }

        var data = this.sceneData.objects[this.objSky.name];

        data.has_anims = !noanim;

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

        resolve(TRN.Consts.Behaviour.retKeepBehaviour);
    },

    frameEnded : function() {
        this.objSky.position = this.camera.position;
    }

}
