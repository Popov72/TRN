TRN.ShaderManager = function() {
	this.fpath = 'TRN/resource/shaders/';
	this.fileCache = {};
}

TRN.ShaderManager.prototype = {

	constructor : TRN.ShaderManager,

	getShader : function(ptype, name) {
		return this._getFile(name + (ptype == 'vertex' ? '.vs' : '.fs'));
	},

	getVertexShader : function(name) {
		return this.getShader('vertex', name);
	},

	getFragmentShader : function(name) {
		return this.getShader('fragment', name);
	},

	_getFile : function(fname) {
		if (typeof this.fileCache[fname] != 'undefined') return this.fileCache[fname];
		this.fileCache[fname] = this._loadFile(fname);
		return this.fileCache[fname];
	},

	_loadFile : function(fname) {
		var res;
		jQuery.ajax({
			type: "GET",
			url: this.fpath + fname,
			dataType: "text",
			cache: false,
			async: false
		}).done(function(data) { res = data; });
		return res;
	}


}
