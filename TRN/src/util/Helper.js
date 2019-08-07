TRN.Helper = {

	startSound : function(sound) {
		if (sound == null) return;

		sound.start ? sound.start(0) : sound.noteOn ? sound.noteOn(0) : '';
	},

	toHexString32 : function (n) {
		if (n < 0) {
			n = 0xFFFFFFFF + n + 1;
		}

		return "0x" + ("00000000" + n.toString(16).toUpperCase()).substr(-8);
	},

	toHexString16 : function (n) {
		if (n < 0) {
			n = 0xFFFF + n + 1;
		}

		return "0x" + ("0000" + n.toString(16).toUpperCase()).substr(-4);
	},
	        
	toHexString8 : function (n) {
		if (n < 0) {
			n = 0xFF + n + 1;
		}

		return "0x" + ("00" + n.toString(16).toUpperCase()).substr(-2);
	},

	flattenArray : function (a) {
		if (!a) return;
		var res = [];
		for (var i = 0; i < a.length; ++i) {
			res.push(a[i]);
		}
		return res;
	},

	flatten : function (obj, fpath) {
		function flatten_sub(o, parts, p) {
			if (!o) return;
			for (; p < parts.length-1; ++p) {
				o = o[parts[p]];
				if (jQuery.isArray(o)) {
					for (var i = 0; i < o.length; ++i) {
						flatten_sub(o[i], parts, p+1);
					}
					return;
				}
			}
			if (!o) return;
			if (jQuery.isArray(o[parts[p]])) {
				for (var i = 0; i < o[parts[p]].length; ++i) {
					o[parts[p]][i] = TRN.Helper.flattenArray(o[parts[p]][i]);
				}
			} else {
				o[parts[p]] = TRN.Helper.flattenArray(o[parts[p]]);
			}
		}
		
		flatten_sub(obj, fpath.split('.'), 0);
	},

	objSize : function (o) {
		var num = 0;
		for (var a in o) {
			if (o.hasOwnProperty(a)) num++;
		}
		return num;
	}
}
