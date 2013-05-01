var TRN = {};

TRN.ObjectID = {
	"Lara" : 0
}

TRN.baseFrameRate = 30.0;

TRN.QueryString = function () {
  var query_string = {};
  var query = window.location.search.substring(1);
  var vars = query.split("&");
  for (var i=0;i<vars.length;i++) {
    var pair = vars[i].split("=");
    	// If first entry with this name
    if (typeof query_string[decodeURIComponent(pair[0])] === "undefined") {
      query_string[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
    	// If second entry with this name
    } else if (typeof query_string[decodeURIComponent(pair[0])] === "string") {
      var arr = [ query_string[decodeURIComponent(pair[0])], decodeURIComponent(pair[1]) ];
      query_string[decodeURIComponent(pair[0])] = arr;
    	// If third or later entry with this name
    } else {
      query_string[decodeURIComponent(pair[0])].push(decodeURIComponent(pair[1]));
    }
  } 
    return query_string;
} ();

if(!document.hasOwnProperty("pointerLockElement")) {
    var getter = (function() {
        // These are the functions that match the spec, and should be preferred
        if("webkitPointerLockElement" in document) {
            return function() { return document.webkitPointerLockElement; };
        }
        if("mozPointerLockElement" in document) {
            return function() { return document.mozPointerLockElement; };
        }
        
        return function() { return null; }; // not supported
    })();
    
    Object.defineProperty(document, "pointerLockElement", {
        enumerable: true, configurable: false, writeable: false,
        get: getter
    });
}

if(!document.hasOwnProperty("fullscreenElement")) {
    var getter = (function() {
        if("webkitFullscreenElement" in document) {
            return function() { return document.webkitFullscreenElement; };
        }
        if("mozFullScreenElement" in document) {
            return function() { return document.mozFullScreenElement; };
        }
        
        return function() { return null; }; // not supported
    })();
    
    Object.defineProperty(document, "fullscreenElement", {
        enumerable: true, configurable: false, writeable: false,
        get: getter
    });
}

if(!document.exitPointerLock) {
    document.exitPointerLock = (function() {
        return  document.webkitExitPointerLock ||
                document.mozExitPointerLock ||
                function(){
                    if(navigator.pointer) {
                        var elem = this;
                        navigator.pointer.unlock();
                    }
                };
    })();
}

if(!document.exitFullscreen) {
    document.exitFullscreen = (function() {
        return  document.webkitCancelFullScreen ||
                document.mozCancelFullScreen ||
                function(){};
    })();
}

TRN.bindRequestPointerLock = function(domElement) {
	domElement.requestPointerLock = 
		domElement.requestPointerLock    ||
		domElement.mozRequestPointerLock ||
		domElement.webkitRequestPointerLock;
}

TRN.bindRequestFullscreen = function(domElement) {
	domElement.requestFullscreen = 
		domElement.requestFullscreen    ||
		domElement.mozRequestFullScreen ||
		domElement.webkitRequestFullscreen ||
		domElement.webkitRequestFullScreen;
}

// stolen from threejs !
TRN.extend = function ( obj, source ) {

	if ( Object.keys ) {

		var keys = Object.keys( source );

		for (var i = 0, il = keys.length; i < il; i++) {

			var prop = keys[i];
			Object.defineProperty( obj, prop, Object.getOwnPropertyDescriptor( source, prop ) );

		}

	} else {

		var safeHasOwnProperty = {}.hasOwnProperty;

		for ( var prop in source ) {

			if ( safeHasOwnProperty.call( source, prop ) ) {

				obj[prop] = source[prop];

			}

		}

	}

	return obj;

};

TRN.startSound = function(sound) {
	if (sound == null) return;

	sound.start ? sound.start(0) : sound.noteOn ? sound.noteOn(0) : '';
};

TRN.toHexString32 = function (n) {
	if (n < 0) {
		n = 0xFFFFFFFF + n + 1;
	}

	return "0x" + ("00000000" + n.toString(16).toUpperCase()).substr(-8);
};

TRN.toHexString16 = function (n) {
	if (n < 0) {
		n = 0xFFFF + n + 1;
	}

	return "0x" + ("0000" + n.toString(16).toUpperCase()).substr(-4);
};
        
TRN.toHexString8 = function (n) {
	if (n < 0) {
		n = 0xFF + n + 1;
	}

	return "0x" + ("00" + n.toString(16).toUpperCase()).substr(-2);
};

TRN.flattenArray = function (a) {
	var res = [];
	for (var i = 0; i < a.length; ++i) {
		res.push(a[i]);
	}
	return res;
};

TRN.flatten = function (obj, fpath) {
	function flatten_sub(o, parts, p) {
		for (; p < parts.length-1; ++p) {
			o = o[parts[p]];
			if (jQuery.isArray(o)) {
				for (var i = 0; i < o.length; ++i) {
					flatten_sub(o[i], parts, p+1);
				}
				return;
			}
		}
		if (jQuery.isArray(o[parts[p]])) {
			for (var i = 0; i < o[parts[p]].length; ++i) {
				o[parts[p]][i] = TRN.flattenArray(o[parts[p]][i]);
			}
		} else {
			o[parts[p]] = TRN.flattenArray(o[parts[p]]);
		}
	}
	
	flatten_sub(obj, fpath.split('.'), 0);
};

TRN.objSize = function (o) {
	var num = 0;
	for (var a in o) {
		if (o.hasOwnProperty(a)) num++;
	}
	return num;
};

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

	globalParam : function(path) {
		var node = jQuery(this.root).find('game[id="' + this.trversion + '"] > global ' + path);
		return node.size() > 0 ? node.text() : null;
	},

	levelParam : function(levelname, path, checkinglobal) {
		checkinglobal = checkinglobal || false;
		var node = jQuery(this.root).find('game[id="' + this.trversion + '"] > levels > level[id="' + levelname + '"] ' + path);
		if (node.size() == 0 && checkinglobal) {
			node = jQuery(this.root).find('game[id="' + this.trversion + '"] > global ' + path);
		}
		return node.size() > 0 ? node.text() : null;
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
