TRN.Animation = {}

TRN.Animation.Commands = {
	ANIMCMD_POSITIONREF3: 		1,
	ANIMCMD_POSITIONREF2: 		2,
	NIMCMD_SLAVEANIM: 			3,
	ANIMCMD_DEATHANIM: 			4,
	ANIMCMD_PLAYSOUNDONFRAME: 	5,
	ANIMCMD_MISCACTIONONFRAME: 	6
};

TRN.Animation.Commands.numParams = {
	1:	3,
	2:	2,
	3:	0,
	4:	0,
	5: 	2,
	6: 	2
};

TRN.Animation.Commands.Misc = {
	ANIMCMD_MISC_REVERTCAMERA:                      0,
	ANIMCMD_MISC_SHAKESCREEN_SOFT:                  1,
	ANIMCMD_MISC_UNK6:                              2,
	ANIMCMD_MISC_MAKEBUBBLE:                        3,
	ANIMCMD_MISC_UNK7:                              4,
	ANIMCMD_MISC_UNK13:                             5,
	ANIMCMD_MISC_UNK14:                             6,
	ANIMCMD_MISC_SHAKESCREEN_HARD:                  7,
	ANIMCMD_MISC_GETCROWBAR:                        8,
	ANIMCMD_MISC_REACTIVATEACTIONKEY:               12,
	ANIMCMD_MISC_COLORFLASH:                        13,
	ANIMCMD_MISC_GETRIGHTGUN:                       14,
	ANIMCMD_MISC_GETLEFTGUN:                        15,
	ANIMCMD_MISC_FIRERIGHTGUN:                      16,
	ANIMCMD_MISC_FIRELEFTGUN:                       17,
	ANIMCMD_MISC_MESHSWAP1:                         18,
	ANIMCMD_MISC_MESHSWAP2:                         19,
	ANIMCMD_MISC_MESHSWAP3:							20,
	ANIMCMD_MISC_UNK3:                              21,
	ANIMCMD_MISC_UNK4:                              22,
	ANIMCMD_MISC_HIDEOBJECT:                        23,
	ANIMCMD_MISC_SHOWOBJECT:                        24,
	ANIMCMD_MISC_CAMERACTRL3:                       26,
	ANIMCMD_MISC_ADDITIONALSOUND1:                  -32736,
	ANIMCMD_MISC_PLAYSTEPSOUND:                     32,
	ANIMCMD_MISC_GETWATERSKIN:                      43,
	ANIMCMD_MISC_PUTBACKWATERSKIN:                  44,
	ANIMCMD_MISC_ADDITIONALSOUND2:                  16416
};

TRN.Animation.Key = function(time, boundingBox) {

	this.time = time;
	this.boundingBox = boundingBox;
	this.data = [];
}

TRN.Animation.Key.prototype = {

	constructor : TRN.Animation.AnimKey,

	addData : function(pos, rot) {
		this.data.push({
			position: 	pos,
			quaternion: rot
		});
	}
}

TRN.Animation.Track = function(numKeys, numFrames, frameRate, animFPS, id) {
	
	this.numKeys = numKeys;
	this.numFrames = numFrames;
	this.frameRate = frameRate;
	this.animFPS = animFPS;
	this.nextTrack = 0;
	this.nextTrackFrame = 0;
	this.id = id;
	this.remainingFrames = numFrames - Math.floor((numFrames - 1) / frameRate) * frameRate;
	this.numDataPerKey = 99999;
	this.boundingBox = new THREE.Box3();

	if (typeof(id) == 'undefined') this.id = 'track' + (++TRN.Animation.Track._counter);

	this.keys = [];
	this.commands = [];
}

TRN.Animation.Track._counter = 0;

