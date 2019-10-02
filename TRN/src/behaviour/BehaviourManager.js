TRN.Behaviours = {
}

TRN.Consts.Behaviour = {
    "retKeepBehaviour" : 0,
    "retDontKeepBehaviour" : 1
}

TRN.Behaviours.BehaviourManager = function(gameData) {
    this.gameData = gameData;

    this.sceneData = gameData.sceneData;
    this.confMgr = gameData.confMgr;

    this.behaviours = [];
    this.behavioursByName = {};
}

TRN.Behaviours.BehaviourManager.prototype = {

    constructor : TRN.Behaviours.BehaviourManager,

    setObjectManager : function(objMgr) {
        this.objMgr = objMgr;
    },

    removeBehaviours : function(obj) {
        if (obj.__behaviours) {
            obj.__behaviours.forEach( (bhv) => {

                var idx = this.behaviours.indexOf(bhv);
                if (idx !== -1) {
                    this.behaviours.splice(idx, 1);
                }

                var lst = this.behavioursByName[bhv.__name];
                if (lst) {
                    idx = lst.indexOf(bhv);
                    if (idx !== -1) {
                        lst.splice(idx, 1);
                    }
                }
            })

            delete obj.__behaviours;
        };
    },

    callFunction : function(funcname, params) {
        for (var i = 0; i < this.behaviours.length; ++i) {
            var bhv = this.behaviours[i];

            if (bhv[funcname]) bhv[funcname].apply(bhv, params);
        }
    },

    onBeforeRenderLoop : function() {
        this.callFunction('onBeforeRenderLoop', []);
    },

    frameStarted : function(curTime, delta) {
        this.callFunction('frameStarted', [curTime, delta]);
    },

    frameEnded : function(curTime, delta) {
        this.callFunction('frameEnded', [curTime, delta]);
    },

    getBehaviour : function(name) {
        return this.behavioursByName[name];
    },

    addBehaviour : function(name, params, objectid, objecttype, _lstObjs) {
        var lstObjs;

        if (_lstObjs !== undefined) {
            lstObjs = _lstObjs;
        } else {
            lstObjs = objecttype ? this.objMgr.objectList[objecttype] : null;

            if ((!lstObjs || !lstObjs[objectid]) && (objectid || objecttype)) {
                return;
            }

            if (lstObjs && lstObjs[objectid]) {
                lstObjs = lstObjs[objectid];
                if (!Array.isArray(lstObjs)) {
                    lstObjs = [lstObjs];
                }
            }
        }

        var obhv = new TRN.Behaviours[name](params, this.gameData, objectid, objecttype);

        obhv.__name = name;

        return new Promise( (resolve, reject) => {
            obhv.init(lstObjs, resolve);
        }).then( (res) => {
            if (res != TRN.Consts.Behaviour.retDontKeepBehaviour) {
                this.behaviours.push(obhv);
    
                if (lstObjs) {
                    lstObjs.forEach( (obj) => {
                        var lbhv = obj.__behaviours;
                        if (!lbhv) {
                            lbhv = [];
                            obj.__behaviours = lbhv;
                        }
                        lbhv.push(obhv);
                    });
                }
    
                var blst = this.behavioursByName[name];
                if (!blst) {
                    blst = [];
                    this.behavioursByName[name] = blst;
                }
                blst.push(obhv);
            } else {
                obhv = null;
            }
        });
    },

    loadBehaviours : function() {
        this.behaviours = [];
        this.behavioursByName = {};

        var behaviours = jQuery(this.confMgr.globalParam('behaviour', true));

        var allPromises = this.loadBehavioursSub(behaviours);

        behaviours = jQuery(this.confMgr.param('behaviour', false, true));
        
        allPromises = allPromises.concat(this.loadBehavioursSub(behaviours));

        return allPromises;
    },

    loadBehavioursSub : function(behaviours) {
        var promises = [];

        for (var bhv = 0; bhv < behaviours.size(); ++bhv) {
            var nbhv = behaviours[bhv], name = nbhv.getAttribute("name"), cutsceneOnly = nbhv.getAttribute("cutsceneonly");
    
            if (nbhv.__consumed || !TRN.Behaviours[name]) continue;
            if (cutsceneOnly && cutsceneOnly == "true" && !this.gameData.isCutscene) continue;
    
            // get the type and id of the object to apply the behaviour to
            var objectid = nbhv.getAttribute('objectid'), objecttype = nbhv.getAttribute('objecttype') || "moveable";
            
            if (objectid == "" || objectid == null) {
                if (!nbhv.parentNode) continue;
    
                objectid = nbhv.parentNode.getAttribute("id");
                objecttype = nbhv.parentNode.nodeName;
            }
    
            // get overriden data from the level (if any)
            // look first for a <behaviour> tag with the ssame objectid and objecttype as the current one
            var bhvLevel = jQuery(this.confMgr.param('behaviour[name="' + name + '"][objectid="' + objectid + '"]', false, true));
            if (bhvLevel.size() > 0 && bhvLevel[0] !== nbhv) {
                var tp = bhvLevel[0].getAttribute("objecttype") || "moveable";
                if (tp != objecttype) {
                    bhvLevel = null;
                }
            }
            if (!bhvLevel || bhvLevel.size() == 0) {
                // not found. Look for a <behaviour> with the same name as the current one and without any of the objectid / objecttype attributes
                bhvLevel = jQuery(this.confMgr.param('behaviour[name="' + name + '"]', false, true));
                if (bhvLevel.size() > 0 && bhvLevel[0] !== nbhv) {
                    if (bhvLevel[0].getAttribute("objectid") || bhvLevel[0].getAttribute("objecttype")) {
                        bhvLevel = null;
                    }
                }
            }
    
            // merge the data found in the level section (if any)
            nbhv = TRN.Helper.domNodeToJSon(nbhv);
    
            if (bhvLevel && bhvLevel.size() > 0) {
                bhvLevel[0].__consumed = true;
                bhvLevel = TRN.Helper.domNodeToJSon(bhvLevel[0]);
                Object.assign(nbhv, bhvLevel);
            }
    
            // create the behaviour
            promises.push(this.addBehaviour(name, nbhv, objectid, objecttype));
        }

        return promises;
    }

}
