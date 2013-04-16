var camera, scene, sceneJSON, renderer, stats, controls, startTime = -1;
var clock = new THREE.Clock();

var trlevel_; // debug only => to be removed

function show(trlevel) {
	trlevel_ = trlevel;

	convert(trlevel, function(sceneJSON) {
		init(sceneJSON);
	});
}

function showInfo() {
	jQuery('#currentroom').html(sceneJSON.curRoom);
	jQuery('#camerapos').html(camera.position.x.toFixed(12)+','+camera.position.y.toFixed(12)+','+camera.position.z.toFixed(12));
	jQuery('#camerarot').html(camera.quaternion.x.toFixed(12)+','+camera.quaternion.y.toFixed(12)+','+camera.quaternion.z.toFixed(12)+','+camera.quaternion.w.toFixed(12));
}

function registerAnimation(objectID, animIndex, useOrigAnimation) {

	var anim = THREE.AnimationHandler.get(objectID + '_anim' + animIndex);
	if (anim != null) return anim;

	anim = useOrigAnimation ? sceneJSON.animations[animIndex] : jQuery.extend(true, {}, sceneJSON.animations[animIndex]);

	var mesh = sceneJSON.embeds['moveable' + objectID];
	var bones = mesh.bones;

	for (var b = 0; b < bones.length; ++b) {
		if (b < anim.hierarchy.length) {
			anim.hierarchy[b].parent = bones[b].parent;
			for (var k = 0; k < anim.hierarchy[b].keys.length; ++k) {
				var pos = anim.hierarchy[b].keys[k].pos;
				pos[0] += bones[b].pos_init[0];
				pos[1] += bones[b].pos_init[1];
				pos[2] += bones[b].pos_init[2];
			}
		} else {
			console.log("Problem when creating anim #" + animIndex + " for moveable with objectId " + objectID +
				": there are more bones (" + bones.length + ") in the moveable than in the anim (" + anim.hierarchy.length + ") !");
		}
	}

	anim.hierarchy.length = bones.length; // in case there are more bones in the anim than in the mesh
	anim.name = objectID + '_anim' + animIndex;

	THREE.AnimationHandler.add( anim );

	return anim;	
}

