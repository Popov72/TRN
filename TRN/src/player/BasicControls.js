var BasicControls = function ( object, domElement ) {

	var _this = this;

	this.STATES = { FASTER:0, FORWARD:1, LEFT:2, RIGHT:3, BACKWARD:4, UP:5, DOWN:6, ROTY:7, ROTNY:8, ROTX:9, ROTNX:10, SLOWER:11 };
	this.KEYS = { MOUSENX:300, MOUSEX:301, MOUSENY:302, MOUSEY:303 };

	this.object = object;
	this.domElement = ( domElement !== undefined ) ? domElement : document.body;
	this.enabled = true;
	this.captureMouse = false;
	
	object.useQuaternion = true;

	this.states = { 
		16: {state:this.STATES.FASTER,   on:false}, // SHIFT
		17: {state:this.STATES.SLOWER,   on:false}, // CTRL
		90: {state:this.STATES.FORWARD,  on:false}, // Z
		38: {state:this.STATES.FORWARD,  on:false}, // CURSOR UP
		81: {state:this.STATES.LEFT,     on:false}, // Q
		68: {state:this.STATES.RIGHT,    on:false}, // D
		83: {state:this.STATES.BACKWARD, on:false}, // S
		40: {state:this.STATES.BACKWARD, on:false}, // CURSOR DOWN
		32: {state:this.STATES.UP,       on:false}, // SPACE
		88: {state:this.STATES.DOWN,     on:false}, // X
		37: {state:this.STATES.ROTY,     on:false}, // CURSOR LEFT
		39: {state:this.STATES.ROTNY,    on:false}  // CURSOR RIGHT
	};
	this.states[this.KEYS.MOUSENX] = {state:this.STATES.ROTY,    on:false}; // mouse move -X
	this.states[this.KEYS.MOUSEX] =  {state:this.STATES.ROTNY,   on:false}; // mouse move +X
	this.states[this.KEYS.MOUSENY] = {state:this.STATES.ROTX,    on:false}; // mouse move -Y
	this.states[this.KEYS.MOUSEY] =  {state:this.STATES.ROTNX,   on:false}; // mouse move +Y
	
	this.factor = 1.0;
	this.moveFactor = 6000*TRN.Consts.worldScale;
	this.rotFactor = 100;
    this.mouseRotFactor = 10;
	
	this._mouseX = -1;
	this._mouseY = -1;
	this._mouseDeltaX = this._mouseDeltaY = 0;

    function pointerLockChange(oldEvent) {
    	var locked = document.pointerLockElement == _this.domElement; 
    	_this.captureMouse = locked;
    }

    var prefix = ['', 'webkit', 'moz'];
    for (var i = 0; i < prefix.length; ++i) {
    	document.addEventListener(prefix[i] + "pointerlockchange", pointerLockChange, false);
    	document.addEventListener(prefix[i] + "pointerlocklost", pointerLockChange, false);
    }
    
	function keydown( event ) {
		if ( _this.enabled === false ) return;

		if (_this.states[event.keyCode]) {
			_this.states[event.keyCode].on = true;
			event.preventDefault();
			event.stopPropagation();
		}
	}

	function keyup( event ) {
		if ( _this.enabled === false ) return;

		if (_this.states[event.keyCode]) {
			_this.states[event.keyCode].on = false;
			event.preventDefault();
			event.stopPropagation();
		}
	}
	
	function mousemove( event ) {
		if (document.pointerLockElement) {
			var mx = event.movementX || event.webkitMovementX || event.mozMovementX || 0;
			var my = event.movementY || event.webkitMovementY || event.mozMovementY || 0;
			_this._mouseDeltaX = mx;
			_this._mouseDeltaY = my;
		} else {
			if ( _this.enabled === false || !_this.captureMouse) return;

			var curMouseX = event.clientX;
			var curMouseY = event.clientY;

			_this._mouseDeltaX = _this._mouseX == -1 ? 0 : curMouseX - _this._mouseX;
			_this._mouseDeltaY = _this._mouseY == -1 ? 0 : curMouseY - _this._mouseY;
	
			_this._mouseX = curMouseX;        
			_this._mouseY = curMouseY;        
		}
        
        if (_this.states[_this.KEYS.MOUSENX]) _this.states[_this.KEYS.MOUSENX].on = _this._mouseDeltaX < 0;
        if (_this.states[_this.KEYS.MOUSEX])  _this.states[_this.KEYS.MOUSEX].on  = _this._mouseDeltaX > 0;
        if (_this.states[_this.KEYS.MOUSENY]) _this.states[_this.KEYS.MOUSENY].on = _this._mouseDeltaY < 0;
        if (_this.states[_this.KEYS.MOUSEY])  _this.states[_this.KEYS.MOUSEY].on  = _this._mouseDeltaY > 0;
	}
		
	function mousedown( event ) {
		if (event.button == 2) {
			_this.captureMouse = !_this.captureMouse;
			_this._mouseX = -1;
			_this._mouseY = -1;
			if (_this.captureMouse) {
				if (_this.domElement.requestPointerLock) {
					_this.domElement.requestPointerLock();
				}
			} else {
				if (document.exitPointerLock) {
					document.exitPointerLock();
				}
			}
		}
	}
	
	this.update = function(delta) {
		var rotX = 0.0, rotY = 0.0, translate = new THREE.Vector3();
		
        var moveScale = _this.factor * _this.moveFactor * delta;
        var rotScale = _this.factor * _this.rotFactor * delta;
        var rotMouseScale = _this.factor * _this.mouseRotFactor * delta;
        
		for (var state in _this.states) {
			var ostate = _this.states[state], isMouse = state >= 300;
			if (!ostate.on) continue;
			
			switch(ostate.state) {
				case _this.STATES.FASTER:
					moveScale *= 4;
					rotScale *= 3;
					rotMouseScale *= 3;
					break;
				case _this.STATES.SLOWER:
					moveScale /= 3;
					rotScale /= 3;
					rotMouseScale /= 3;
					break;
				case _this.STATES.FORWARD:
					translate.z = -moveScale;
					break;
				case _this.STATES.BACKWARD:
					translate.z = moveScale;
					break;
				case _this.STATES.LEFT:
					translate.x = -moveScale;
					break;
				case _this.STATES.RIGHT:
					translate.x = moveScale;
					break;
				case _this.STATES.UP:
					translate.y = moveScale;
					break;
				case _this.STATES.DOWN:
					translate.y = -moveScale;
					break;
				case _this.STATES.ROTY:
					if (isMouse) {
						rotY -= _this._mouseDeltaX * rotMouseScale;
					} else {
						rotY += rotScale;
					}
					break;
				case _this.STATES.ROTNY:
					if (isMouse) {
						rotY -= _this._mouseDeltaX * rotMouseScale;
					} else {
						rotY -= rotScale;
					}
					break;
				case _this.STATES.ROTX:
					if (isMouse) {
						rotX -= _this._mouseDeltaY * rotMouseScale;
					} else {
						rotX += rotScale;
					}
					break;
				case _this.STATES.ROTNX:
					if (isMouse) {
						rotX -= _this._mouseDeltaY * rotMouseScale;
					} else {
						rotX -= rotScale;
					}
					break;
			}
		}

		_this._mouseDeltaX = _this._mouseDeltaY = 0;
        if (_this.states[_this.KEYS.MOUSENX]) _this.states[_this.KEYS.MOUSENX].on = false;
        if (_this.states[_this.KEYS.MOUSEX])  _this.states[_this.KEYS.MOUSEX].on  = false;
        if (_this.states[_this.KEYS.MOUSENY]) _this.states[_this.KEYS.MOUSENY].on = false;
        if (_this.states[_this.KEYS.MOUSEY])  _this.states[_this.KEYS.MOUSEY].on  = false;
		
		var q = new THREE.Quaternion();
		q.setFromAxisAngle( {x:0,y:1,z:0}, THREE.Math.degToRad(rotY) );
		_this.object.quaternion = _this.object.quaternion.multiplyQuaternions(q, _this.object.quaternion);
		
		q = new THREE.Quaternion();
		q.setFromAxisAngle( (new THREE.Vector3(1,0,0)).applyQuaternion(_this.object.quaternion), THREE.Math.degToRad(rotX) );
		_this.object.quaternion = _this.object.quaternion.multiplyQuaternions(q, _this.object.quaternion);
		
		_this.object.position.add(translate.applyQuaternion(_this.object.quaternion));
	}

	this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );

	this.domElement.addEventListener( 'keydown', keydown, false );
	this.domElement.addEventListener( 'keyup', keyup, false );
	this.domElement.addEventListener( 'mousemove', mousemove, false );
	this.domElement.addEventListener( 'mousedown', mousedown, false );

};
