TRN.ShaderMgr = function() {
	this.fpath = 'TRN/resource/shaders/';
	this.fileCache = {};
}

TRN.ShaderMgr.prototype = {

	constructor : TRN.ShaderMgr,

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
		return this.fileCache[fname] || this._loadFile(fname);
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
