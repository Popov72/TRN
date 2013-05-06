TRN.Animation = {}

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

TRN.Animation.Track = function(numKeys, numFrames, frameRate, animFPS, nextTrack, nextTrackFrame, id) {
	
	this.numKeys = numKeys;
	this.numFrames = numFrames;
	this.frameRate = frameRate;
	this.animFPS = animFPS;
	this.nextTrack = nextTrack;
	this.nextTrackFrame = nextTrackFrame;
	this.id = id;
	this.remainingFrames = numFrames - parseInt((numFrames - 1) / frameRate) * frameRate;
	this.numDataPerKey = 99999;

	if (typeof(id) == 'undefined') this.id = 'track' + (++TRN.Animation.Track._counter);

	this.keys = [];
}

TRN.Animation.Track._counter = 0;

TRN.Animation.Track.prototype = {

	constructor : TRN.Animation.AnimTrack,

	addKey : function(key) {
		this.keys.push(key);

		this.numDataPerKey = Math.min(this.numDataPerKey, key.data.length);
		/*if (this.keys.length > 1 && key.data.length != this.keys[0].data.length) {
			console.log(key, this.keys[0], this);
			throw 'All keys must have the same number of data ! ';
		}*/
	},

	getLength : function() {
		return this.numFrames / this.animFPS;
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

	            this.param.interpFactor = this.activateInterpolation ? curKey - parseInt(curKey) : 0.0;
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

	    this.param.curKey = parseInt(curKey);

	    // Use the next key for the interpolation. Handle the case where the
	    // next key is in the next animation and not in the current one
	    var nextFrame = parseInt((this.param.curKey + 1) * this.track.frameRate);
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

				THREE.Quaternion.slerp(dataCurKey.quaternion, dataNextKey.quaternion, this.obj.bones[numData].quaternion, this.param.interpFactor);
			}
	    } else {
            this.nextTrackInstance.pushState();
            this.nextTrackInstance.setCurrentFrame(this.nextTrackInstanceFrame);

            this.nextTrackInstance.interpolate(this.interpolatedData, true);

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

			}

            this.nextTrackInstance.popState();
	    }

	}
}
