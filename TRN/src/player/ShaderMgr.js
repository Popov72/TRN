TRN.ShaderMgr = function(fpath) {
	this.root = null;

	fpath = fpath || 'TRN/resource/shaders.xml';

	var _this = this;

	jQuery.ajax({
		type: "GET",
		url: fpath,
		dataType: "xml",
		cache: false,
		async: false
	}).done(function(data) { _this.root = data; });

	return this;
}

TRN.ShaderMgr.prototype = {

	constructor : TRN.ShaderMgr,

	getShader : function(ptype, name) {
		var node = jQuery(this.root).find('shader[type="' + ptype + '"][name="' + name + '"]');
		if (node.size() == 0) console.warn('Could not load the ' + ptype + ' shader "' + name + '"');
		return node.size() > 0 ? node.text() : null;
	},

	getVertexShader : function(name) {
		return this.getShader('vertex', name);
	},

	getFragmentShader : function(name) {
		return this.getShader('fragment', name);
	}

}
