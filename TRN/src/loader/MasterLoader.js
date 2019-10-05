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

			var isZip = trlevel.indexOf('.zip') >= 0;
			var isBin = trlevel.indexOf('.') >= 0 && !isZip; // we assume that if the file has no extension, it is a JSON converted level, else it is either a zip of a JSON (see line above) or an original binary level

		    var request = new XMLHttpRequest();

		    request.open("GET", trlevel, true);
		    request.responseType = isZip || isBin ? "arraybuffer" : "text";

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
		        	var sc;
		        	if (isZip) {
			        	console.log('Level', trlevel, 'loaded. Unzipping...');
			    		var zip = new JSZip();
			    		zip.load(request.response);
			    		var f = zip.file('level');
			    		sc = JSON.parse(f.asText());
			    		console.log('Level unzipped.');
			    	} else if (isBin) {
						var rs = TRN.Loader.loadRawLevel(request.response, trlevel);
						var converter = new TRN.SceneConverter();
						converter.convert(rs.json, this_._parseLevel.bind(this_, trlevel, progressbar, callbackLevelLoaded));
						return;
			    	} else {
			    		sc = JSON.parse(request.response);
			    	}
		    		this_._parseLevel(trlevel, progressbar, callbackLevelLoaded, sc);
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

		var loader = new THREE.SceneLoader();

		loader.callbackProgress = function (progress, result) {

			var	pct = 0,
				total = progress.totalModels + progress.totalTextures,
				loaded = progress.loadedModels + progress.loadedTextures;

			if (total)
				pct = loaded / total;

			progressbar.progress(pct);

		};

		loader.parse(sceneJSON, function(scene) {

		    window.setTimeout(function() {

		    	progressbar.setMessage('Processing...');

			    window.setTimeout(function() {

			    	var oscene = new TRN.Scene(sceneJSON, scene);
			    	if (trlevel.noPostProcess) {
			    		callbackLevelLoaded(oscene);
			    	} else {
						this_._postProcessLevel(progressbar, callbackLevelLoaded, oscene);
			    	}

				}, 100);

			}, 100);

		}, '');

	},

	/*
		Called when ThreeJS has finished parsing the JSON scene.
		We now make additional setup in the scene created by ThreeJS
	*/
	_postProcessLevel : function (progressbar, callbackLevelLoaded, oscene) {
		var sceneData = oscene.sceneJSON.data, sceneRender = oscene.scene.scene;
		var shaderMgr = new TRN.ShaderMgr();

        sceneData.textures = oscene.scene.textures;

        // Set all objects as auto update=false
        // Camera, skies, animated objects will have their matrixAutoUpdate set to true later
		sceneRender.traverse( (obj) => {
            obj.updateMatrix();
            obj.matrixAutoUpdate = false;
		});

        // don't flip Y coordinates in textures
		for (var texture in sceneData.textures) {

			if (!sceneData.textures.hasOwnProperty(texture)) continue;

			sceneData.textures[texture].flipY = false;
		}

		// create the material for each mesh and set the loaded texture in the ShaderMaterial materials
        var objToRemoveFromScene = [];

        sceneRender.traverse( (obj) => {
            var data = sceneData.objects[obj.name];

            if (data) {
                if (data.type == 'moveable' && data.roomIndex < 0) {
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

			if (!data.has_anims) {
				obj.geometry.computeBoundingBox();
				obj.geometry.boundingBox.getBoundingSphere(obj.geometry.boundingSphere);
			}

			if (data.type == "room") {
				var portals = data.portals, meshPortals = [];
				data.meshPortals = meshPortals;
				for (var p = 0; p < portals.length; ++p) {
					var portal = portals[p], geom = new THREE.Geometry();
					geom.vertices.push(
						new THREE.Vector3(portal.vertices[0].x, portal.vertices[0].y, portal.vertices[0].z),
						new THREE.Vector3(portal.vertices[1].x, portal.vertices[1].y, portal.vertices[1].z),
						new THREE.Vector3(portal.vertices[2].x, portal.vertices[2].y, portal.vertices[2].z),
						new THREE.Vector3(portal.vertices[3].x, portal.vertices[3].y, portal.vertices[3].z)
					);
					geom.colors.push(
						new THREE.Color(0xff0000),
						new THREE.Color(0x00ff00),
						new THREE.Color(0x0000ff),
						new THREE.Color(0xffffff)
					);
					geom.faces.push(new THREE.Face3(0, 1, 2, undefined, [geom.colors[0], geom.colors[1], geom.colors[2]]));
					geom.faces.push(new THREE.Face3(0, 2, 3, undefined, [geom.colors[0], geom.colors[2], geom.colors[3]]));
					var mesh = new THREE.Mesh(geom, new THREE.ShaderMaterial( {
						uniforms: {
						},
						vertexShader: shaderMgr.getVertexShader('portal'),
						fragmentShader: shaderMgr.getFragmentShader('portal'),
						depthTest: true,
						depthWrite: false,
						fog: false,
						vertexColors: THREE.VertexColors,
						transparent: true
					}));
					mesh.name = obj.name + '_portal' + p;
					mesh.position.x = mesh.position.y = mesh.position.z = 0;
					mesh.updateMatrix();
					mesh.matrixAutoUpdate = false;
					mesh.visible = false;
					meshPortals.push(mesh);
					sceneRender.add(mesh);
				}
			}

			obj.frustumCulled = true;

			var material = new THREE.MeshFaceMaterial();

			var attributes = data.attributes;

			if (attributes) {
				attributes._flags.needsUpdate = true;
			}

			for (var mt_ = 0; mt_ < obj.material.length; ++mt_) {
                var elem = obj.material[mt_];
                
                material.materials[mt_] = oscene.scene.materials[elem.material].clone();
                material.materials[mt_].uniforms = jQuery.extend(true, {}, elem.uniforms);
                material.materials[mt_].attributes = attributes;

				for (var mkey in elem) {
					if (!elem.hasOwnProperty(mkey) || mkey == 'uniforms' || mkey == 'attributes') continue;
					material.materials[mt_][mkey] = elem[mkey];
				}
			}

            obj.material = material;
            
			var materials = material.materials;

			if (!materials || !materials.length) {
                return;
            }

			for (var i = 0; i < materials.length; ++i) {
				var material = materials[i];

				if (material.uniforms.map && typeof(material.uniforms.map.value) == 'string' && material.uniforms.map.value) {
					material.uniforms.map.value = sceneData.textures['texture' + material.uniforms.map.value];
				}
				if (material.uniforms.mapBump && typeof(material.uniforms.mapBump.value) == 'string' && material.uniforms.mapBump.value) {
					material.uniforms.mapBump.value = sceneData.textures['texture' + material.uniforms.mapBump.value];
				}

				if (material.hasAlpha) {
					material.transparent = true;
					material.blending = THREE.AdditiveBlending;
					material.blendSrc = THREE.OneFactor;
					material.blendDst = THREE.OneMinusSrcColorFactor;
					material.depthWrite = false;
				}
			}
		});

        objToRemoveFromScene.forEach( (obj) => sceneRender.remove(obj) );

		callbackLevelLoaded(oscene);
    }
    
}
