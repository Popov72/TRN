TRN.extend(TRN.Play.prototype, {

	getLaraConfig : function () {

		this.lara.objNameForPistolAnim = "pistolanim";

		this.lara.leftThighIndex = this.confMgr.levelNumber(this.sceneJSON.levelShortFileName, 
			'moveables > moveable[id="' + TRN.ObjectID.Lara + '"] > behaviour[name="Lara"] > pistol_anim > left_thigh', true, 0) - 1;

		this.lara.rightThighIndex = this.confMgr.levelNumber(this.sceneJSON.levelShortFileName, 
			'moveables > moveable[id="' + TRN.ObjectID.Lara + '"] > behaviour[name="Lara"] > pistol_anim > right_thigh', true, 0) - 1;

		this.lara.leftHandIndex = this.confMgr.levelNumber(this.sceneJSON.levelShortFileName, 
			'moveables > moveable[id="' + TRN.ObjectID.Lara + '"] > behaviour[name="Lara"] > pistol_anim > left_hand', true, 0) - 1;

		this.lara.rightHandIndex = this.confMgr.levelNumber(this.sceneJSON.levelShortFileName, 
			'moveables > moveable[id="' + TRN.ObjectID.Lara + '"] > behaviour[name="Lara"] > pistol_anim > right_hand', true, 0) - 1;
	},

	findObjectById : function(idObject) {

		for (var objID in this.scene.objects) {

			var objJSON = this.sceneJSON.objects[objID];

			if (objJSON.objectid == idObject) return this.scene.objects[objID];

		}

		return null;
	},

	processAnimCommands : function (trackInstance, prevFrame, curFrame, obj) {

		var commands = trackInstance.track.commands;
		var updateWebGLObjects = false;

		for (var i = 0; i < commands.length; ++i) {
			var command = commands[i];

			switch (command.cmd) {

				case TRN.Animation.Commands.ANIMCMD_MISCACTIONONFRAME: {

					var frame = command.params[0] - commands.frameStart, action = command.params[1];
					if (frame < prevFrame || frame >= curFrame) { continue; }

					//console.log(action,'done for frame',frame,obj.name)

					switch (action) {

						case TRN.Animation.Commands.Misc.ANIMCMD_MISC_GETLEFTGUN: {
							var obj = this.scene.objects[this.lara.objNameForPistolAnim];
							var lara = this.findObjectById(TRN.ObjectID.Lara);

							if (obj && lara) {
								var mswap = new TRN.MeshSwap(obj, lara);

								mswap.swap([this.lara.leftThighIndex, this.lara.leftHandIndex]);

								updateWebGLObjects = true;
							}
							break;
						}

						case TRN.Animation.Commands.Misc.ANIMCMD_MISC_GETRIGHTGUN: {
							var obj = this.scene.objects[this.lara.objNameForPistolAnim];
							var lara = this.findObjectById(TRN.ObjectID.Lara);

							if (obj && lara) {
								var mswap = new TRN.MeshSwap(obj, lara);

								mswap.swap([this.lara.rightThighIndex, this.lara.rightHandIndex]);

								updateWebGLObjects = true;
							}
							break;
						}

						case TRN.Animation.Commands.Misc.ANIMCMD_MISC_MESHSWAP1:
						case TRN.Animation.Commands.Misc.ANIMCMD_MISC_MESHSWAP2:
						case TRN.Animation.Commands.Misc.ANIMCMD_MISC_MESHSWAP3: {
							var idx = action - TRN.Animation.Commands.Misc.ANIMCMD_MISC_MESHSWAP1 + 1;
							var oswap = this.scene.objects['meshswap' + idx];
							var g = obj.geometry, m = obj.material;

							if (oswap) {
								obj.geometry = oswap.geometry;
								obj.material = oswap.material;

								oswap.geometry = g;
								oswap.material = m;

								delete obj.__webglInit; // make three js regenerates the webgl buffers
								delete oswap.__webglInit;

								updateWebGLObjects = true;
							} else {
								console.log('Could not apply anim command meshswap (' , action, '): object meshswap' + idx + ' not found.');
							}
							break;
						}

						case TRN.Animation.Commands.Misc.ANIMCMD_MISC_HIDEOBJECT: {
							obj.visible = false;
							break;
						}

						case TRN.Animation.Commands.Misc.ANIMCMD_MISC_SHOWOBJECT: {
							obj.visible = true;
							break;
						}
					}

					break;
				}
			}
		}

		this.needWebGLInit |= updateWebGLObjects;

	}

});
