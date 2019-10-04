TRN.Behaviours.Fade = function(nbhv, gameData) {
    this.nbhv = nbhv;
    this.sceneRender = gameData.sceneRender;
    this.bhvMgr = gameData.bhvMgr;
    this.gameData = gameData;
}

TRN.Behaviours.Fade.prototype = {

    constructor : TRN.Behaviours.Fade,

    init : async function(lstObjs, resolve) {
        this.lstObjs = lstObjs;

        this.colorStart = this.nbhv.colorStart;
        this.colorEnd = this.nbhv.colorEnd;
        this.duration = parseFloat(this.nbhv.duration);
        this.numSteps = this.gameData.fps * this.duration;
        this.curStep = 0;

        this.step = [
            (this.colorEnd[0] - this.colorStart[0]) / this.numSteps,
            (this.colorEnd[1] - this.colorStart[1]) / this.numSteps,
            (this.colorEnd[2] - this.colorStart[2]) / this.numSteps
        ];

        this.setColor(this.colorStart);

        resolve(TRN.Consts.Behaviour.retKeepBehaviour);
    },

    frameStarted : function(curTime, delta) {
        this.colorStart[0] += this.step[0];
        this.colorStart[1] += this.step[1];
        this.colorStart[2] += this.step[2];
        
        this.setColor(this.colorStart);

        this.curStep++;

        if (this.curStep >= this.numSteps) {
            this.setColor(this.colorEnd);
            this.bhvMgr.removeBehaviour(this);
        }
    },

    setColor : function(color) {
		this.sceneRender.traverse( (obj) => {
            if (!obj.visible || !(obj instanceof THREE.Mesh)) {
                return;
            }

            const materials = obj.material.materials;
            
			if (!materials || !materials.length) {
                return;
            }

			for (let i = 0; i < materials.length; ++i) {
				const material = materials[i];

				material.uniforms.tintColor.value = color;
			}
        });
    }

}
