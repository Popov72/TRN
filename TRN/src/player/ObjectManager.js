TRN.ObjectManager = function(gameData) {
    this.sceneRender = gameData.sceneRender;
    this.sceneData = gameData.sceneData;

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

        this.sceneData.objects[mvb.name] = {
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

}