function callbackFinished(result) {

	scene = result;

	jQuery('#wireframemode').on('click', function() {
		for (var objID in scene.objects) {
			var obj = scene.objects[objID];
			if (!(obj instanceof THREE.Mesh)) continue;
			var materials = obj.material.materials;
			if (!materials || !materials.length) continue;
			for (var i = 0; i < materials.length; ++i) {
				var material = materials[i], userData = material.userData;
				material.wireframe = this.checked;
			}
		}
	});

	jQuery('#usefog').on('click', function() {
		for (var objID in scene.objects) {
			var obj = scene.objects[objID];
			if (!(obj instanceof THREE.Mesh)) continue;
			var materials = obj.material.materials;
			if (!materials || !materials.length) continue;
			for (var i = 0; i < materials.length; ++i) {
				var material = materials[i], userData = material.userData;
				material.fragmentShader = sceneJSON.shaderMgr.getFragmentShader(this.checked ? 'standard_fog' : 'standard');
				material.needsUpdate = true;
			}
		}
	});

	// make sure the sky is displayed first
	if (scene.objects.sky) {
		scene.objects.sky.renderDepth = -1e10;
		//scene.objects.sky.frustumCulled = false;
	}

	// initialize the animated textures
	scene.animatedTextures = sceneJSON.animatedTextures;
	for (var i = 0; i < scene.animatedTextures.length; ++i) {
		var animTexture = scene.animatedTextures[i];
		animTexture.progressor = new SequenceProgressor(animTexture.animcoords.length, 1.0/animTexture.animspeed);
	}

	// update position/quaternion for some specific items if we play a cut scene
	if (sceneJSON.cutScene.frames) {
		var min = sceneJSON.cutScene.animminid;
		var max = sceneJSON.cutScene.animmaxid;
		for (var objID in scene.objects) {
			var obj = scene.objects[objID];
			var objJSON = sceneJSON.objects[objID];

			if (objID.substr(0, 4) == 'item' && (objJSON.moveable == TRN.ObjectID.Lara || (objJSON.moveable >= min && objJSON.moveable <= max))) {
				obj.position.set(sceneJSON.cutScene.origin.x, sceneJSON.cutScene.origin.y, sceneJSON.cutScene.origin.z);
				var q = new THREE.Quaternion();
				q.setFromAxisAngle( {x:0,y:1,z:0}, THREE.Math.degToRad(sceneJSON.cutScene.origin.rotY) );
				obj.quaternion = q;
			}
		}
	}

	// start anim #0 for meshes with animations
	for (var objID in scene.objects) {
		var obj = scene.objects[objID];
		var objJSON = sceneJSON.objects[objID];

		if (!objJSON.has_anims) continue;

		if (sceneJSON.cutScene.frames) {
			var animator = function(obj, animIndex, objectID) {
				var curAnim = animIndex;
				return function(remainingTime) {
					var scurAnim = curAnim;

					curAnim = trlevel_.animations[scurAnim].nextAnimation;

					var nextFrame = trlevel_.animations[scurAnim].nextFrame - trlevel_.animations[curAnim].frameStart;

					if (scurAnim == curAnim) return;

					remainingTime += nextFrame / TRN.baseFrameRate;

					var anim = registerAnimation(objectID, curAnim, true);
					var animation = new THREE.Animation( obj, anim.name, THREE.AnimationHandler.LINEAR, this.callbackfn);

					animation.play( false, remainingTime );
					animation.update(0);
				}
			};

			// register all animations we will need in the cut scene
			var registered = {}, anmIndex = objJSON.animationStartIndex;
			while (true) {
				if (registered[anmIndex]) break;
				
				registered[anmIndex] = true;
				registerAnimation(objJSON.moveable, anmIndex, true);

				anmIndex = trlevel_.animations[anmIndex].nextAnimation;
			}

			var anim = registerAnimation(objJSON.moveable, objJSON.animationStartIndex, true);
			var animation = new THREE.Animation( obj, anim.name, THREE.AnimationHandler.LINEAR, animator(obj, objJSON.animationStartIndex, objJSON.moveable));

			animation.play( false );
			animation.update(0);

		} else {
			var anim = registerAnimation(objJSON.moveable, objJSON.animationStartIndex);
			var animation = new THREE.Animation( obj, anim.name, THREE.AnimationHandler.LINEAR );

			animation.play( true, Math.random()*anim.length );
			animation.update(0);
		}
	}

	// Set all objects except camera as auto update=false
	for (var objID in scene.objects) {
		var obj = scene.objects[objID];
		var objJSON = sceneJSON.objects[objID];

		if (!objJSON.has_anims && objID.indexOf('camera') < 0 && objID != 'sky') {
			obj.updateMatrix();
			obj.matrixAutoUpdate = false;
		}
	}

	// create the material for each mesh and set the loaded texture in the ShaderMaterial materials
	for (var objID in scene.objects) {
		var obj = scene.objects[objID];
		var objJSON = sceneJSON.objects[objID];

		if (!(obj instanceof THREE.Mesh)) continue;

		obj.geometry.computeBoundingBox();
		obj.frustumCulled = !sceneJSON.cutScene.frames; // hack because bounding spheres are not recalculated for skinned objects

		var material = new THREE.MeshFaceMaterial();
		obj.material = material;

		for (var mt_ = 0; mt_ < objJSON.material.length; ++mt_) {
			var elem = objJSON.material[mt_];
			if (typeof(elem) == 'string') {
				material.materials[mt_] = scene.materials[elem];
			} else {
				material.materials[mt_] = scene.materials[elem.material].clone();
				if (elem.uniforms) {
					material.materials[mt_].uniforms = THREE.UniformsUtils.merge([material.materials[mt_].uniforms, elem.uniforms]);
				}
				if (elem.attributes) {
					material.materials[mt_].attributes = elem.attributes;
					material.materials[mt_].attributes.flags.needsUpdate = true;
				}
				for (var mkey in elem) {
					if (!elem.hasOwnProperty(mkey) || mkey == 'uniforms' || mkey == 'attributes') continue;
					material.materials[mt_][mkey] = elem[mkey];
				}
			}
		}
		var materials = material.materials;
		if (!materials || !materials.length) continue;
		for (var i = 0; i < materials.length; ++i) {
			var material = materials[i];
			if (material instanceof THREE.ShaderMaterial) {
				if (material.uniforms.map && typeof(material.uniforms.map.value) == 'string' && material.uniforms.map.value) {
					material.uniforms.map.value = scene.textures[material.uniforms.map.value];
				}
				if (objJSON.filledWithWater) {
					material.uniforms.tintColor.value = new THREE.Vector3(sceneJSON.waterColor.in.r, sceneJSON.waterColor.in.g, sceneJSON.waterColor.in.b);
				}
				if (material.hasAlpha) {
					isTransparent = true;
					material.transparent = true;
					material.blending = THREE.AdditiveBlending;
					material.blendSrc = THREE.OneFactor;
					material.blendDst = THREE.OneMinusSrcColorFactor;
					material.depthWrite = false;
					material.needsUpdate = true;
				}
			}
		}
	}

/*	handle_update( result, 1 );

	result.scene.traverse( function ( object ) {
		if ( object.properties.rotating === true ) {

			rotatingObjects.push( object );

		}
	} );
*/
	camera = scene.currentCamera;
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	if (true) {
		// keel
		//camera.position.set(63514.36027899013,-3527.280854978113,-57688.901507514056);
		//camera.quaternion.set(-0.050579906399909495,-0.2148394919749775,-0.011142047403773734,0.9752750999262544);
		// wall
		//camera.position.set(26691.903842411888,880.9278880595274,-36502.99612845005);
		//camera.quaternion.set(-0.024892277143903293,0.6595324248145452,0.02186211933470944,0.7509456723991692);
		//camera.position.set(88862.25062021082,-19699.75129100216,-71066.57072532139);
		//camera.quaternion.set(0.019547182878385066,-0.9796215753522257,-0.16025495204163037,-0.1194898618798845);
		//camera.position.set(27301.841933835174,5789.926107567453,-40251.631452191861);
		//camera.quaternion.set(-0.014785860024,-0.951336377231,-0.046225492867,0.304306567275);
		// unwater
		//camera.position.set(80344.23082910081,5708.199004460822,-48651.619581856896);
		//camera.quaternion.set(0.005487008774905242,0.9860915773002777,0.16275151654342634,-0.03324511655818078);
	}
	
	controls = new BasicControls( camera, renderer.domElement );

	window.addEventListener( 'resize', onWindowResize, false );

	if (sceneJSON.cutScene.frames != null) {
		TRN.startSound(sceneJSON.cutScene.sound);
	}

	animate();
}

