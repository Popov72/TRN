TRN.BinaryBuffer = function (urlList) {
    this.urlList = urlList;
    this.bufferList = new Array();
    this.loadCount = 0;
}

TRN.BinaryBuffer.prototype = {

    constructor : TRN.BinaryBuffer,

    loadBuffer : function(url, index, resolve) {

        var request = new XMLHttpRequest();

        request.open("GET", url, true);
        request.responseType = "arraybuffer";

        request.onerror = () => {
            console.log('BinaryBuffer: XHR error', request.status, request.statusText);
            if (++this.loadCount == this.urlList.length) {
                resolve(this.bufferList);
            }
        }

        request.onreadystatechange = () => {
            if (request.readyState != 4) return;

            if (request.status != 200) {
    	   		console.log('Could not read a binary file. ', request.status, request.statusText);
                if (++this.loadCount == this.urlList.length) {
                    resolve(this.bufferList);
                }
            } else {
                this.bufferList[index] = request.response;
                if (++this.loadCount == this.urlList.length) {
                    resolve(this.bufferList);
                }
            }
        }

    	request.send();
    },

    load : function() {
        return new Promise(( resolve, reject ) => {
            for (var i = 0; i < this.urlList.length; ++i) {
                this.loadBuffer(this.urlList[i], i, resolve);
            }
        } );
    }
}
