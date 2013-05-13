TRN.ConfigMgr = function(TRVersion, fpath) {
	this.root = null;
	this.trversion = TRVersion;

	fpath = fpath || 'TRN/resource/config.xml';

	var _this = this;

	jQuery.ajax({
		type: "GET",
		url: fpath,
		dataType: "xml",
		cache: false,
		async: false
	}).done(function(data) { _this.root = data; });

	return this;
};

TRN.ConfigMgr.prototype = {

	constructor : TRN.ConfigMgr,

	globalParam : function(path, getnode) {
		var node = jQuery(this.root).find('game[id="' + this.trversion + '"] > global ' + path);
		return getnode ? node : (node.size() > 0 ? node.text() : null);
	},

	levelParam : function(levelname, path, checkinglobal, getnode) {
		checkinglobal = checkinglobal || false;
		var node = jQuery(this.root).find('game[id="' + this.trversion + '"] > levels > level[id="' + levelname + '"] ' + path);
		if (node.size() == 0 && checkinglobal) {
			node = jQuery(this.root).find('game[id="' + this.trversion + '"] > global ' + path, getnode);
		}
		return getnode ? node : (node.size() > 0 ? node.text() : null);
	},

	globalColor : function(path) {
		var r = this.globalParam(path + ' > r');
		var g = this.globalParam(path + ' > g');
		var b = this.globalParam(path + ' > b');
		
		return r != null && g != null && b != null ? { r:r/255, g:g/255, b:b/255 } : null;
	},

	levelColor : function(levelname, path, checkinglobal) {
		var r = this.levelParam(levelname, path + ' > r', checkinglobal);
		var g = this.levelParam(levelname, path + ' > g', checkinglobal);
		var b = this.levelParam(levelname, path + ' > b', checkinglobal);
		
		return r != null && g != null && b != null ? { r:r/255, g:g/255, b:b/255 } : null;
	},

	levelVector3 : function(levelname, path, checkinglobal) {
		var x = this.levelParam(levelname, path + ' > x', checkinglobal);
		var y = this.levelParam(levelname, path + ' > y', checkinglobal);
		var z = this.levelParam(levelname, path + ' > z', checkinglobal);
		
		return x != null && y != null && z != null ? { x:parseFloat(x), y:parseFloat(y), z:parseFloat(z) } : null;
	},

	levelFloat : function(levelname, path, checkinglobal, defvalue) {
		var v = this.levelParam(levelname, path, checkinglobal);
		
		return v != null ? parseFloat(v) : defvalue;
	},

	levelNumber : function(levelname, path, checkinglobal, defvalue) {
		var v = this.levelParam(levelname, path, checkinglobal);
		
		return v != null ? parseInt(v) : defvalue;
	},

	levelBoolean : function(levelname, path, checkinglobal, defvalue) {
		var v = this.levelParam(levelname, path, checkinglobal);
		return v != null ? v == 'true' : defvalue;
	}
}
