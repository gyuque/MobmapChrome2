(function(aGlobal) {
	'use strict';
	
	aGlobal.puts = function(s) {
		var j = $('#output');
		j.text( j.text() +"\n"+ s );
	}
	
	window.onload = function() {
		setTimeout(function() {
			startDownlaod(window.targetURL);
		}, 400);
	};
	
	function startDownlaod(url) {
		puts("Downloading: " + url);
		
		$.ajax({
			type: "GET",
			url: url,
			success: function(res, data_type, xhr){
				console.log( $.parseHTML(xhr.responseText) );
			}
		});
	}
	
})(window);