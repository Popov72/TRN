TRN.ProgressBar = function(domElement) {
	
	var html;

	jQuery.ajax({
		type: "GET",
		url: 'TRN/resource/progressbar.html',
		dataType: "html",
		cache: false,
		async: false
	}).done(function(data) { html = data; });

	this.elem = jQuery(html);

	this.elem.appendTo(this.domElement ? this.domElement : document.body);

	this.barWidth = this.elem.find('.progressbar').width();
}

TRN.ProgressBar.prototype = {

	constructor : TRN.ProgressBar,

	show : function() {

		this.elem.css('display', 'block');

	},

	hide : function() {

		this.elem.css('display', 'none');

	},

	progress : function(pct) {
		var bar = Math.floor(this.barWidth * pct);

		this.elem.find('.bar').css('width', bar + 'px');
	},

	setMessage : function(message) {
		
	    this.elem.find('.message').html(message);

	},

	showStart : function(callback) {
		this.elem.find('.message').css('display', 'none');
		this.elem.find('.progressbar').css('display', 'none');

		this.elem.find('.start').css('display', 'block');
		this.elem.find('.start').attr('class', 'start enabled');

		this.elem.find('.start').on('click', callback);
	}

}
