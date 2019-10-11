TRN.MasterLoader = {

	/* trlevel is either:
	 	* a string which is the name of the level to download. On the web site, the level file is in JSON format as outputted by TRN.SceneConverter (so no need to call it again on client side)
	 	* a JSON object like { data:XXX, name:YYY } where data are the binary data of the TR level and YYY the filename
	 */	
	loadLevel : function (trlevel, progressbar, callbackLevelLoaded) {
		
		var this_ = this;

		progressbar.show();

		if (typeof(trlevel) != 'string') {

			var rs = TRN.Loader.loadRawLevel(trlevel.data, trlevel.name);

			if (trlevel.noConversion) {
				callbackLevelLoaded(rs.json);
				return;
			}

			var converter = new TRN.SceneConverter();

			converter.convert(rs.json, this._parseLevel.bind(this, trlevel, progressbar, callbackLevelLoaded));

		} else {

		    var request = new XMLHttpRequest();

		    request.open("GET", trlevel, true);
		    request.responseType = "arraybuffer";

		    request.onerror = function() {
		        console.log('Read level: XHR error', request.status, request.statusText);
		    }

		    request.onprogress = function(e) {
		    	if (e.lengthComputable) {
		    		var pct = 0;

					if ( e.total )
						pct = e.loaded / e.total;

		    		progressbar.progress(pct);

		    	}
		    }

		    request.onreadystatechange = function() {
		        if (request.readyState != 4) return;

		        if (request.status != 200) {
			   		console.log('Could not read the level', trlevel, request.status, request.statusText);
		        } else {
		        	progressbar.progress(1);
                    var rs = TRN.Loader.loadRawLevel(request.response, trlevel);
                    var converter = new TRN.SceneConverter();
                    converter.convert(rs.json, this_._parseLevel.bind(this_, trlevel, progressbar, callbackLevelLoaded));
                    return;
		        }
		    }

			request.send();

		}

	},

	/*
		Make ThreeJS parse sceneJSON into its own internal scene representation
	*/
	_parseLevel : function (trlevel, progressbar, callbackLevelLoaded, sceneJSON) {

		var this_ = this;

		var loader = new THREE.ObjectLoader();

		loader.callbackProgress = function (progress, result) {

			var	pct = 0,
				total = progress.totalModels + progress.totalTextures,
				loaded = progress.loadedModels + progress.loadedTextures;

			if (total)
				pct = loaded / total;

			progressbar.progress(pct);

		};

		loader.parse(sceneJSON, function(scene) {

            console.log(sceneJSON)
            console.log(scene);

		    window.setTimeout(function() {

		    	progressbar.setMessage('Processing...');

			    window.setTimeout(function() {

					this_._postProcessLevel(progressbar, callbackLevelLoaded, sceneJSON, scene);

				}, 100);

			}, 100);

		}, '');

	},

	/*
		Called when ThreeJS has finished parsing the JSON scene.
		We now make additional setup in the scene created by ThreeJS
	*/
	_postProcessLevel : function (progressbar, callbackLevelLoaded, sceneJSON, scene) {
		var sceneData = sceneJSON.data, sceneRender = scene;

        sceneData.textures = sceneRender.__textures;

        // Set all objects as auto update=false
        // Camera, skies, animated objects will have their matrixAutoUpdate set to true later
		sceneRender.traverse( (obj) => {
            obj.updateMatrix();
            obj.matrixAutoUpdate = false;
		});

		// create the material for each mesh and set the loaded texture in the ShaderMaterial materials
        var objToRemoveFromScene = [];

        sceneRender.traverse( (obj) => {
            var data = sceneData.objects[obj.name];

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

			var materials = obj.material;

			if (!materials || !materials.length) {
                return;
            }

			for (var i = 0; i < materials.length; ++i) {
				var material = materials[i];

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