function handle_update( result, pieces ) {
	return;
	var m, material, count = 0;
	for ( m in result.materials ) {
		material = result.materials[ m ];
		if ( ! ( material instanceof THREE.MeshFaceMaterial || material instanceof THREE.ShaderMaterial || material.morphTargets ) ) {
			if( !material.program ) {
				renderer.initMaterial( material, result.scene.__lights, result.scene.fog );
				count += 1;
				if( count > pieces ) {
					//console.log("xxxxxxxxx");
					break;
				}
			}
		}
	}
}

function init(sc) {
	sceneJSON = sc;

	var container = document.getElementById( 'container' );

	if (renderer) {
		container.removeChild(renderer.domElement);
	}
	
	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setSize( window.innerWidth, window.innerHeight );
	//renderer.sortObjects = false;

	container.appendChild( renderer.domElement );

	stats = new Stats();
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.top = '0px';
	stats.domElement.style.right = '0px';
	stats.domElement.style.zIndex = 100;
	container.appendChild( stats.domElement );

	var loader = new THREE.SceneLoader();
	//loader.callbackSync = callbackSync;
	//loader.callbackProgress = callbackProgress;

	//loader.load(sceneJSON, callbackFinished);
	loader.parse(sceneJSON, callbackFinished, '');

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );

	render();

}

var quantum = 1000/TRN.baseFrameRate, quantumTime = (new Date()).getTime(), quantumRnd = 0;

