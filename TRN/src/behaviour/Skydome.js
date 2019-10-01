TRN.Behaviours.Skydome = function(nbhv, gameData) {
    this.nbhv = nbhv;
    this.scene = gameData.sceneRender;
    this.sceneData = gameData.sceneData;
    this.sceneBackground = gameData.sceneBackground;
    this.bhvMgr = gameData.bhvMgr;
    this.objMgr = gameData.objMgr;
    this.camera = gameData.camera;
}

TRN.Behaviours.Skydome.prototype = {

    constructor : TRN.Behaviours.Skydome,

    init : async function(lstObjs, resolve) {
        var hide = this.nbhv.hide == 'true';
        var objSky = this.objMgr.objectList['skydome'];

        if (!objSky || !objSky['0']) {
            resolve(TRN.Consts.Behaviour.retDontKeepBehaviour);
            return;
        }

        this.objSky = objSky['0'][0];

        this.scene.remove(this.objSky);

        if (hide) {
            this.objMgr.removeObjectFromScene(this.objSky);
            
            resolve(TRN.Consts.Behaviour.retDontKeepBehaviour);
            return;
        }

        this.objSky.renderDepth = 0;
        this.objSky.matrixAutoUpdate = true;
        
        var skyTexture = this.sceneData.textures["texture" + (TRN.Helper.objSize(this.sceneData.textures)-1)];

        skyTexture.wrapS = skyTexture.wrapT = THREE.RepeatWrapping;

        this.sceneBackground.add(this.objSky);

        var skyColor = [this.nbhv.color.r/255.0, this.nbhv.color.g/255.0, this.nbhv.color.b/255.0];

        var material = this.objSky.material.materials[0];

        material.uniforms.tintColor.value = skyColor;

        resolve(TRN.Consts.Behaviour.retKeepBehaviour);
    },

    frameEnded : function(curTime) {
        this.objSky.position = this.camera.position;

        var material = this.objSky.material.materials[0];

        if (material.uniforms) {
            var pgr = curTime / (50.0*1000.0);
            pgr = pgr - Math.floor(pgr);
            material.uniforms.offsetRepeat.value[0] = pgr;
        }
    }

}
