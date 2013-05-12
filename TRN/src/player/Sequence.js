TRN.Sequence = function (numTiles, tileDispDuration) {	
	this.numberOfTiles = numTiles;
	this.tileDisplayDuration = tileDispDuration;

	// how long has the current image been displayed?
	this.currentDisplayTime = 0;

	// which image is currently being displayed?
	this.currentTile = 0;
}		

TRN.Sequence.prototype = {

	constructor : TRN.Sequence,

	update : function(milliSec) {
		this.currentDisplayTime += milliSec;
		while (this.currentDisplayTime > this.tileDisplayDuration) {
			this.currentDisplayTime -= this.tileDisplayDuration;
			this.currentTile++;
			if (this.currentTile == this.numberOfTiles)
				this.currentTile = 0;
		}
	}
}