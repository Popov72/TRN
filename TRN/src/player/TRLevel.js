TRN.TRLevel = function(trlevel) {
    this.trlevel = trlevel;
}

TRN.TRLevel.prototype = {

    constructor : TRN.TRLevel,

    getRoomByPos : function(pos) {
        const trlevel = this.trlevel,
              x = Math.floor(pos.x),
              y = -Math.floor(pos.y),
              z = -Math.floor(pos.z);

        for (let r = 0; r < trlevel.rooms.length; ++r) {
            const room = trlevel.rooms[r];
            if (room.isAlternate) {
                continue;
            }
            const mx = room.info.x + room.numXsectors * 1024;
            const mz = room.info.z + room.numZsectors * 1024;
            if (x >= room.info.x && x < mx && z >= room.info.z && z < mz && y >= room.info.yTop && y < room.info.yBottom) {
                return r;
            }
        }
        return -1;
    },

    isPointInRoom : function(pos, roomIndex) {
        const room = this.trlevel.rooms[roomIndex];

        const x = Math.floor(pos.x),
              y = -Math.floor(pos.y),
              z = -Math.floor(pos.z);

        const mx = room.info.x + room.numXsectors * 1024;
        const mz = room.info.z + room.numZsectors * 1024;

        if (x >= room.info.x && x < mx && z >= room.info.z && z < mz && y >= room.info.yTop && y < room.info.yBottom) {
            return true;
        }

        return false;
    }

}
