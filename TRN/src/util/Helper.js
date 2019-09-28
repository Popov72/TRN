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

    setMaterialLightsUniform : function(room, material, noreset, useExtLights) {

        noreset = noreset || false;
        useExtLights = useExtLights || false;

        var u = material.uniforms;

        if (!noreset) {
            u.numDirectionalLight.value = 0;
            u.numPointLight.value       = 0;
            u.numSpotLight.value        = 0;
        }

        var lights = useExtLights ? room.lightsExt : room.lights;
        if (lights.length == 0) {
            return;
        }

        for (var l = 0; l < lights.length; ++l) {
            var light = lights[l];

            switch(light.type) {
                case 'directional':
                    if (u.directionalLight_direction.value === undefined || (!noreset && u.numDirectionalLight.value == 0))   u.directionalLight_direction.value = [];
                    if (u.directionalLight_color.value === undefined || (!noreset && u.numDirectionalLight.value == 0))       u.directionalLight_color.value = [];

                    u.directionalLight_direction.value  = u.directionalLight_direction.value.concat([light.dx, light.dy, light.dz]);
                    u.directionalLight_color.value      = u.directionalLight_color.value.concat(light.color);

                    u.numDirectionalLight.value++;
                    break;
                case 'point':
                    if (u.pointLight_position.value === undefined || (!noreset && u.numPointLight.value == 0))  u.pointLight_position.value = [];
                    if (u.pointLight_color.value === undefined || (!noreset && u.numPointLight.value == 0))     u.pointLight_color.value = [];
                    if (u.pointLight_distance.value === undefined || (!noreset && u.numPointLight.value == 0))  u.pointLight_distance.value = [];

                    u.pointLight_position.value = u.pointLight_position.value.concat([light.x, light.y, light.z]);
                    u.pointLight_color.value    = u.pointLight_color.value.concat(light.color);
                    u.pointLight_distance.value.push(light.fadeOut);

                    u.numPointLight.value++;
                    break;
                case 'spot':
                    if (u.spotLight_position.value === undefined || (!noreset && u.numSpotLight.value == 0))       u.spotLight_position.value = [];
                    if (u.spotLight_color.value === undefined || (!noreset && u.numSpotLight.value == 0))          u.spotLight_color.value = [];
                    if (u.spotLight_direction.value === undefined || (!noreset && u.numSpotLight.value == 0))      u.spotLight_direction.value = [];
                    if (u.spotLight_distance.value === undefined || (!noreset && u.numSpotLight.value == 0))       u.spotLight_distance.value = [];
                    if (u.spotLight_coneCos.value === undefined || (!noreset && u.numSpotLight.value == 0))        u.spotLight_coneCos.value = [];
                    if (u.spotLight_penumbraCos.value === undefined || (!noreset && u.numSpotLight.value == 0))    u.spotLight_penumbraCos.value = [];

                    u.spotLight_position.value  = u.spotLight_position.value.concat([light.x, light.y, light.z]);
                    u.spotLight_color.value     = u.spotLight_color.value.concat(light.color);
                    u.spotLight_direction.value = u.spotLight_direction.value.concat([light.dx, light.dy, light.dz]);
                    u.spotLight_distance.value.push(light.fadeOut);
                    u.spotLight_coneCos.value.push(light.coneCos);
                    u.spotLight_penumbraCos.value.push(light.penumbraCos);

                    u.numSpotLight.value++;
                    break;
            }
        }
    },

    setLightsOnMoveables : function(objects, sceneJSON, useAdditionalLigths) {
        for (var objID in objects) {
            var obj = objects[objID];

            if (!(obj instanceof THREE.Mesh)) continue;

            var materials = obj.material ? obj.material.materials : null;
            if (!materials || !materials.length) continue;

            var objJSON = sceneJSON.objects[objID];
            for (var i = 0; i < materials.length; ++i) {
                var material = materials[i];
                if (!material.uniforms || material.uniforms.numPointLight === undefined || material.uniforms.numPointLight < 0) continue;

                TRN.Helper.setMaterialLightsUniform(sceneJSON.objects['room' + objJSON.roomIndex], material, false, useAdditionalLigths);
            }
        }
    },

    domNodeToJSon : function (node) {

        var children = {};

        var attrs = node.attributes;
        if (attrs && attrs.length > 0) {
            var attr = {};
            children.__attributes = attr;
            for (var i = 0; i < attrs.length; i++) {
                var at = attrs[i];
                attr[at.nodeName] = at.nodeValue;
            }
        }

        var childNodes = node.childNodes;
        if (childNodes) {
            var textVal = '', hasRealChild = false;
            for (var i = 0; i < childNodes.length; i++) {
                var child = childNodes[i];
                var cname = child.nodeName;
                switch(child.nodeType) {
                    case 1:
                        hasRealChild = true;
                        if (children[cname]) {
                            if (!Array.isArray(children[cname])) {
                                children[cname] = [children[cname]];
                            }
                            children[cname].push(this.domNodeToJSon(child));
                        } else {
                            children[cname] = this.domNodeToJSon(child);
                        }
                        break;
                    case 3:
                        if (child.nodeValue) {
                            textVal += child.nodeValue;
                        }
                        break;
                }
            }
            textVal = textVal.replace(/[ \r\n\t]/g, '').replace(' ', '');
            if (textVal !== '') {
                if (children.__attributes == undefined && !hasRealChild) {
                    children = textVal;
                } else {
                    children.__value = textVal;
                }
            } else if (children.__attributes == undefined && !hasRealChild) {
                children = null;
            }
        }

        return children;
    }

}
