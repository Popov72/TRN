TRN.Behaviours.Fade = function(nbhv, gameData) {
    this.nbhv = nbhv;
    this.sceneRender = gameData.sceneRender;
    this.bhvMgr = gameData.bhvMgr;
    this.gameData = gameData;
}

TRN.Behaviours.Fade.prototype = {

    constructor : TRN.Behaviours.Fade,

    init : async function(lstObjs, resolve) {
        this.colorStart = this.nbhv.colorStart;
        this.colorEnd = this.nbhv.colorEnd;
        this.duration = parseFloat(this.nbhv.duration);
        this.numSteps = this.gameData.fps * this.duration;
        this.curStep = 0;

        this.step = {
            "r": (this.colorEnd.r - this.colorStart.r) / this.numSteps,
            "g": (this.colorEnd.r - this.colorStart.r) / this.numSteps,
            "b": (this.colorEnd.r - this.colorStart.r) / this.numSteps,
        }

        this.setColor([this.colorStart.r, this.colorStart.g, this.colorStart.b]);

        resolve(TRN.Consts.Behaviour.retKeepBehaviour);
    },

    frameStarted : function(curTime, delta) {
        this.colorStart.r += this.step.r;
        this.colorStart.g += this.step.g;
        this.colorStart.b += this.step.b;
        
        this.setColor([this.colorStart.r, this.colorStart.g, this.colorStart.b]);

        this.curStep++;

        if (this.curStep >= this.numSteps) {
            this.setColor([this.colorEnd.r, this.colorEnd.g, this.colorEnd.b]);
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
