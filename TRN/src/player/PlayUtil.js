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

						case TRN.Animation.Commands.Misc.ANIMCMD_MISC_COLORFLASH: {
							this.globalTintColor.x = this.globalTintColor.y = this.globalTintColor.z = (this.globalTintColor.x < 0.5 ? 1.0 : 0.1);
							break;
						}

						case TRN.Animation.Commands.Misc.ANIMCMD_MISC_GETLEFTGUN: {
							var oswap = this.scene.objects[this.lara.objNameForPistolAnim];

							if (oswap) {
								var mswap = new TRN.MeshSwap(oswap, obj);

								mswap.swap([this.lara.leftThighIndex, this.lara.leftHandIndex]);

								updateWebGLObjects = true;
							}
							break;
						}

						case TRN.Animation.Commands.Misc.ANIMCMD_MISC_GETRIGHTGUN: {
							var oswap = this.scene.objects[this.lara.objNameForPistolAnim];

							if (oswap) {
								var mswap = new TRN.MeshSwap(oswap, obj);

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

							if (oswap) {
								var mswap = new TRN.MeshSwap(obj, oswap);

								mswap.swapall();

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