function animate() {

	requestAnimationFrame( animate );

	var curTime = (new Date()).getTime();
	if (startTime == -1) startTime = curTime;
	if (curTime - quantumTime > quantum) {
		quantumRnd = Math.random();
		quantumTime = curTime;
	}

	curTime = curTime - startTime;

	var delta = clock.getDelta();

	THREE.AnimationHandler.update( delta );

	controls.update(delta);
	
	if (sceneJSON.cutScene.frames != null) {
		sceneJSON.cutScene.curFrame += TRN.baseFrameRate * delta;
		var cfrm = parseInt(sceneJSON.cutScene.curFrame);
		if (cfrm < sceneJSON.cutScene.frames.length) {
			var frm1 = sceneJSON.cutScene.frames[cfrm];
			var fov = frm1.fov * 70.0 / 16384.0;
			var roll = -frm1.roll * 180.0 / 32768.0;
			if (!controls.captureMouse) {

				var q = new THREE.Quaternion();
				q.setFromAxisAngle( {x:0,y:1,z:0}, THREE.Math.degToRad(sceneJSON.cutScene.origin.rotY) );

				var lkat = new THREE.Vector3(frm1.targetX, -frm1.targetY, -frm1.targetZ);
				lkat.applyQuaternion(q);

				camera.fov = fov;
				camera.position.set(frm1.posX, -frm1.posY, -frm1.posZ);
				camera.position.applyQuaternion(q);
				camera.lookAt(lkat);
				camera.position.add(sceneJSON.cutScene.origin);
				camera.quaternion.multiplyQuaternions(q.setFromAxisAngle( {x:0,y:1,z:0}, THREE.Math.degToRad(roll) ), camera.quaternion);
				camera.updateProjectionMatrix();
			}
		} else {
			sceneJSON.cutScene.frames = null;
		}
	}

	if (scene.objects.sky) {
		scene.objects.sky.position = camera.position;
	}

	for (var i = 0; i < scene.animatedTextures.length; ++i) {
		var animTexture = scene.animatedTextures[i];
		animTexture.progressor.update(delta);
	}

	var singleRoomMode = jQuery('#singleroommode').prop('checked');

	sceneJSON.curRoom = -1;

	for (var objID in scene.objects) {
		var obj = scene.objects[objID];
		if (sceneJSON.objects[objID].isRoom) {
			if (obj.geometry.boundingBox.containsPoint(camera.position) && !sceneJSON.objects[objID].isAlternateRoom) {
				sceneJSON.curRoom = sceneJSON.objects[objID].roomIndex;
			}
		}
		if (singleRoomMode) {
			obj.visible = sceneJSON.objects[objID].roomIndex == sceneJSON.curRoom && !sceneJSON.objects[objID].isAlternateRoom;
		} else {
			obj.visible = !sceneJSON.objects[objID].isAlternateRoom;
		}

		if (!(obj instanceof THREE.Mesh)) continue;

		var materials = obj.material.materials;
		if (!materials || !materials.length) continue;
		for (var i = 0; i < materials.length; ++i) {
			var material = materials[i], userData = material.userData;
			if (material instanceof THREE.ShaderMaterial) {
				material.uniforms.curTime.value = curTime;
				material.uniforms.rnd.value = quantumRnd;
				if (userData.animatedTexture) {
					var animTexture = scene.animatedTextures[userData.animatedTexture.idxAnimatedTexture];
					var coords = animTexture.animcoords[(animTexture.progressor.currentTile + userData.animatedTexture.pos) % animTexture.animcoords.length];
					material.uniforms.map.value = scene.textures[coords.texture];
					material.uniforms.offsetRepeat.value.x = coords.minU;
					material.uniforms.offsetRepeat.value.y = coords.minV;
				}
			}
		}
	}

	render();
}

function SequenceProgressor(numTiles, tileDispDuration) 
{	
	this.numberOfTiles = numTiles;
	this.tileDisplayDuration = tileDispDuration;

	// how long has the current image been displayed?
	this.currentDisplayTime = 0;

	// which image is currently being displayed?
	this.currentTile = 0;
		
	this.update = function(milliSec) {
		this.currentDisplayTime += milliSec;
		while (this.currentDisplayTime > this.tileDisplayDuration) {
			this.currentDisplayTime -= this.tileDisplayDuration;
			this.currentTile++;
			if (this.currentTile == this.numberOfTiles)
				this.currentTile = 0;
		}
	};
}		

function render() {
	renderer.render( scene.scene, camera );
	stats.update();
	showInfo();
}
