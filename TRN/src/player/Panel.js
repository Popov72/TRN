TRN.Panel = function(domElement, parent) {
	
	var html;

	this.parent = parent;

	jQuery.ajax({
		type: "GET",
		url: 'TRN/resource/panel.html',
		dataType: "html",
		cache: false,
		async: false
	}).done(function(data) { html = data; });

	this.elem = jQuery(html);

	this.elem.appendTo(this.domElement ? this.domElement : document.body);

	this.bindEvents();
}

TRN.Panel.prototype = {

	constructor : TRN.Panel,

	show : function() {

		this.elem.css('display', 'block');

	},

	hide : function() {

		this.elem.css('display', 'none');

	},

	showInfo : function() {
		var sceneJSON = this.parent.sceneJSON, camera = this.parent.camera, renderer = this.parent.renderer;

		var numObj = this.parent.scene.scene.__objects.length;

		this.elem.find('#currentroom').html(sceneJSON.curRoom);
		this.elem.find('#numlights').html(sceneJSON.curRoom != -1 ? (this.parent.useAdditionalLights ? sceneJSON.objects['room'+sceneJSON.curRoom].lightsExt.length : sceneJSON.objects['room'+sceneJSON.curRoom].lights.length) : '');
		this.elem.find('#camerapos').html(camera.position.x.toFixed(5)+','+camera.position.y.toFixed(5)+','+camera.position.z.toFixed(5));
		this.elem.find('#camerarot').html(camera.quaternion.x.toFixed(5)+','+camera.quaternion.y.toFixed(5)+','+camera.quaternion.z.toFixed(5)+','+camera.quaternion.w.toFixed(5));
		this.elem.find('#renderinfo').html(renderer.info.render.calls + ' / ' + renderer.info.render.vertices + ' / ' + renderer.info.render.faces + ' / ' + numObj);
		this.elem.find('#memoryinfo').html(renderer.info.memory.geometries + ' / ' + renderer.info.memory.programs + ' / ' + renderer.info.memory.textures);
	},

    updateFromParent : function() {

        this.elem.find('#singleroommode').prop('checked', this.parent.singleRoomMode);
        this.elem.find('#useaddlights').prop('checked', this.parent.useAdditionalLights);

    },

	bindEvents : function() {

		var this_ = this;

		this.elem.find('#singleroommode').on('click', function() {
            this_.parent.singleRoomMode = this.checked;
		});

		this.elem.find('#wireframemode').on('click', function() {
			var scene = this_.parent.scene;
			for (var objID in scene.objects) {
				var obj = scene.objects[objID];

                if (!(obj instanceof THREE.Mesh)) continue;

				var materials = obj.material.materials;
				if (!materials || !materials.length) continue;

				for (var i = 0; i < materials.length; ++i) {
					var material = materials[i];
					material.wireframe = this.checked;
				}
			}
		});

		this.elem.find('#usefog').on('click', function() {
			var scene = this_.parent.scene;
			for (var objID in scene.objects) {
				var obj = scene.objects[objID];

                if (!(obj instanceof THREE.Mesh)) continue;
                
				var materials = obj.material ? obj.material.materials : null;
				if (!materials || !materials.length) continue;

				for (var i = 0; i < materials.length; ++i) {
                    var material = materials[i];
                    if (material.uniforms && material.uniforms.useFog) material.uniforms.useFog.value = this.checked ? 1 : 0;
				}
			}
		});

		this.elem.find('#nolights').on('click', function() {
            var scene = this_.parent.scene;
            var white = [1, 1, 1];
			for (var objID in scene.objects) {
				var obj = scene.objects[objID];

                if (!(obj instanceof THREE.Mesh)) continue;

				var materials = obj.material ? obj.material.materials : null;
				if (!materials || !materials.length) continue;

				for (var i = 0; i < materials.length; ++i) {
                    var material = materials[i];
                    if (!material.uniforms || material.uniforms.numPointLight === undefined) continue;
                    if (material.__savenum === undefined) {
                        material.__savenum = material.uniforms.numPointLight.value;
                        material.__saveambient = material.uniforms.ambientColor.value;
                    }
                    material.uniforms.numPointLight.value = this.checked ? 0 : material.__savenum;
                    material.uniforms.ambientColor.value = this.checked ? white : material.__saveambient;
				}
			}
		});

		this.elem.find('#showboundingboxes').on('click', function() {
			var scene = this_.parent.scene, sceneJSON = this_.parent.sceneJSON;
			for (var objID in scene.objects) {
				var obj = scene.objects[objID];
				var objJSON = sceneJSON.objects[objID];

				if (!(obj instanceof THREE.Mesh)) continue;

				if (this.checked) {
					obj.boxHelper = new THREE.BoxHelper();
					obj.boxHelper.update(obj);
					scene.scene.add(obj.boxHelper);
				} else {
					scene.scene.remove(obj.boxHelper);
					delete obj.boxHelper;
				}
			}
			this_.parent.needWebGLInit = true;
		});

		this.elem.find('#showportals').on('click', function() {
			var scene = this_.parent.scene, sceneJSON = this_.parent.sceneJSON;
			for (var objID in scene.objects) {
				var obj = scene.objects[objID];
				var objJSON = sceneJSON.objects[objID];
				var portals = objJSON.meshPortals;

				if (!portals) continue;

				for (var i = 0; i < portals.length; ++i)
					portals[i].visible = this.checked;
			}
		});

		this.elem.find('#fullscreen').on('click', function() {
			if (document.fullscreenElement != null) {
				if (document.exitFullscreen) 
					document.exitFullscreen();
			} else if (document.body.requestFullscreen) {
				document.body.requestFullscreen();
			}
		});

		this.elem.find('#useqwerty').on('click', function() {
			var bc = this_.parent.controls;
			if (this.checked) {
				bc.states[87] = {state:bc.STATES.FORWARD, on:false}; // W
				bc.states[65] = {state:bc.STATES.LEFT,    on:false}; // A
				delete bc.states[90]; // Z
				delete bc.states[81]; // Q
			} else {
				bc.states[90] = {state:bc.STATES.FORWARD, on:false}; // W
				bc.states[81] = {state:bc.STATES.LEFT,    on:false}; // A
				delete bc.states[87]; // W
				delete bc.states[65]; // A
			}
		});

		this.elem.find('#noobjecttexture').on('click', function() {
			var shaderMgr = new TRN.ShaderMgr();
			var scene = this_.parent.scene;
			var shader = shaderMgr.getFragmentShader('uniformcolor');
			for (var objID in scene.objects) {
                var obj = scene.objects[objID];
                
				if (!(obj instanceof THREE.Mesh)) continue;
				if (obj.name.match(/moveable|sprite|staticmesh/) == null) continue;

				var materials = obj.material.materials;
				if (!materials || !materials.length) continue;

				for (var i = 0; i < materials.length; ++i) {
					var material = materials[i], origFragmentShader = material.origFragmentShader;
					if (!origFragmentShader) {
						material.origFragmentShader = material.fragmentShader;
					}

					material.fragmentShader = this.checked ? shader : material.origFragmentShader;
					material.needsUpdate = true;
				}
			}
		});

		this.elem.find('#nobumpmapping').on('click', function() {
			var scene = this_.parent.scene;
			for (var objID in scene.objects) {
                var obj = scene.objects[objID];
                
				if (!(obj instanceof THREE.Mesh) || objID.indexOf('sky') >= 0 || this_.parent.sceneJSON.objects[objID].type != "room") continue;

				var materials = obj.material.materials;
				if (!materials || !materials.length) continue;
 
				for (var i = 0; i < materials.length; ++i) {
					var material = materials[i];
                    var s = material.uniforms.offsetBump.value[2];
                    material.uniforms.offsetBump.value[2] = material.uniforms.offsetBump.value[3];
                    material.uniforms.offsetBump.value[3] = s;
				}
			}
		});

		this.elem.find('#useaddlights').on('click', function() {
            var scene = this_.parent.scene, sceneJSON = this_.parent.sceneJSON;
            this_.parent.useAdditionalLights = this.checked;
            TRN.Helper.setLightsOnMoveables(scene.objects, sceneJSON, this.checked);
		});

	    var prefix = ['', 'webkit', 'moz'];
	    for (var i = 0; i < prefix.length; ++i) {
	    	document.addEventListener(prefix[i] + "fullscreenchange", function() {
	    		this_.elem.find('#fullscreen').prop('checked', document.fullscreenElement != null);
	    	}, false);
	    }

	}

}
