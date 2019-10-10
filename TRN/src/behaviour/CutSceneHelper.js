Object.assign( TRN.Behaviours.CutScene.prototype, {

    prepareLevel : function(trVersion, levelName, csIndex, actorMoveables) {
        if (trVersion == 'TR2') {
            if (levelName == 'cut3.tr2') {
                // bad guys are not at the right location
                const black = this.objMgr.objectList['moveable']['98'][0],
                      red = this.objMgr.objectList['moveable']['97'][0];

                black.quaternion.set(0, 1, 0, 0); // 180 deg rotation
                black.position.set(16900, -5632, -7680);

                red.position.set(20000, -5632, -10700);
            }
        }

        switch(csIndex) {
            case 1: {
                // Handle the shovel / Make a hole in the ground / Add a fade-in/out between animation #1 and #2 (so that we don't see the hole pop...)
                const lara = actorMoveables[0],
                      data = this.sceneData.objects[lara.name],
                      track1 = this.sceneData.animTracks[this.sceneData.objects[lara.name].animationStartIndex],
                      track2 = this.sceneData.animTracks[this.sceneData.objects[lara.name].animationStartIndex + 1];
                
                const meshShovel = this.objMgr.createMoveable(417, data.roomIndex, undefined, true, data.skeleton);

                data.layer.setMesh(TRN.Layer.LAYER.MESHSWAP, meshShovel, 0);

                track1.setCommands([
                    { cmd:TRN.Animation.Commands.ANIMCMD_MISCACTIONONFRAME , params: [24,   TRN.Animation.Commands.Misc.ANIMCMD_MISC_CUSTOMFUNCTION, () => data.layer.updateMask(TRN.Layer.LAYER.MESHSWAP, TRN.Layer.MASK.ARM_L3)] },
                    { cmd:TRN.Animation.Commands.ANIMCMD_MISCACTIONONFRAME , params: [230, TRN.Animation.Commands.Misc.ANIMCMD_MISC_CUSTOMFUNCTION, () => this.fadeOut(1.0)] }
                ], 0);

                track2.setCommands([
                    { cmd:TRN.Animation.Commands.ANIMCMD_MISCACTIONONFRAME , params: [27,  TRN.Animation.Commands.Misc.ANIMCMD_MISC_CUSTOMFUNCTION, this.cs1MakeHole.bind(this)] },
                    { cmd:TRN.Animation.Commands.ANIMCMD_MISCACTIONONFRAME , params: [30,  TRN.Animation.Commands.Misc.ANIMCMD_MISC_CUSTOMFUNCTION, () => this.fadeIn(1.0)] },
                    { cmd:TRN.Animation.Commands.ANIMCMD_MISCACTIONONFRAME , params: [147, TRN.Animation.Commands.Misc.ANIMCMD_MISC_CUSTOMFUNCTION, () => data.layer.updateMask(TRN.Layer.LAYER.MESHSWAP, TRN.Layer.MASK.ARM_L3)] }
                ], 0);

                break;
            }

            case 2: {
                // Handle the shovel
                const lara = actorMoveables[0],
                      data = this.sceneData.objects[lara.name],
                      track1 = this.sceneData.animTracks[this.sceneData.objects[lara.name].animationStartIndex];
                
                const meshShovel = this.objMgr.createMoveable(417, data.roomIndex, undefined, true, data.skeleton);

                data.layer.setMesh(TRN.Layer.LAYER.MESHSWAP, meshShovel, 0);

                track1.setCommands([
                    { cmd:TRN.Animation.Commands.ANIMCMD_MISCACTIONONFRAME , params: [0,   TRN.Animation.Commands.Misc.ANIMCMD_MISC_CUSTOMFUNCTION, () => data.layer.updateMask(TRN.Layer.LAYER.MESHSWAP, TRN.Layer.MASK.ARM_L3)] },
                    { cmd:TRN.Animation.Commands.ANIMCMD_MISCACTIONONFRAME , params: [147, TRN.Animation.Commands.Misc.ANIMCMD_MISC_CUSTOMFUNCTION, () => data.layer.updateMask(TRN.Layer.LAYER.MESHSWAP, TRN.Layer.MASK.ARM_L3)] }
                ], 0);

                break;
            }

            case 4: {
                // Handle the pistols visibility during the fight with the scorpion
                const lara = actorMoveables[0],
                      track1 = this.sceneData.animTracks[this.sceneData.objects[lara.name].animationStartIndex];

                track1.setCommands([
                    { cmd:TRN.Animation.Commands.ANIMCMD_MISCACTIONONFRAME , params: [0,   TRN.Animation.Commands.Misc.ANIMCMD_MISC_GETLEFTGUN] },
                    { cmd:TRN.Animation.Commands.ANIMCMD_MISCACTIONONFRAME , params: [0,   TRN.Animation.Commands.Misc.ANIMCMD_MISC_GETRIGHTGUN] },
                    { cmd:TRN.Animation.Commands.ANIMCMD_MISCACTIONONFRAME , params: [320,   TRN.Animation.Commands.Misc.ANIMCMD_MISC_GETLEFTGUN] },
                    { cmd:TRN.Animation.Commands.ANIMCMD_MISCACTIONONFRAME , params: [320,   TRN.Animation.Commands.Misc.ANIMCMD_MISC_GETRIGHTGUN] }
                ], 0);

                break;
            }

            case 7:
            case 8:
            case 9: {
                // Add volumetric fog in the rooms / objects
                const rooms  = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 110, 111, 112, 113, 114, 115, 116, 117, 122, 123]),
                      shader = this.shdMgr.getFragmentShader("volumetric_fog");

                this.scene.traverse( (obj) => {
                    const data = this.sceneData.objects[obj.name];

                    if (data && rooms.has(data.roomIndex) || actorMoveables.indexOf(obj) >= 0) {
                        const materials = obj.material;
                        for (let m = 0; m < materials.length; ++m) {
                            const material = materials[m];

                            material.fragmentShader = shader;
                            material.uniforms.volFogCenter = { "type": "f3", "value": [52500.0, 3140.0, -49460.0] };
                            material.uniforms.volFogRadius = { "type": "f",  "value": 6000 };
                            material.uniforms.volFogColor =  { "type": "f3", "value": [0.1, 0.75, 0.3] };
                        }
                    }
                });

                break;
            }

            case 10: {
                // Scroll that Lara is reading is not well positionned at start - move and rotate it
                const oscroll = this.objMgr.objectList['staticmesh']['20'][2],
                      q = glMatrix.quat.create();

                glMatrix.quat.setAxisAngle(q, [0,1,0], glMatrix.glMatrix.toRadian(60));

                oscroll.quaternion.set(q[0], q[1], q[2], q[3]);
                oscroll.position.x += 850;

                oscroll.updateMatrix();
                break;
            }

            case 15: {
                /*const uniforms = [];
                for (let a = 0; a < actorMoveables.length; ++a) {
                    const obj = actorMoveables[a];
                    for (let i = 0; i < obj.material.length; ++i) {
                        const material = obj.material[i];
                        uniforms.push({ a:material.uniforms.tintColor.value, i:0 });
                    }
                }
                this.bhvMgr.addBehaviour('FadeUniformColor', 
                    { 
                        "colorStart":   [1,1,1], 
                        "colorEnd":     [3.5,3.5,3.5], 
                        "duration":     3.0,
                        "uniforms":     uniforms
                    });*/
                break;
            }

            case 21: {
                // Handle the pole
                const lara = actorMoveables[0],
                      data = this.sceneData.objects[lara.name],
                      track1 = this.sceneData.animTracks[this.sceneData.objects[lara.name].animationStartIndex];
                
                const meshPole = this.objMgr.createMoveable(417, data.roomIndex, undefined, true, data.skeleton);

                data.layer.setMesh(TRN.Layer.LAYER.MESHSWAP, meshPole, 0);

                track1.setCommands([
                    { cmd:TRN.Animation.Commands.ANIMCMD_MISCACTIONONFRAME , params: [0,   TRN.Animation.Commands.Misc.ANIMCMD_MISC_CUSTOMFUNCTION, () => data.layer.updateMask(TRN.Layer.LAYER.MESHSWAP, TRN.Layer.MASK.ARM_R3)] },
                    { cmd:TRN.Animation.Commands.ANIMCMD_MISCACTIONONFRAME , params: [560, TRN.Animation.Commands.Misc.ANIMCMD_MISC_CUSTOMFUNCTION, () => data.layer.updateMask(TRN.Layer.LAYER.MESHSWAP, TRN.Layer.MASK.ARM_R3)] }
                ], 0);

                break;
            }

            case 24: {
                // Handle the pistols visibility during the dialog with the wounded guy
                const lara = actorMoveables[0],
                      track1 = this.sceneData.animTracks[this.sceneData.objects[lara.name].animationStartIndex];

                track1.setCommands([
                    { cmd:TRN.Animation.Commands.ANIMCMD_MISCACTIONONFRAME , params: [0,   TRN.Animation.Commands.Misc.ANIMCMD_MISC_GETLEFTGUN] },
                    { cmd:TRN.Animation.Commands.ANIMCMD_MISCACTIONONFRAME , params: [0,   TRN.Animation.Commands.Misc.ANIMCMD_MISC_GETRIGHTGUN] },
                    { cmd:TRN.Animation.Commands.ANIMCMD_MISCACTIONONFRAME , params: [552,   TRN.Animation.Commands.Misc.ANIMCMD_MISC_GETLEFTGUN] },
                    { cmd:TRN.Animation.Commands.ANIMCMD_MISCACTIONONFRAME , params: [552,   TRN.Animation.Commands.Misc.ANIMCMD_MISC_GETRIGHTGUN] }
                ], 0);

                break;
            }
        }
    },

    fadeOut : function(duration) {
        this.bhvMgr.addBehaviour('Fade', { "colorStart": [1, 1, 1], "colorEnd": [0, 0, 0], "duration": duration });
    },

    fadeIn : function(duration) {
        this.bhvMgr.addBehaviour('Fade', { "colorStart": [0, 0, 0], "colorEnd": [1, 1, 1], "duration": duration });
    },

    // Between cutscene 1 and 2, a hole should appear in the ground to reveal hidden entrance to pyramid
    cs1MakeHole : function() {
        return;
        let oroom = this.objMgr.objectList['room']['81'];
        if (oroom.__done) {
            return;
        }

        let geom = oroom.geometry;
        let faces = [], facesuv = [], 
            remove = new Set([ 
                geom.faces.length-3,
                geom.faces.length-5,
                geom.faces.length-6,
                geom.faces.length-8
            ]);

        /*const vertices = geom.vertices;

        const f = geom.faces[geom.faces.length-3];
        const v = vertices[f.c];
        const nv = new THREE.Vector3(v.x, v.y-256, v.z);

        vertices.push(nv);

        const nf = new THREE.Face3();
        nf.a = f.a;
        nf.b = f.b;
        nf.c = vertices.length-1;
        nf.materialIndex = 0;
        nf.normal = new THREE.Vector3(0,1,0);
        nf.vertexColors = [
            new THREE.Color(0xffffff),
            new THREE.Color(0xffffff),
            new THREE.Color(0xffffff)
        ];
        nf.vertexNormals = [
            new THREE.Vector3(0,1,0),
            new THREE.Vector3(0,1,0),
            new THREE.Vector3(0,1,0)
        ];

        const nfuv = [
            [0,0], [0,1], [1,1]
        ];*/

        for (let i = 0; i < geom.faces.length; ++i) {
            if (!remove.has(i)) {
                faces.push(geom.faces[i]);
                facesuv.push(geom.faceVertexUvs[0][i]);
            }
        }

        geom.faces = faces;
        geom.faceVertexUvs[0] = facesuv;

        //geom.faces.push(nf);
        //geom.faceVertexUvs[0].push(nfuv);

        geom.dispose();
        delete oroom.__webglInit;
        updateWebGLObjects = true;
        oroom.__done = true;

        oroom = this.objMgr.objectList['room']['80'];
        geom = oroom.geometry;
        faces = [];
        facesuv = [];
        remove = new Set([ 
            57, 58, 59, 60
        ]);

        for (let i = 0; i < geom.faces.length; ++i) {
            if (!remove.has(i)) {
                faces.push(geom.faces[i]);
                facesuv.push(geom.faceVertexUvs[0][i]);
            }
        }

        geom.faces = faces;
        geom.faceVertexUvs[0] = facesuv;

        geom.dispose();
        delete oroom.__webglInit;
        updateWebGLObjects = true;
        oroom.__done = true;
    }

});
