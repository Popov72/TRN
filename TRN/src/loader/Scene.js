TRN.Scene = function(sceneJSON, scene) {
	this.sceneJSON = sceneJSON;
	this.scene = scene;
	this.camera = null;
}

TRN.Scene.prototype = {

	constructor : TRN.Level,

	findObjectById : function(idObject) {

		for (var objID in this.scene.objects) {

			var objJSON = this.sceneJSON.objects[objID];

			if (objJSON.objectid == idObject) return this.scene.objects[objID];

		}

		return null;
	},

	setCamera : function(camera) {
		this.camera = camera;
	}
};
