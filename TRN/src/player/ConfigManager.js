TRN.ConfigManager = function(TRVersion, fpath) {
	this._root = null;
	this.trversion = TRVersion;
    this._levelname = null;

	fpath = fpath || 'TRN/resource/config.xml';

    jQuery.ajax({
        type:       "GET",
        url:        fpath,
        dataType:   "xml",
        cache:      false,
        async:      false
    }).done( (data) => this._root = data );

	return this;
};

TRN.ConfigManager.prototype = {

	constructor : TRN.ConfigManager,

	globalParam : function(path, getnode = false) {
		const node = jQuery(this._root).find('game[id="' + this.trversion + '"] > global ' + path);
		return getnode ? node : (node.length > 0 ? node.text() : null);
	},

	globalColor : function(path) {
		const r = this.globalParam(path + ' > r');
		const g = this.globalParam(path + ' > g');
		const b = this.globalParam(path + ' > b');
		
		return r != null && g != null && b != null ? { r:r/255, g:g/255, b:b/255 } : null;
	},

	param : function(path, checkinglobal = false, getnode = false) {
		let node = this._levelname ? jQuery(this._root).find('game[id="' + this.trversion + '"] > levels > level[id="' + this._levelname + '"] ' + path) : null;
		if ((!node || node.length == 0) && checkinglobal) {
			node = jQuery(this._root).find('game[id="' + this.trversion + '"] > global ' + path);
		}
		return getnode ? node : (node.length > 0 ? node.text() : null);
	},

	color : function(path, checkinglobal = false) {
		const r = this.param(path + ' > r', checkinglobal);
		const g = this.param(path + ' > g', checkinglobal);
		const b = this.param(path + ' > b', checkinglobal);
		
		return r != null && g != null && b != null ? { r:r/255, g:g/255, b:b/255 } : null;
	},

	vector3 : function(path, checkinglobal = false) {
		const x = this.param(path + ' > x', checkinglobal);
		const y = this.param(path + ' > y', checkinglobal);
		const z = this.param(path + ' > z', checkinglobal);
		
		return x != null && y != null && z != null ? { x:parseFloat(x), y:parseFloat(y), z:parseFloat(z) } : null;
	},

	float : function(path, checkinglobal = false, defvalue = undefined) {
		const v = this.param(path, checkinglobal);
		
		return v != null ? parseFloat(v) : defvalue;
	},

	number : function(path, checkinglobal = false, defvalue = undefined) {
		const v = this.param(path, checkinglobal);
		
		return v != null ? parseInt(v) : defvalue;
	},

	boolean : function(path, checkinglobal = false, defvalue = undefined) {
        const v = this.param(path, checkinglobal);
        
		return v != null ? v == 'true' : defvalue;
	}

}    

Object.defineProperty(TRN.ConfigManager.prototype, "levelName", {
    get: function() {
        return this._levelname;
    },

    set: function(levelName) {
        this._levelname = levelName;
    }
});
