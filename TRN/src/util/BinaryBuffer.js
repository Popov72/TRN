TRN.BinaryBuffer = function (urlList, callback) {
    this.urlList = urlList;
    this.onload = callback;
    this.bufferList = new Array();
    this.loadCount = 0;
}

TRN.BinaryBuffer.prototype = {

    constructor : TRN.BinaryBuffer,

    loadBuffer : function(url, index) {

        var request = new XMLHttpRequest();
        request.open("GET", url, true);
        request.responseType = "arraybuffer";

        var loader = this;

        request.onerror = function() {
            console.log('BinaryBuffer: XHR error', request.status, request.statusText);
            if (++loader.loadCount == loader.urlList.length) {
                loader.onload(loader.bufferList);
            }
        }

        request.onreadystatechange = function() {
            if (request.readyState != 4) return;

            if (request.status != 200) {
    	   		console.log('Could not read a binary file. ', request.status, request.statusText);
                if (++loader.loadCount == loader.urlList.length) {
                    loader.onload(loader.bufferList);
                }
            } else {
                loader.bufferList[index] = request.response;
                if (++loader.loadCount == loader.urlList.length) {
                    loader.onload(loader.bufferList);
                }
            }
        }

    	request.send();
    },

    load : function() {
        for (var i = 0; i < this.urlList.length; ++i)
            this.loadBuffer(this.urlList[i], i);
    }
}
