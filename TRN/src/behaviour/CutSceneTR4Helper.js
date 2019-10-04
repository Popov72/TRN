Object.assign( TRN.Behaviours.CutScene.prototype, {

    prepareLevel : function(csIndex, actorMoveables) {
        switch(csIndex) {
            case 9: {
                // Add volumetric fog in the rooms / objects
                const rooms  = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8]),
                      shader = new TRN.ShaderMgr().getFragmentShader("volumetric_fog");

                this.scene.traverse( (obj) => {
                    const data = this.sceneData.objects[obj.name];

                    if (data && rooms.has(data.roomIndex) || actorMoveables.indexOf(obj) >= 0) {
                        const materials = obj.material.materials;
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
                const scroll = 'room22_staticmesh3', 
                    oscroll = this.scene.getObjectByName(scroll);
                    q = glMatrix.quat.create();

                glMatrix.quat.setAxisAngle(q, [0,1,0], glMatrix.glMatrix.toRadian(60));

                oscroll.quaternion.set(q[0], q[1], q[2], q[3]);
                oscroll.position.x += 850;

                oscroll.updateMatrix();
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

        this.gameData.needWebGLInit = true;
    }

});
