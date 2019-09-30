TRN.Behaviours.Skydome = function(nbhv, bhvMgr) {
    this.nbhv = nbhv;
    this.bhvMgr = bhvMgr;
    this.scene = bhvMgr.scene;
    this.sceneBackground = bhvMgr.parent.sceneBackground;
}

TRN.Behaviours.Skydome.prototype = {

    constructor : TRN.Behaviours.Skydome,

    init : function(lstObjs) {
        var hide = this.nbhv.hide == 'true';
        var objSky = this.bhvMgr.objectList['skydome'];

        if (!objSky || !objSky['0']) {
            return TRN.Consts.Behaviour.retDontKeepBehaviour;
        }

        this.objSky = objSky['0'][0];

        this.scene.remove(this.objSky);

        if (hide) {
            this.bhvMgr.removeObject(this.objSky);
            
            return TRN.Consts.Behaviour.retDontKeepBehaviour;
        }

        this.objSky.renderDepth = 0;
        this.objSky.matrixAutoUpdate = true;
        
        var skyTexture = this.bhvMgr.parent.sceneData.textures["texture" + (TRN.Helper.objSize(this.bhvMgr.parent.sceneData.textures)-1)];

        skyTexture.wrapS = skyTexture.wrapT = THREE.RepeatWrapping;

        this.sceneBackground.add(this.objSky);

        var skyColor = [this.nbhv.color.r/255.0, this.nbhv.color.g/255.0, this.nbhv.color.b/255.0];

        var material = this.objSky.material.materials[0];

        material.uniforms.tintColor.value = skyColor;

        return TRN.Consts.Behaviour.retKeepBehaviour;
    },

    frameEnded : function(curTime) {
        this.objSky.position = this.bhvMgr.parent.camera.position;

        var material = this.objSky.material.materials[0];

        if (material.uniforms) {
            var pgr = curTime / (50.0*1000.0);
            pgr = pgr - Math.floor(pgr);
            material.uniforms.offsetRepeat.value[0] = pgr;
        }
    }

}
