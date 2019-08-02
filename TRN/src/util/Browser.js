if(!("pointerLockElement" in document)) {
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

if(!("fullscreenElement" in document)) {
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

TRN.Browser = {

    AudioContext :
		typeof(AudioContext) != 'undefined' ? new AudioContext() : 
		typeof(webkitAudioContext) != 'undefined' ? new webkitAudioContext() : 
		typeof(mozAudioContext) != 'undefined' ? new mozAudioContext() : null,

    bindRequestPointerLock : function(domElement) {
    	domElement.requestPointerLock = 
    		domElement.requestPointerLock    ||
    		domElement.mozRequestPointerLock ||
    		domElement.webkitRequestPointerLock;
    },

    bindRequestFullscreen : function(domElement) {
    	domElement.requestFullscreen = 
    		domElement.requestFullscreen    ||
    		domElement.mozRequestFullScreen ||
    		domElement.webkitRequestFullscreen ||
    		domElement.webkitRequestFullScreen;
    }
};

TRN.Browser.QueryString = function () {
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
