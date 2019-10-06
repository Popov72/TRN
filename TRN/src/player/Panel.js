TRN.Panel = function(domElement, gameData, renderer) {
	
	var html;

    this.parent = gameData;
    this.renderer = renderer;

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
		var sceneData = this.parent.sceneData, camera = this.parent.camera, renderer = this.renderer;

		var numObj = this.parent.sceneRender.__objects.length;

		this.elem.find('#currentroom').html(this.parent.curRoom);
		this.elem.find('#numlights').html(this.parent.curRoom != -1 ? (this.parent.matMgr.useAdditionalLights ? sceneData.objects['room'+this.parent.curRoom].lightsExt.length : sceneData.objects['room'+this.parent.curRoom].lights.length) : '');
		this.elem.find('#camerapos').html(camera.position.x.toFixed(5)+','+camera.position.y.toFixed(5)+','+camera.position.z.toFixed(5));
		this.elem.find('#camerarot').html(camera.quaternion.x.toFixed(5)+','+camera.quaternion.y.toFixed(5)+','+camera.quaternion.z.toFixed(5)+','+camera.quaternion.w.toFixed(5));
		this.elem.find('#renderinfo').html(renderer.info.render.calls + ' / ' + renderer.info.render.vertices + ' / ' + renderer.info.render.faces + ' / ' + numObj);
		this.elem.find('#memoryinfo').html(renderer.info.memory.geometries + ' / ' + renderer.info.memory.programs + ' / ' + renderer.info.memory.textures);
	},

    updateFromParent : function() {

        this.elem.find('#singleroommode').prop('checked', this.parent.singleRoomMode);
        this.elem.find('#useaddlights').prop('checked', this.parent.matMgr.useAdditionalLights);

    },

	bindEvents : function() {

		var this_ = this;

		this.elem.find('#singleroommode').on('click', function() {
            this_.parent.singleRoomMode = this.checked;
		});

		this.elem.find('#wireframemode').on('click', function() {
			var scene = this_.parent.sceneRender;
			scene.traverse( (obj) => {
                if (!(obj instanceof THREE.Mesh)) return;

				var materials = obj.material.materials;
				if (!materials || !materials.length) return;

				for (var i = 0; i < materials.length; ++i) {
					var material = materials[i];
					material.wireframe = this.checked;
				}
			});
		});

		this.elem.find('#usefog').on('click', function() {
			var scene = this_.parent.sceneRender;
			scene.traverse( (obj) => {
                if (!(obj instanceof THREE.Mesh)) return;
                
				var materials = obj.material ? obj.material.materials : null;
				if (!materials || !materials.length) return;

				for (var i = 0; i < materials.length; ++i) {
                    var material = materials[i];
                    if (material.uniforms && material.uniforms.useFog) material.uniforms.useFog.value = this.checked ? 1 : 0;
				}
			});
		});

		this.elem.find('#nolights').on('click', function() {
            var scene = this_.parent.sceneRender;
            var white = [1, 1, 1];
			scene.traverse( (obj) => {
                if (!(obj instanceof THREE.Mesh)) return;

				var materials = obj.material ? obj.material.materials : null;
				if (!materials || !materials.length) return;

				for (var i = 0; i < materials.length; ++i) {
                    var material = materials[i];
                    if (!material.uniforms || material.uniforms.numPointLight === undefined) return;
                    if (material.__savenum === undefined) {
                        material.__savenum = material.uniforms.numPointLight.value;
                        material.__saveambient = material.uniforms.ambientColor.value;
                    }
                    material.uniforms.numPointLight.value = this.checked ? 0 : material.__savenum;
                    material.uniforms.ambientColor.value = this.checked ? white : material.__saveambient;
				}
			});
		});

		this.elem.find('#showboundingboxes').on('click', function() {
            var scene = this_.parent.sceneRender;
            var toBeRemoved = [];
			scene.traverse( (obj) => {
				if (!(obj instanceof THREE.Mesh)) return;

				if (this.checked) {
					obj.boxHelper = new THREE.BoxHelper();
					obj.boxHelper.update(obj);
					scene.add(obj.boxHelper);
				} else {
					toBeRemoved.push(obj.boxHelper);
				}
            });
            toBeRemoved.forEach( (obj) => {
                scene.remove(obj);
                delete obj.boxHelper;
            });
            this_.parent.needWebGLInit = true;
		});

		this.elem.find('#showportals').on('click', function() {
			var scene = this_.parent.sceneRender, sceneData = this_.parent.sceneData;
			scene.traverse( (obj) => {
                var data = sceneData.objects[obj.name];
                
                if (!data || data.type != 'room') return;
                
				var portals = data.meshPortals;

				if (!portals) return;

				for (var i = 0; i < portals.length; ++i)
					portals[i].visible = this.checked;
			});
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
			var shaderMgr = this_.parent.shdMgr;
			var scene = this_.parent.sceneRender;
			var shader = shaderMgr.getFragmentShader('uniformcolor');
			scene.traverse( (obj) => {
				if (!(obj instanceof THREE.Mesh)) return;
				if (obj.name.match(/moveable|sprite|staticmesh/) == null) return;

				var materials = obj.material.materials;
				if (!materials || !materials.length) return;

				for (var i = 0; i < materials.length; ++i) {
					var material = materials[i], origFragmentShader = material.origFragmentShader;
					if (!origFragmentShader) {
						material.origFragmentShader = material.fragmentShader;
					}

					material.fragmentShader = this.checked ? shader : material.origFragmentShader;
					material.needsUpdate = true;
				}
			});
		});

		this.elem.find('#nobumpmapping').on('click', function() {
			var scene = this_.parent.sceneRender;
			scene.traverse( (obj) => {
                var data = this_.parent.sceneData.objects[obj.name];
                
				if (!(obj instanceof THREE.Mesh) || !data || data.type != "room") return;

				var materials = obj.material.materials;
				if (!materials || !materials.length) return;
 
				for (var i = 0; i < materials.length; ++i) {
					var material = materials[i];
                    var s = material.uniforms.offsetBump.value[2];
                    material.uniforms.offsetBump.value[2] = material.uniforms.offsetBump.value[3];
                    material.uniforms.offsetBump.value[3] = s;
				}
			});
		});

		this.elem.find('#useaddlights').on('click', function() {
            var sceneData = this_.parent.sceneData;

            this_.parent.matMgr.useAdditionalLights = this.checked;
            this_.parent.matMgr.setLightUniformsForObjects(this_.parent.objMgr.objectList['moveable']);
		});

	    var prefix = ['', 'webkit', 'moz'];
	    for (var i = 0; i < prefix.length; ++i) {
	    	document.addEventListener(prefix[i] + "fullscreenchange", function() {
	    		this_.elem.find('#fullscreen').prop('checked', document.fullscreenElement != null);
	    	}, false);
	    }

	}

}