TRN.Animation.Track.prototype = {

	constructor : TRN.Animation.AnimTrack,

	addKey : function(key) {
		this.keys.push(key);

		this.numDataPerKey = Math.min(this.numDataPerKey, key.data.length);

		this.boundingBox.union(key.boundingBox);
	},

	getLength : function() {
		return this.numFrames / this.animFPS;
	},

	setNextTrack : function(track, frame) {
		this.nextTrack = track;
		this.nextTrackFrame = frame;
	},

	setCommands : function(commands) {
		this.commands = commands;
	}

}

TRN.Animation.TrackInstance = function(track, obj, bonesStartingPos) {

	this.track = track;
	this.obj = obj;
	this.bonesStartingPos = bonesStartingPos;

	this.overallSpeed = 1.0;
	this.activateInterpolation = true;

	this.nextTrackInstance = null;
	this.nextTrackInstanceFrame = 0;

	this.noInterpolationToNextTrack = false;
	this.noInterpolationToNextTrackValue = 0.0;

	this.interpolatedData = null;

	this.param = {
		curKey : 0,
		curFrame : 0.0,
		interpFactor : 0.0,
		nextKeyIsInCurrentTrack : true
	};

	this.pushState();
}

TRN.Animation.TrackInstance.prototype = {

	constructor : TRN.Animation.TrackInstance,

	pushState : function() {
		this.paramSave = jQuery.extend(true, {}, this.param);
	},

	popState : function() {
		this.param = jQuery.extend(true, {}, this.paramSave);
	},

	setNextTrackInstance : function(trackInstance, frame) {
		if (frame >= trackInstance.track.numFrames) frame = 0;

		this.nextTrackInstance = trackInstance;
		this.nextTrackInstanceFrame = frame;
	},

	getKeyFromFrame : function(frame) { 
		return frame / this.track.frameRate;
	},

	makeCache : function() {
		this.interpolatedData = [];
		for (var numData = 0; numData < this.track.numDataPerKey; ++numData) {
			this.interpolatedData.push({
				position : { x:0, y:0, z:0 },
				quaternion : new THREE.Quaternion()
			});
		}
	},

	runForward : function(elapsedTime) {
		this.param.curFrame += (elapsedTime * this.track.animFPS) * this.overallSpeed;

		return this.setCurrentFrame(this.param.curFrame);
	},

	setCurrentFrame : function(frame) {
		this.param.curFrame = frame;

	    // Have we reached the end of the animation ?
	    if (this.param.curFrame >= this.track.numFrames) {

			// Yes. Is the next animation not the current one ?
	        if (this.nextTrackInstance.track.id != this.track.id) {

	            // Yes. The caller must handle this situation
	            var curKey = this.param.curFrame / this.track.frameRate;

	            this.param.interpFactor = this.activateInterpolation ? curKey - Math.floor(curKey) : 0.0;
				this.noInterpolationToNextTrack = false;

	            return false;
	        }

            // The next animation is the current one (looping). Reset internal variables
            this.param.curFrame -= this.track.numFrames;
            this.param.curFrame += this.nextTrackInstanceFrame;
            
            // The next test should always fail, but if the frame rate is *very* bad
            // (elapsedTime is huge), it could succeed
            if (this.param.curFrame >= this.track.numFrames) this.param.curFrame = this.track.numFrames - 1;

			this.noInterpolationToNextTrack = false;
	    }

	    // Calculate the current key
	    var curKey = this.param.curFrame / this.track.frameRate;

	    this.param.curKey = Math.floor(curKey);

	    // Use the next key for the interpolation. Handle the case where the
	    // next key is in the next animation and not in the current one
	    var nextFrame = Math.floor((this.param.curKey + 1) * this.track.frameRate);
	    var speedFactor = 1.0;

	    if (nextFrame < this.track.numFrames) {
	        // The key to use for the interpolation is the next one in the current animation
	        this.param.nextKeyIsInCurrentTrack = true;
	    } else {
	        // The next key is in the next animation
	        this.param.nextKeyIsInCurrentTrack = false;

	        // speedFactor is used to correctly interpolate the last key of the animation with
	        // the first one of the next animation. Indeed, interpolation would fail if the number
	        // of frames after the last key of the current animation is not equal to the animation
	        // frameRate (which is possible)
	        speedFactor = this.track.frameRate / this.track.remainingFrames;
	    }

        this.param.interpFactor = this.activateInterpolation ? (curKey - this.param.curKey) * speedFactor : 0.0;

		if (!this.param.nextKeyIsInCurrentTrack && this.noInterpolationToNextTrack) {
			this.param.interpFactor = this.noInterpolationToNextTrackValue;
		}

	    return true;
	},

	interpolate : function(buffer, detectRecursInfinite) {

		if (!this.interpolatedData) this.makeCache();

    	var curKey = this.param.curKey;
    	var internalBuffer = buffer == null;

    	if (internalBuffer) buffer = this.obj.bones;

	    if (this.param.nextKeyIsInCurrentTrack || this.track.numKeys == 1 || detectRecursInfinite) {
	    	var nextKey = curKey + 1;

	        if (nextKey >= this.track.numKeys) nextKey = 0; // to handle animations with only one key

	        if (detectRecursInfinite && !this.param.nextKeyIsInCurrentTrack && this.track.numKeys != 1) {
	        	nextKey = this.track.numKeys - 1;
	        }

			for (var numData = 0; numData < this.track.numDataPerKey; ++numData) {

			    var dataCurKey  = this.track.keys[curKey].data[numData];
			    var dataNextKey = this.track.keys[nextKey].data[numData];

			    buffer[numData].position.x = dataCurKey.position.x + (dataNextKey.position.x - dataCurKey.position.x) * this.param.interpFactor;
			    buffer[numData].position.y = dataCurKey.position.y + (dataNextKey.position.y - dataCurKey.position.y) * this.param.interpFactor;
			    buffer[numData].position.z = dataCurKey.position.z + (dataNextKey.position.z - dataCurKey.position.z) * this.param.interpFactor;

			    if (internalBuffer) {
			    	buffer[numData].position.x += this.bonesStartingPos[numData].pos_init[0];
			    	buffer[numData].position.y += this.bonesStartingPos[numData].pos_init[1];
			    	buffer[numData].position.z += this.bonesStartingPos[numData].pos_init[2];
			    }

				THREE.Quaternion.slerp(dataCurKey.quaternion, dataNextKey.quaternion, buffer[numData].quaternion, this.param.interpFactor);
			}
	    } else {
            this.nextTrackInstance.pushState();
            this.nextTrackInstance.setCurrentFrame(this.nextTrackInstanceFrame);

            this.nextTrackInstance.interpolate(this.interpolatedData, true);

            this.nextTrackInstance.popState();

			for (var numData = 0; numData < this.track.numDataPerKey; ++numData) {
			    var dataCurKey  = this.track.keys[curKey].data[numData];
			    var dataNextKey = this.interpolatedData[numData];

			    buffer[numData].position.x = dataCurKey.position.x + (dataNextKey.position.x - dataCurKey.position.x) * this.param.interpFactor;
			    buffer[numData].position.y = dataCurKey.position.y + (dataNextKey.position.y - dataCurKey.position.y) * this.param.interpFactor;
			    buffer[numData].position.z = dataCurKey.position.z + (dataNextKey.position.z - dataCurKey.position.z) * this.param.interpFactor;

			    if (internalBuffer) {
			    	buffer[numData].position.x += this.bonesStartingPos[numData].pos_init[0];
			    	buffer[numData].position.y += this.bonesStartingPos[numData].pos_init[1];
			    	buffer[numData].position.z += this.bonesStartingPos[numData].pos_init[2];
			    }

				THREE.Quaternion.slerp(dataCurKey.quaternion, dataNextKey.quaternion, buffer[numData].quaternion, this.param.interpFactor);
			}

	    }

	}
}
