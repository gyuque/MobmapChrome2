(function(aGlobal) {
	'use strict';
	var baseURL = null;
	
	aGlobal.puts = function(s) {
		var j = $('#output');
		j.text( j.text() +"\n"+ s );
	}
	
	window.onload = function() {
		setTimeout(function() {
			startDownlaod(window.targetURL);
		}, 400);
	};
	
	function makeBaseURL(downloadURL) {
		var a = downloadURL.split('/');
		var protocol = a[0];
		var host = a[2];
		baseURL = protocol + '//' + host;		
	}
	
	function startDownlaod(url) {
		makeBaseURL(url);
		puts("Downloading: " + url);
		
		$.ajax({
			type: "GET",
			url: url,
			success: function(res, data_type, xhr){
				onDownloadSuccess(xhr.responseText);
			}
		});
	}
	
	function startDownloadGeoJSON(url) {
		puts("Data body URL: " + url);
		
		$.ajax({
			type: "GET",
			url: url,
			success: function(res, data_type, xhr){
				onJSONDownloadSuccess(xhr.responseText);
			}
		});
	}
	
	function makeCompleteURL(url) {
		if (url.indexOf('://') < 0) {
			return baseURL + url;
		} else {
			return url;
		}
	}
	
	function onDownloadSuccess(responseText) {
		var h = $.parseHTML(responseText);
		var jsonHref = findJSONLink( h );
		startDownloadGeoJSON( makeCompleteURL(jsonHref) );
	}
	
	function onJSONDownloadSuccess(responseText) {
		var ok = tinyCheckJSON(responseText);
		if (ok) {
			puts("[Success]");
			window.sendInnerMessage("loadDigitalTyphoonJson", {data: responseText});
			window.closeSelf();
		} else {
			puts("[Bad data]");
		}
	}
	
	var RE_TARGET_CLASS = /^name/i ;
	var RE_GEOJSON = /geojson/i ;
	
	function findJSONLink(parentObject) {
		var len = parentObject.length;
		for (var i = 0;i < len;++i) {
			var ch = parentObject[i];
			if (RE_TARGET_CLASS.test(ch.className)) {
				
				var links = $(ch).find('span a');
				var found_url = null;
				links.each(function(i, a_elem) {
					if (isGeoJSONLink(a_elem)) {
						found_url = a_elem.getAttribute('href');
					}
				});
				
				if (found_url) {
					return found_url;
				}
			}
		}
		
		return null;
	}
	
	function isGeoJSONLink(elem) {
		if (RE_GEOJSON.test(elem.innerHTML)) {
			return true;
		}
		
		return false;
	}
	
	function tinyCheckJSON(source) {
		if (source.indexOf('{') < 0) { return false; }
		if (source.indexOf('}') < 0) { return false; }
		if (source.indexOf('coordinates') < 0) { return false; }
		
		return true;
	}
})(window);