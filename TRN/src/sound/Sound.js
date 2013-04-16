function BufferLoader(context, urlList, callback) {
    this.context = context;
    this.urlList = urlList;
    this.onload = callback;
    this.bufferList = new Array();
    this.loadCount = 0;
}

BufferLoader.prototype.loadBuffer = function(url, index) {

    // Load buffer asynchronously
    var request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.responseType = "arraybuffer";

    var loader = this;

/*    request.onload = function() {
        // Asynchronously decode the audio file data in request.response
        loader.context.decodeAudioData(
            request.response,
            function(buffer) {
                if (!buffer) {
                    alert('error decoding file data: ' + url);
                    return;
                }
                loader.bufferList[index] = buffer;
                if (++loader.loadCount == loader.urlList.length)
                    loader.onload(loader.bufferList);
            }    
        );
    }*/

    request.onerror = function() {
        console.log('BufferLoader: XHR error', request.status, request.statusText);
        if (++loader.loadCount == loader.urlList.length) {
            loader.onload(loader.bufferList);
        }
    }

    request.onreadystatechange = function() {
        if (request.readyState != 4) return;

        if (request.status != 200) {
	   		console.log('Could not read a sound file. ', request.status, request.statusText);
            if (++loader.loadCount == loader.urlList.length) {
                loader.onload(loader.bufferList);
            }
        } else {
            loader.context.decodeAudioData(
                request.response,
                function(buffer) {
                    if (!buffer) {
                        console.log('error decoding file data: ' + url);
                    } else {
                        loader.bufferList[index] = buffer;
                    }
                    if (++loader.loadCount == loader.urlList.length) {
                        loader.onload(loader.bufferList);
                    }
                }    
            );
        }
    }

	request.send();
}

BufferLoader.prototype.load = function() {
    for (var i = 0; i < this.urlList.length; ++i)
        this.loadBuffer(this.urlList[i], i);
}
