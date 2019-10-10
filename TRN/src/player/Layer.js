TRN.Layer = function(mainMesh, gameData) {
    this.sceneData = gameData.sceneData;
    this.matMgr = gameData.matMgr;

    this.layers = {};
    
    this.setMesh(TRN.Layer.LAYER.MAIN, mainMesh);
}

TRN.Layer.LAYER = {
    "MAIN":             0,
    "WEAPON":           1,
    "HOLSTER_EMPTY":    2,
    "HOLSTER_FULL":     3,
    "MESHSWAP":         4
};

TRN.Layer.BONE = {
    HIPS:       0,
    LEG_L1:     1,
    LEG_L2:     2,
    LEG_L3:     3,
    LEG_R1:     4,
    LEG_R2:     5,
    LEG_R3:     6,
    CHEST:      7,
    ARM_R1:     8,
    ARM_R2:     9,
    ARM_R3:     10,
    ARM_L1:     11,
    ARM_L2:     12,
    ARM_L3:     13,
    HEAD:       14
};

TRN.Layer.MASK = {
    HIPS:       1 << TRN.Layer.BONE.HIPS,
    LEG_L1:     1 << TRN.Layer.BONE.LEG_L1,
    LEG_L2:     1 << TRN.Layer.BONE.LEG_L2,
    LEG_L3:     1 << TRN.Layer.BONE.LEG_L3,
    LEG_R1:     1 << TRN.Layer.BONE.LEG_R1,
    LEG_R2:     1 << TRN.Layer.BONE.LEG_R2,
    LEG_R3:     1 << TRN.Layer.BONE.LEG_R3,
    CHEST:      1 << TRN.Layer.BONE.CHEST,
    ARM_R1:     1 << TRN.Layer.BONE.ARM_R1,
    ARM_R2:     1 << TRN.Layer.BONE.ARM_R2,
    ARM_R3:     1 << TRN.Layer.BONE.ARM_R3,
    ARM_L1:     1 << TRN.Layer.BONE.ARM_L1,
    ARM_L2:     1 << TRN.Layer.BONE.ARM_L2,
    ARM_L3:     1 << TRN.Layer.BONE.ARM_L3,
    HEAD:       1 << TRN.Layer.BONE.HEAD
};

Object.assign(TRN.Layer.MASK, {
    ARM_L:      TRN.Layer.MASK.ARM_L1 | TRN.Layer.MASK.ARM_L2 | TRN.Layer.MASK.ARM_L3,
    ARM_R:      TRN.Layer.MASK.ARM_R1 | TRN.Layer.MASK.ARM_R2 | TRN.Layer.MASK.ARM_R3,
    LEG_L:      TRN.Layer.MASK.LEG_L1 | TRN.Layer.MASK.LEG_L2 | TRN.Layer.MASK.LEG_L3,
    LEG_R:      TRN.Layer.MASK.LEG_R1 | TRN.Layer.MASK.LEG_R2 | TRN.Layer.MASK.LEG_R3,
    BRAID:      TRN.Layer.MASK.HEAD   | TRN.Layer.MASK.CHEST  | TRN.Layer.MASK.ARM_L1 | TRN.Layer.MASK.ARM_L2 | TRN.Layer.MASK.ARM_R1 | TRN.Layer.MASK.ARM_R2
});

Object.assign(TRN.Layer.MASK, {
    UPPER:      TRN.Layer.MASK.CHEST  | TRN.Layer.MASK.ARM_L  | TRN.Layer.MASK.ARM_R,       // without head
    LOWER:      TRN.Layer.MASK.HIPS   | TRN.Layer.MASK.LEG_L  | TRN.Layer.MASK.LEG_R
});

Object.assign(TRN.Layer.MASK, {
    ALL:        TRN.Layer.MASK.UPPER  | TRN.Layer.MASK.LOWER  | TRN.Layer.MASK.HEAD
});

