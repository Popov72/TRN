TRN.ObjectManager = function(gameData) {
    this.gameData = gameData;
    this.sceneRender = gameData.sceneRender;
    this.sceneData = gameData.sceneData;
    this.trlvl = gameData.trlvl;

    this.matMgr = gameData.matMgr;

    this.objectList = null;
    this.count = 0;

    this.buildLists();
}

TRN.ObjectManager.prototype = {

    constructor : TRN.ObjectManager,

    setBehaviourManager : function(bhvMgr) {
        this.bhvMgr = bhvMgr;
    },

    buildLists : function() {
        this.objectList = {};

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

    createMoveable : function(moveableID, roomIndex, addToScene) {
        if (addToScene === undefined) {
            addToScene = true;
        }

        var data = this.sceneData.objects['moveable' + moveableID];

        if (!data || !data.liveObj) {
            return null;
        }

        mvb = data.liveObj.clone();

        mvb.name = 'moveable' + moveableID + '_dyncreate_' + (this.count++);
        mvb.visible = true;
        mvb.matrixAutoUpdate = true;

        var newData = {
            "type"   	            : 'moveable',
            "roomIndex"             : roomIndex,
            "has_anims"				: data.has_anims,
            "hasScrollAnim"			: data.hasScrollAnim,
            "objectid"              : data.objectid,
            "visible"  				: true,
            "bonesStartingPos"      : data.bonesStartingPos,
            "attributes"            : data.attributes,
            "internallyLit"         : data.internallyLit,
            "lighting"              : data.lighting
        };

        this.sceneData.objects[mvb.name] = newData;

        if (newData.has_anims) {
            newData.animationStartIndex = data.animationStartIndex;
            newData.numAnimations = data.numAnimations;
        }

        var lst = this.objectList['moveable'][moveableID];
        if (!lst) {
            lst = [];
            this.objectList['moveable'][moveableID] = lst;
        }

        lst.push(mvb);

        this.matMgr.createLightUniformsForObject(mvb);

        if (addToScene) {
            this.sceneRender.add(mvb);
        }

        return mvb;
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
                //if (!data.isAlternateRoom && this.trlvl.isPointInRoom(this.gameData.camera.position, data.roomIndex)) {
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
