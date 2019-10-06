TRN.ObjectManager = function() {
    this.objectList = null;
    this.count = 0;
}

TRN.ObjectManager.prototype = {

    constructor : TRN.ObjectManager,

    initialize : function(gameData) {
        this.gameData = gameData;
        this.sceneRender = gameData.sceneRender;
        this.sceneData = gameData.sceneData;
        this.matMgr = gameData.matMgr;
        this.bhvMgr = gameData.bhvMgr;
        this.anmMgr = gameData.anmMgr;
    
        this.buildLists();
    },

    buildLists : function() {
        this.objectList = {
            "moveable": {},
            "room": {},
            "camera": {},
            "staticmesh": {},
            "sprite": {},
            "spriteseq": {}
        };

        this.sceneRender.traverse( (obj) => {
            var data = this.sceneData.objects[obj.name];

            if (!data) return;

            var id = data.objectid, type = data.type;

            if (id == undefined) {
                console.log('buildLists: not found objectid property', obj.name, obj);
                return;
            }

            if (type == undefined) {
                console.log('buildLists: not found type property', obj.name, obj);
                return;
            }

            var objs = this.objectList[type];
            if (!objs) {
                objs = {};
                this.objectList[type] = objs;
            }

            if (objs[id] && type == 'room') {
                console.log('Already found room with id ' + id + ':', type, objs[id], data)
            }

            if (type == 'room') {
                objs[id] = obj;
            } else {
                var objsForId = objs[id];
                if (!objsForId) {
                    objsForId = [];
                    objs[id] = objsForId;
                }
                objsForId.push(obj);
            }
        } );
    },

    createSprite : function(spriteID, roomIndex, color, addToScene) {
        if (addToScene === undefined) {
            addToScene = true;
        }

        const data = this.sceneData.objects[spriteID < 0 ? 'spriteseq' + (-spriteID) : 'sprite' + spriteID];

        if (spriteID < 0) {
            spriteID = -spriteID;
        }

        if (!data || !data.liveObj) {
            return null;
        }

        let obj = data.liveObj.clone();

        // copy material
        const newMaterial = new THREE.MeshFaceMaterial();

        for (let m = 0; m < obj.material.materials.length; ++m) {
            const material = obj.material.materials[m];
            
            newMaterial.materials[m] = material.clone();
            newMaterial.materials[m].userData = material.userData;
            newMaterial.materials[m].uniforms.lighting.value = color;
        }

        obj.material = newMaterial;
        obj.name = data.type + spriteID + '_room' + roomIndex + '_dyncreate_' + (this.count++);
        obj.visible = true;

        const newData = {
            "type"   	            : data.type,
            "roomIndex"             : roomIndex,
            "has_anims"				: false,
            "objectid"              : data.objectid,
            "visible"  				: true
        };

        this.sceneData.objects[obj.name] = newData;

        let lst = this.objectList[data.type][spriteID];
        if (!lst) {
            lst = [];
            this.objectList[data.type][spriteID] = lst;
        }

        lst.push(obj);

        if (addToScene) {
            this.sceneRender.add(obj);
        }

        return obj;
    },

    createStaticMesh : function(staticmeshID, roomIndex, color, addToScene) {
        if (addToScene === undefined) {
            addToScene = true;
        }

        const data = this.sceneData.objects['staticmesh' + staticmeshID];

        if (!data || !data.liveObj) {
            return null;
        }

        let obj = data.liveObj.clone();

        // copy material
        const newMaterial = new THREE.MeshFaceMaterial();

        for (let m = 0; m < obj.material.materials.length; ++m) {
            const material = obj.material.materials[m];
            
            newMaterial.materials[m] = material.clone();
            newMaterial.materials[m].userData = material.userData;
            newMaterial.materials[m].uniforms.lighting.value = color;
        }

        obj.material = newMaterial;
        obj.name = 'staticmesh' + staticmeshID + '_room' + roomIndex + '_dyncreate_' + (this.count++);
        obj.visible = true;

        const newData = {
            "type"   	            : 'staticmesh',
            "roomIndex"             : roomIndex,
            "has_anims"				: false,
            "objectid"              : data.objectid,
            "visible"  				: true
        };

        this.sceneData.objects[obj.name] = newData;

        let lst = this.objectList[data.type][staticmeshID];
        if (!lst) {
            lst = [];
            this.objectList[data.type][staticmeshID] = lst;
        }

        lst.push(obj);

        if (addToScene) {
            this.sceneRender.add(obj);
        }

        return obj;
    },

    createMoveable : function(moveableID, roomIndex, extrnColor, addToScene, setAnimation) {
        if (addToScene === undefined) {
            addToScene = true;
        }

        if (setAnimation === undefined) {
            setAnimation = true;
        }

        const data = this.sceneData.objects['moveable' + moveableID];

        if (!data || !data.liveObj) {
            return null;
        }

        let obj = data.liveObj.clone();

        // copy material
        const newMaterial = new THREE.MeshFaceMaterial();

        for (let m = 0; m < obj.material.materials.length; ++m) {
            const material = obj.material.materials[m];
            
            newMaterial.materials[m] = material.clone();
            newMaterial.materials[m].userData = material.userData;

            if (extrnColor) {
                newMaterial.materials[m].uniforms.ambientColor.value = extrnColor;
            }
        }

        obj.material = newMaterial;
        obj.name = 'moveable' + moveableID + '_room' + roomIndex + '_dyncreate_' + (this.count++);
        obj.visible = true;
        obj.matrixAutoUpdate = true;

        const newData = {
            "type"   	            : 'moveable',
            "roomIndex"             : roomIndex,
            "has_anims"				: data.has_anims,
            "objectid"              : data.objectid,
            "visible"  				: true,
            "bonesStartingPos"      : data.bonesStartingPos,
            "internallyLit"         : extrnColor != undefined/*data.internallyLit*/
        };

        this.sceneData.objects[obj.name] = newData;

        if (newData.has_anims) {
            newData.animationStartIndex = data.animationStartIndex;
            newData.numAnimations = data.numAnimations;
        }

        var lst = this.objectList['moveable'][moveableID];
        if (!lst) {
            lst = [];
            this.objectList['moveable'][moveableID] = lst;
        }

        lst.push(obj);

        this.matMgr.createLightUniformsForObject(obj);

        if (addToScene) {
            this.sceneRender.add(obj);
        }

        if (setAnimation && data.has_anims) {
            this.anmMgr.setAnimation(obj, data.animationStartIndex, false);
        }

        return obj;
    },

    removeObjectFromScene : function(obj, removeBehaviours) {
        if (removeBehaviours === undefined) {
            removeBehaviours = true;
        }

        if (removeBehaviours) {
            this.bhvMgr.removeBehaviours(obj);
        }

        this.sceneRender.remove(obj);
    },

    collectObjectsWithAnimatedTextures_ : function(lst) {
        var objs = [];

        for (var objID in lst) {
            var lstObjs = lst[objID];

            if (!Array.isArray(lstObjs)) {
                lstObjs = [lstObjs];
            }

            for (var i = 0; i < lstObjs.length; ++i) {
                var obj = lstObjs[i],
                    materials = obj.material.materials;
            
                for (var m = 0; m < materials.length; ++m) {
                    var material = materials[m],
                        userData = material.userData;

                    if (!userData || !userData.animatedTexture) {
                        continue;
                    }

                    var animTexture = this.sceneData.animatedTextures[userData.animatedTexture.idxAnimatedTexture];

                    if (!animTexture.scrolltexture) {
                        objs.push(obj);
                        break;
                    }
                }
            }
        }
        
        return objs;
    },

    collectObjectsWithAnimatedTextures : function() {
        var objs = this.collectObjectsWithAnimatedTextures_(this.objectList['room']);
        
        objs = objs.concat(this.collectObjectsWithAnimatedTextures_(this.objectList['sprite']));

        objs = objs.concat(this.collectObjectsWithAnimatedTextures_(this.objectList['spriteseq']));

        return objs;
    },

	updateObjects : function (curTime) {
		this.gameData.curRoom = -1;

		this.sceneRender.traverse( (obj) => {
            var data = this.sceneData.objects[obj.name];

            if (!data) {
                return;
            }

            // Test camera room membership
			if (data.type == 'room') {
				if (obj.geometry.boundingBox.containsPoint(this.gameData.camera.position) && !data.isAlternateRoom) {
                //if (!data.isAlternateRoom && this.gameData.trlvl.isPointInRoom(this.gameData.camera.position, data.roomIndex)) {
					this.gameData.curRoom = data.roomIndex;
				}
			}

            // Set the visibility for the object
			if (this.gameData.singleRoomMode) {
				obj.visible = data.roomIndex == this.gameData.curRoom && !data.isAlternateRoom;
			} else {
				obj.visible = data.visible;
			}

			if (obj.boxHelper) {
                obj.boxHelper.visible = obj.visible;
            }

            // We continue only if it is a displayable object
			if (!(obj instanceof THREE.Mesh)) {
                return;
            }

            // Update material uniforms
            var materials = obj.material.materials,
                room = this.sceneData.objects['room' + data.roomIndex];
            
			if (!materials || !materials.length || !room) {
                return;
            }

			for (var i = 0; i < materials.length; ++i) {

				var material = materials[i];

				if (this.gameData.globalTintColor != null) {
					material.uniforms.tintColor.value = this.gameData.globalTintColor;
                }
                
				material.uniforms.curTime.value = curTime;
				material.uniforms.rnd.value = this.gameData.quantumRnd;
				material.uniforms.flickerColor.value = room && room.flickering ? this.gameData.flickerColor : this.gameData.unitVec3;
			}
        });
    },

    getRoomByPos : function(pos) {
        const roomList = this.objectList['room'];
        for (var r in roomList) {
            var obj = roomList[r], data = this.sceneData.objects[obj.name];
            if (data.isAlternateRoom) {
                continue;
            }
            if (obj.geometry.boundingBox.containsPoint(pos)) {
                return parseInt(r);
            }
        }
        return -1;
    }
    
}