TRN.Layer.prototype = {

    constructor : TRN.Layer,

    isEmpty : function(layerIndex) {
        return this.layers[layerIndex] === undefined;
    },

    getMesh : function(layerIndex) {
        return this.layers[layerIndex] ? this.layers[layerIndex].mesh : null;
    },

    setMesh : function(layerIndex, mesh, mask) {
        if (mask === undefined) {
            mask = TRN.Layer.MASK.ALL;
        }

        this.layers[layerIndex] = { "mesh":mesh, "mask":mask };

        if (!mesh.geometry.userData.skinIndices) {
            this.makeSkinIndicesList(mesh.geometry);
        }

        if (layerIndex != TRN.Layer.LAYER.MAIN) {
            const mainMesh = this.layers[TRN.Layer.LAYER.MAIN].mesh;
            this._setSkeleton(mesh, this.sceneData.objects[mainMesh.name].skeleton);
            this.setRoom(this.sceneData.objects[mainMesh.name].roomIndex, mesh);
        }

        this.setMask(mesh, mask);
    },

    updateMask : function(layerIndex, mask) {
        const layer = this.layers[layerIndex];

        if (!layer) {
            return;
        }

        layer.mask = layer.mask ^ mask;

        this.setMask(layer.mesh, layer.mask);
    },

    setMask : function(mesh, mask) {
        const geometry = mesh.geometry;
        
        let idx = 0,
            indices = [],
            skinIndices = geometry.userData.skinIndices,
            numMaxBones = skinIndices.length;

        while (mask && idx < numMaxBones) {
            const bit = mask & 1;

            if (bit && skinIndices[idx] !== undefined) {
                indices = indices.concat(skinIndices[idx]);
            }

            mask = mask >> 1;

            idx++;
        }

        mesh.geometry.setIndex(indices);
    },

    update : function() {
        const position = this.layers[TRN.Layer.LAYER.MAIN].mesh.position,
              quaternion = this.layers[TRN.Layer.LAYER.MAIN].mesh.quaternion;
        for (let i in this.layers) {
            if (i != TRN.Layer.LAYER.MAIN) {
                this.layers[i].mesh.position.set(position.x, position.y, position.z);
                this.layers[i].mesh.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
            }
        }
    },

    setBoundingObjects : function() {
        const mainGeometry = this.layers[TRN.Layer.LAYER.MAIN].mesh.geometry;
        for (let i in this.layers) {
            const mesh = this.layers[i].mesh;
            if (i != TRN.Layer.LAYER.MAIN) {
                mesh.geometry.boundingBox = mainGeometry.boundingBox;
                this.layers[i].mesh.geometry.boundingSphere = mainGeometry.boundingSphere;
                if (mesh.boxHelper) {
                    mesh.boxHelper.box = mainGeometry.boundingBox;
                }
            }
        }
    },

    setRoom : function(roomIndex, mesh) {
        if (mesh) {
            this.sceneData.objects[mesh.name].roomIndex = roomIndex;
            this.matMgr.setUniformsFromRoom(mesh, roomIndex);
        } else {
            for (let i in this.layers) {
                const mesh = this.layers[i].mesh;
                if (i != TRN.Layer.LAYER.MAIN) {
                    this.sceneData.objects[mesh.name].roomIndex = roomIndex;
                    this.matMgr.setUniformsFromRoom(mesh, roomIndex);
                }
            }
        }
    },

    replaceSkinIndices : function(mesh, remap) {
        const skinIndices = mesh.geometry.attributes.skinIndex.array;
        for (let i = 0; i < skinIndices.length; ++i) {
            const v = remap[skinIndices[i]];
            if (v !== undefined) {
                skinIndices[i] = v;
            }
        }
    },

    copyFacesWithSkinIndex : function(mesh, skinidx, newskinidx) {
        const geometry = mesh.geometry,
              index = Array.from(geometry.index.array),
              positions = Array.from(geometry.attributes.position.array),
              normals = Array.from(geometry.attributes.normal.array),
              skinIndices = Array.from(geometry.attributes.skinIndex.array),
              skinWeights = Array.from(geometry.attributes.skinWeight.array),
              uvs = Array.from(geometry.attributes.uv.array),
              _flags = Array.from(geometry.attributes._flags.array);
        
        const addIndex = [];

        for (let i = 0; i < index.length/3; ++i) {
            const posIdx1 = index[i * 3 + 0], posIdx2 = index[i * 3 + 1], posIdx3 = index[i * 3 + 2];
            if (skinIndices[posIdx1 * 4 + 0] == skinidx && skinIndices[posIdx1 * 4 + 1] == skinidx) {
                // we assume that the 2 other vertices of the face have also skinidx has skin index
                const nposIdx = positions.length/3;

                addIndex.push(nposIdx, nposIdx + 1, nposIdx + 2);

                positions.push(positions[posIdx1 * 3 + 0], positions[posIdx1 * 3 + 1], positions[posIdx1 * 3 + 2]);
                positions.push(positions[posIdx2 * 3 + 0], positions[posIdx2 * 3 + 1], positions[posIdx2 * 3 + 2]);
                positions.push(positions[posIdx3 * 3 + 0], positions[posIdx3 * 3 + 1], positions[posIdx3 * 3 + 2]);

                normals.push(normals[posIdx1 * 3 + 0], normals[posIdx1 * 3 + 1], normals[posIdx1 * 3 + 2]);
                normals.push(normals[posIdx2 * 3 + 0], normals[posIdx2 * 3 + 1], normals[posIdx2 * 3 + 2]);
                normals.push(normals[posIdx3 * 3 + 0], normals[posIdx3 * 3 + 1], normals[posIdx3 * 3 + 2]);

                skinIndices.push(newskinidx, newskinidx, 0, 0);
                skinIndices.push(newskinidx, newskinidx, 0, 0);
                skinIndices.push(newskinidx, newskinidx, 0, 0);

                skinWeights.push(skinWeights[posIdx1 * 4 + 0], skinWeights[posIdx1 * 4 + 1], skinWeights[posIdx1 * 4 + 2], skinWeights[posIdx1 * 4 + 3]);
                skinWeights.push(skinWeights[posIdx2 * 4 + 0], skinWeights[posIdx2 * 4 + 1], skinWeights[posIdx2 * 4 + 2], skinWeights[posIdx2 * 4 + 3]);
                skinWeights.push(skinWeights[posIdx3 * 4 + 0], skinWeights[posIdx3 * 4 + 1], skinWeights[posIdx3 * 4 + 2], skinWeights[posIdx3 * 4 + 3]);

                uvs.push(uvs[posIdx1 * 2 + 0], uvs[posIdx1 * 2 + 1]);
                uvs.push(uvs[posIdx2 * 2 + 0], uvs[posIdx2 * 2 + 1]);
                uvs.push(uvs[posIdx3 * 2 + 0], uvs[posIdx3 * 2 + 1]);

                _flags.push(_flags[posIdx1 * 4 + 0], _flags[posIdx1 * 4 + 1], _flags[posIdx1 * 4 + 2], _flags[posIdx1 * 4 + 3]);
                _flags.push(_flags[posIdx2 * 4 + 0], _flags[posIdx2 * 4 + 1], _flags[posIdx2 * 4 + 2], _flags[posIdx2 * 4 + 3]);
                _flags.push(_flags[posIdx3 * 4 + 0], _flags[posIdx3 * 4 + 1], _flags[posIdx3 * 4 + 2], _flags[posIdx3 * 4 + 3]);
            }
        }

        index.push(...addIndex);

        geometry.setIndex(index);

        geometry.groups[0].count = geometry.index.count; // assume there is a single group

        geometry.attributes.position.array = new Float32Array(positions);
        geometry.attributes.position.needsUpdate = true;

        geometry.attributes.normal.array = new Float32Array(normals);
        geometry.attributes.normal.needsUpdate = true;

        geometry.attributes.skinIndex.array = new Float32Array(skinIndices);
        geometry.attributes.skinIndex.needsUpdate = true;

        geometry.attributes.skinWeight.array = new Float32Array(skinWeights);
        geometry.attributes.skinWeight.needsUpdate = true;

        geometry.attributes.uv.array = new Float32Array(uvs);
        geometry.attributes.uv.needsUpdate = true;

        geometry.attributes._flags.array = new Float32Array(_flags);
        geometry.attributes._flags.needsUpdate = true;
    },

    makeSkinIndicesList : function(geometry) {
        const list = [],
              skinIndices = geometry.attributes.skinIndex.array,
              index = geometry.index;

        for (let i = 0; i < index.count/3; ++i) {
            const skinIndex = skinIndices[index.array[i*3+0]*4+0];
            
            let lst = list[skinIndex];
            if (!lst) {
                lst = [];
                list[skinIndex] = lst;
            }
            lst.push(index.array[i*3+0], index.array[i*3+1], index.array[i*3+2]);
        }

        geometry.userData.skinIndices = list;
    },

    _setSkeleton : function(mesh, skeleton) {
        for (let m = 0; m < mesh.material.length; ++m) {
            const material = mesh.material[m];
            
            material.uniforms.boneMatrices.value = skeleton.getBoneMatrices();
        }

        this.sceneData.objects[mesh.name].skeleton = skeleton;
    },

}
