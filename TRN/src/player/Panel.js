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
		this.elem.find('#numlights').html(sceneJSON.curRoom != -1 ? sceneJSON.objects['room'+sceneJSON.curRoom].lights.length : '');
		this.elem.find('#camerapos').html(camera.position.x.toFixed(5)+','+camera.position.y.toFixed(5)+','+camera.position.z.toFixed(5));
		this.elem.find('#camerarot').html(camera.quaternion.x.toFixed(5)+','+camera.quaternion.y.toFixed(5)+','+camera.quaternion.z.toFixed(5)+','+camera.quaternion.w.toFixed(5));
		this.elem.find('#renderinfo').html(renderer.info.render.calls + ' / ' + renderer.info.render.vertices + ' / ' + renderer.info.render.faces + ' / ' + numObj);
		this.elem.find('#memoryinfo').html(renderer.info.memory.geometries + ' / ' + renderer.info.memory.programs + ' / ' + renderer.info.memory.textures);
	},

	singleRoomMode : function() {

		return this.elem.find('#singleroommode').prop('checked');

	},

	bindEvents : function() {

		var this_ = this;

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
			var shaderMgr = new TRN.ShaderMgr();
			var scene = this_.parent.scene;
			var shader = shaderMgr.getFragmentShader(this.checked ? 'standard_fog' : 'standard');
			for (var objID in scene.objects) {
				var obj = scene.objects[objID];
				if (!(obj instanceof THREE.Mesh) || objID.indexOf('sky') >= 0) continue;

				var materials = obj.material.materials;
				if (!materials || !materials.length) continue;

				for (var i = 0; i < materials.length; ++i) {
					var material = materials[i];
					material.fragmentShader = shader;
					material.needsUpdate = true;
				}
			}
		});

		this.elem.find('#nolights').on('click', function() {
			var shaderMgr = new TRN.ShaderMgr();
			var scene = this_.parent.scene;
			var shader = shaderMgr.getVertexShader('moveable');
			for (var objID in scene.objects) {
				var obj = scene.objects[objID];
				if (!(obj instanceof THREE.Mesh)) continue;

				var materials = obj.material.materials;
				if (!materials || !materials.length) continue;

				for (var i = 0; i < materials.length; ++i) {
					var material = materials[i], origMatName = material.origMatName, origVertexShader = material.origVertexShader;
					if (!origMatName) {
						origMatName = material.origMatName = material.name;
					}
					if (!origVertexShader) {
						material.origVertexShader = material.vertexShader;
					}
					if (origMatName.indexOf('_l') < 0) continue;

					material.vertexShader = this.checked ? shader : material.origVertexShader;
					material.needsUpdate = true;
				}
			}
		});

		this.elem.find('#showboundingboxes').on('click', function() {
			var scene = this_.parent.scene, sceneJSON = this_.parent.sceneJSON;
			for (var objID in scene.objects) {
				var obj = scene.objects[objID];
				var objJSON = sceneJSON.objects[objID];

				if (!(obj instanceof THREE.Mesh)) continue;
				//if (!objJSON.has_anims) continue;

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

		this.elem.find('#nomoveabletexture').on('click', function() {
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
					var material = materials[i], origMatName = material.origMatName, origFragmentShader = material.origFragmentShader;
					if (!origMatName) {
						material.origMatName = material.name;
					}
					if (!origFragmentShader) {
						material.origFragmentShader = material.fragmentShader;
					}

					material.fragmentShader = this.checked ? shader : material.origFragmentShader;
					material.needsUpdate = true;
				}
			}
		});

	    var prefix = ['', 'webkit', 'moz'];
	    for (var i = 0; i < prefix.length; ++i) {
	    	document.addEventListener(prefix[i] + "fullscreenchange", function() {
	    		this_.elem.find('#fullscreen').prop('checked', document.fullscreenElement != null);
	    	}, false);
	    }

	}

}
