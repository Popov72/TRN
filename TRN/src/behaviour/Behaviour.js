TRN.Behaviours = {
}

TRN.Consts.Behaviour = {
    "retKeepBehaviour" : 0,
    "retDontKeepBehaviour" : 1
}

TRN.Behaviours.applyBehaviours = function(objectList, sceneJSON, confMgr, parent) {
    
    function applyBehavioursSub(behaviours) {

        for (var bhv = 0; bhv < behaviours.size(); ++bhv) {
            var nbhv = behaviours[bhv], name = nbhv.getAttribute("name"), cutsceneOnly = nbhv.getAttribute("cutsceneonly");
    
            if (nbhv.__consumed || !TRN.Behaviours[name]) continue;
            if (cutsceneOnly && cutsceneOnly == "yes" && !sceneJSON.cutScene.frames) continue;
    
            // get the type and id of the object to apply the behaviour to
            var objectid = nbhv.getAttribute('objectid'), objecttype = nbhv.getAttribute('objecttype') || "moveable";
            
            if (objectid == "" || objectid == null) {
                if (!nbhv.parentNode) continue;
    
                objectid = nbhv.parentNode.getAttribute("id");
                objecttype = nbhv.parentNode.nodeName;
            }
    
            // get overriden data from the level (if any)
            // look first for a <behaviour> tag with the ssame objectid and objecttype as the current one
            var bhvLevel = jQuery(confMgr.levelParam(sceneJSON.levelShortFileName, 'behaviour[name="' + name + '"][objectid="' + objectid + '"]', false, true));
            if (bhvLevel.size() > 0) {
                var tp = bhvLevel[0].getAttribute("objecttype") || "moveable";
                if (tp != objecttype) {
                    bhvLevel = null;
                }
            }
            if (!bhvLevel || bhvLevel.size() == 0) {
                // not found. Look for a <behaviour> with the same name as the current one and without any of the objectid / objecttype attributes
                bhvLevel = jQuery(confMgr.levelParam(sceneJSON.levelShortFileName, 'behaviour[name="' + name + '"]', false, true));
                if (bhvLevel.size() > 0) {
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
    
            // get the objects to apply the behaviour to
            var lstObjs = objectList[objecttype];
            if (lstObjs && lstObjs[objectid]) {
                lstObjs = lstObjs[objectid];
                if (!Array.isArray(lstObjs)) {
                    lstObjs = [lstObjs];
                }
    
                // apply the behaviour
                var obhv = new TRN.Behaviours[name](nbhv, parent, objectid, objecttype);
    
                if (obhv.init(lstObjs) != TRN.Consts.Behaviour.retDontKeepBehaviour) {
                    TRN.Behaviours.behaviours.push(obhv);
    
                    var blst = TRN.Behaviours.behavioursByName[name];
                    if (!blst) {
                        blst = [];
                        TRN.Behaviours.behavioursByName[name] = blst;
                    }
                    blst.push(obhv);
                } else {
                    obhv = null;
                }
            }
        }
    }
    
    TRN.Behaviours.behaviours = [];
    TRN.Behaviours.behavioursByName = {};

    var behaviours = jQuery(confMgr.globalParam('behaviour', true));

    applyBehavioursSub(behaviours);

    behaviours = jQuery(confMgr.levelParam(sceneJSON.levelShortFileName, 'behaviour', false, true));
    
    applyBehavioursSub(behaviours);
}
