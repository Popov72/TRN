TRN.Skeleton = function(bonesStartingPos) {
    this.bones = [];
    this.bonesStartingPos = bonesStartingPos;

    this.boneMatrices = new Float32Array( 64 * 16 );

    for (let i = 0; i < 64; ++i) {
        this.boneMatrices.set([1], 0 + 16 * i);
        this.boneMatrices.set([1], 5 + 16 * i);
        this.boneMatrices.set([1], 10 + 16 * i);
        this.boneMatrices.set([1], 15 + 16 * i);
    }

    for (let b = 0; b < bonesStartingPos.length; ++b) {
        const parent = bonesStartingPos[b].parent,
              bone = new THREE.Object3D();

        this.bones.push(bone);

        if (parent >= 0) {
            this.bones[parent].add(bone);
        }
    }
}

TRN.Skeleton.prototype = {

    constructor : TRN.Skeleton,

    updateBoneMatrices : function() {
        this.bones[0].updateMatrixWorld(true);
        this._setBoneMatrices();
    },

    getBoneMatrices : function() {
        return this.boneMatrices;
    },

    _setBoneMatrices : function() {
		for (let b = 0; b < this.bones.length; b ++) {
            const bone = this.bones[b];

			bone.matrixWorld.toArray(this.boneMatrices, b * 16);
		}
    }

}
