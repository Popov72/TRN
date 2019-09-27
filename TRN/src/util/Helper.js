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
	},

	lerp : function(a, b, t) {
    	if (t <= 0.0) return a;
    	if (t >= 1.0) return b;
    	return a + (b - a) * t;
	},

    setMaterialLightsUniform : function(room, material) {

        var u = material.uniforms;

        u.numDirectionalLight.value = 0;
        u.numPointLight.value       = 0;
        u.numSpotLight.value        = 0;

        if (room.lights.length == 0) {
            return;
        }

        for (var l = 0; l < room.lights.length; ++l) {
            var light = room.lights[l];

            switch(light.type) {
                case 'directional':
                    u.numDirectionalLight.value++;
                    break;
                case 'point':
                    u.numPointLight.value++;
                    break;
                case 'spot':
                    u.numSpotLight.value++;
                    break;
            }
        }

        if (u.numDirectionalLight.value > 0) {
            u.directionalLight_direction.value = [];
            u.directionalLight_color.value = [];
        }

        if (u.numPointLight.value > 0) {
            u.pointLight_position.value = [];
            u.pointLight_color.value = [];
            u.pointLight_distance.value = [];
        }

        if (u.numSpotLight.value > 0) {
            u.spotLight_position.value = [];
            u.spotLight_color.value = [];
            u.spotLight_distance.value = [];
            u.spotLight_direction.value = [];
            u.spotLight_coneCos.value = [];
            u.spotLight_penumbraCos.value = [];
        }

        for (var l = 0; l < room.lights.length; ++l) {
            var light = room.lights[l];

            switch(light.type) {
                case 'directional':
                    u.directionalLight_direction.value  = u.directionalLight_direction.value.concat([light.dx, light.dy, light.dz]);
                    u.directionalLight_color.value      = u.directionalLight_color.value.concat(light.color);
                    break;
                case 'point':
                    u.pointLight_position.value = u.pointLight_position.value.concat([light.x, light.y, light.z]);
                    u.pointLight_color.value    = u.pointLight_color.value.concat(light.color);
                    u.pointLight_distance.value.push(light.fadeOut);
                    break;
                case 'spot':
                    u.spotLight_position.value  = u.spotLight_position.value.concat([light.x, light.y, light.z]);
                    u.spotLight_color.value     = u.spotLight_color.value.concat(light.color);
                    u.spotLight_direction.value = u.spotLight_direction.value.concat([light.dx, light.dy, light.dz]);
                    u.spotLight_distance.value.push(light.fadeOut);
                    u.spotLight_coneCos.value.push(light.coneCos);
                    u.spotLight_penumbraCos.value.push(light.penumbraCos);
                    break;
            }
        }
   }

}
