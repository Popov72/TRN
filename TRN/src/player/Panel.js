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
		this.elem.find('#camerapos').html(camera.position.x.toFixed(12)+','+camera.position.y.toFixed(12)+','+camera.position.z.toFixed(12));
		this.elem.find('#camerarot').html(camera.quaternion.x.toFixed(12)+','+camera.quaternion.y.toFixed(12)+','+camera.quaternion.z.toFixed(12)+','+camera.quaternion.w.toFixed(12));
		this.elem.find('#renderinfo').html(renderer.info.render.calls + ' / ' + renderer.info.render.vertices + ' / ' + renderer.info.render.faces + ' / ' + numObj);
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
			for (var objID in scene.objects) {
				var obj = scene.objects[objID];
				if (!(obj instanceof THREE.Mesh)) continue;

				var materials = obj.material.materials;
				if (!materials || !materials.length) continue;

				for (var i = 0; i < materials.length; ++i) {
					var material = materials[i];
					material.fragmentShader = shaderMgr.getFragmentShader(this.checked ? 'standard_fog' : 'standard');
					material.needsUpdate = true;
				}
			}
		});

		this.elem.find('#nolights').on('click', function() {
			var shaderMgr = new TRN.ShaderMgr();
			var scene = this_.parent.scene;
			for (var objID in scene.objects) {
				var obj = scene.objects[objID];
				if (!(obj instanceof THREE.Mesh)) continue;

				var materials = obj.material.materials;
				if (!materials || !materials.length) continue;

				for (var i = 0; i < materials.length; ++i) {
					var material = materials[i], origMatName = material.origMatName;
					if (!origMatName) {
						origMatName = material.origMatName = material.name;
						material.origVertexShader = material.vertexShader;
					}
					if (origMatName.indexOf('_l') < 0) continue;

					material.vertexShader = this.checked ? shaderMgr.getVertexShader('moveable') : material.origVertexShader;
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

	    var prefix = ['', 'webkit', 'moz'];
	    for (var i = 0; i < prefix.length; ++i) {
	    	document.addEventListener(prefix[i] + "fullscreenchange", function() {
	    		this_.elem.find('#fullscreen').prop('checked', document.fullscreenElement != null);
	    	}, false);
	    }

	}

}
