TRN.MaterialManager = function(gameData) {
    this.sceneData = gameData.sceneData;
    this.useAdditionalLights = false;
}

TRN.MaterialManager.prototype = {

    constructor : TRN.MaterialManager,

    createLightUniformsForObject : function(obj) {
        var materials = obj.material ? obj.material.materials : null;
        if (materials) {
            for (var m = 0; m < materials.length; ++m) {
                this.createLightUniformsForMaterial(materials[m]);
            }
        }
    },

    createLightUniformsForMaterial : function(material) {
        var u = material.uniforms;

        u.numDirectionalLight           = { type: "i", value: 0 };
        u.directionalLight_direction    = { type: "fv"  };
        u.directionalLight_color        = { type: "fv"  };

        u.numPointLight                 = { type: "i", value: -1 }; // -1 here means the object is internally lit
        u.pointLight_position           = { type: "fv"  };
        u.pointLight_color              = { type: "fv"  };
        u.pointLight_distance           = { type: "fv1" };

        u.numSpotLight                  = { type: "i", value: 0 };
        u.spotLight_position            = { type: "fv"  };
        u.spotLight_color               = { type: "fv"  };
        u.spotLight_distance            = { type: "fv1" };
        u.spotLight_direction           = { type: "fv"  };
        u.spotLight_coneCos             = { type: "fv1" };
        u.spotLight_penumbraCos         = { type: "fv1" };
    },

    setUniformsFromRoom : function(obj, roomIndex) {
        var materials = obj.material.materials;
        var roomData = this.sceneData.objects['room' + roomIndex];
        var data = this.sceneData.objects[obj.name];

        for (var mat = 0; mat < materials.length; ++mat) {
            var material = materials[mat];

            material.uniforms.ambientColor.value = roomData.ambientColor;

            if (data.type == 'staticmesh') {
                material.uniforms.lighting.value = data.lighting;
            } else if (data.type == 'moveable') {
				if (data.moveableIsInternallyLit) {
					// item is internally lit
					// todo: for TR3/TR4, need to change to a shader that uses vertex color (like the shader mesh2, but for moveable)
                    material.uniforms.ambientColor.value = data.lighting;
				} else {
                    this.setLightUniformsForMaterial(roomData, material, false);
                }
            }

            if (!roomData.flickering)      material.uniforms.flickerColor.value = [1, 1, 1];
            if (roomData.filledWithWater)  material.uniforms.tintColor.value = [this.sceneData.waterColor.in.r, this.sceneData.waterColor.in.g, this.sceneData.waterColor.in.b];
        }
    },

    setLightUniformsForMaterial : function(room, material, noreset) {
        noreset = noreset || false;

        var u = material.uniforms;

        if (!noreset) {
            u.numDirectionalLight.value = 0;
            u.numPointLight.value       = 0;
            u.numSpotLight.value        = 0;
        }

        var lights = this.useAdditionalLights ? room.lightsExt : room.lights;
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

    setLightUniformsForObject : function(obj) {
        var data = this.sceneData.objects[obj.name];
        if (data && data.roomIndex >= 0) {
            var materials = obj.material ? obj.material.materials : null;
            if (!materials || !materials.length) {
                return;
            }

            for (var m = 0; m < materials.length; ++m) {
                var material = materials[m];
                if (!material.uniforms || material.uniforms.numPointLight === undefined || material.uniforms.numPointLight < 0) continue;

                this.setLightUniformsForMaterial(this.sceneData.objects['room' + data.roomIndex], material, false);
            }
        }
    },

    // update material light uniforms for all `objects`, depending on the room they are in (should be a list of moveables only!)
    setLightUniformsForObjects : function(objects) {
        for (var objID in objects) {
            var lstObj = objects[objID];

            for (var i = 0; i < lstObj.length; ++i) {
                this.setLightUniformsForObject(lstObj[i]);
            }
        }
    },

    getFirstDirectionalLight : function(lights) {
        for (let i = 0; i < lights.length; ++i) {
            if (lights[i].type == 'directional') {
                return i;
            }
        }
        return -1;
    }

}
