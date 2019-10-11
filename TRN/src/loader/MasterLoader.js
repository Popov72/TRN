TRN.MasterLoader = {

	/* trlevel is either:
	 	* a string which is the name of the level to download.
	 	* a JSON object like { data:XXX, name:YYY } where data are the binary data of the TR level and YYY the filename
	 */	
	loadLevel : async function (trlevel, progressbar, callbackLevelLoaded) {
		progressbar.show();

		if (typeof(trlevel) != 'string') {
			const rs = TRN.Loader.loadRawLevel(trlevel.data, trlevel.name);

			if (trlevel.noConversion) {
				callbackLevelLoaded(rs.json);
				return;
			}

			const converter = new TRN.SceneConverter();

			converter.convert(rs.json, this._parseLevel.bind(this, trlevel, progressbar, callbackLevelLoaded));

		} else {
            const blob = await (await fetch(trlevel)).arrayBuffer();

            const rs = TRN.Loader.loadRawLevel(blob, trlevel),
                  converter = new TRN.SceneConverter();

            converter.convert(rs.json, this._parseLevel.bind(this, trlevel, progressbar, callbackLevelLoaded));
        }
	},

	/*
		Make ThreeJS parse sceneJSON into its own internal scene representation
	*/
	_parseLevel : function (trlevel, progressbar, callbackLevelLoaded, sceneJSON) {
		const loader = new THREE.ObjectLoader();

		loader.parse(sceneJSON, (scene) => {
            progressbar.setMessage('Processing...');
            window.setTimeout( () => this._postProcessLevel(progressbar, callbackLevelLoaded, sceneJSON, scene), 0);
		});
	},

	/*
		Called when ThreeJS has finished parsing the JSON scene.
		We now make additional setup in the scene created by ThreeJS
	*/
	_postProcessLevel : function (progressbar, callbackLevelLoaded, sceneJSON, scene) {
		const sceneData = sceneJSON.data, sceneRender = scene;

        sceneData.textures = sceneRender.__textures;

        // Set all objects as auto update=false
        // Camera, skies, animated objects will have their matrixAutoUpdate set to true later
		sceneRender.traverse( (obj) => {
            obj.updateMatrix();
            obj.matrixAutoUpdate = false;
		});

		// create the material for each mesh and set the loaded texture in the ShaderMaterial materials
        const objToRemoveFromScene = [];

        sceneRender.traverse( (obj) => {
            const data = sceneData.objects[obj.name];

            if (data) {
                if ((data.type == 'moveable' || data.type == 'spriteseq' || data.type == 'sprite' || data.type == 'staticmesh') && data.roomIndex < 0) {
                    data.liveObj = obj;
                    objToRemoveFromScene.push(obj);
                }

                if (data.visible == undefined) {
                    console.log('Object has no visible property!', obj);
                }

                obj.visible = data.visible;
            }

			if (!(obj instanceof THREE.Mesh)) {
                return;
            }

            obj.geometry.computeBoundingBox();
            obj.geometry.computeBoundingSphere();

			obj.frustumCulled = true;

			const materials = obj.material;

			if (!materials || !materials.length) {
                return;
            }

			for (let i = 0; i < materials.length; ++i) {
				const material = materials[i];

				if (material.transparent) {
					material.blending = THREE.AdditiveBlending;
					material.blendSrc = THREE.OneFactor;
					material.blendDst = THREE.OneMinusSrcColorFactor;
					material.depthWrite = false;
				}
			}
		});

        objToRemoveFromScene.forEach( (obj) => sceneRender.remove(obj) );

		callbackLevelLoaded(sceneJSON, scene);
    }
}
