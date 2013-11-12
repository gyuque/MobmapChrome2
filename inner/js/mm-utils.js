if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	aGlobal.createCleanHash = function() {
		var o = {__proto__:null};
		delete o.__proto__;

		return o;
	};

	aGlobal.makeStyleSheetRGB_BlendWhite = function(r, g, b) {
		return aGlobal.makeStyleSheetRGB(
			(r >> 1) + 127,
			(g >> 1) + 127,
			(b >> 1) + 127
		);
	};

	aGlobal.makeStyleSheetRGB_BlendWhite2 = function(r, g, b) {
		return aGlobal.makeStyleSheetRGB(
			(r >> 2) + 192,
			(g >> 2) + 192,
			(b >> 2) + 192
		);
	};

	aGlobal.makeStyleSheetRGB_BlendBlack = function(r, g, b) {
		return aGlobal.makeStyleSheetRGB(r >> 1, g >> 1, b >> 1);
	};
	
	aGlobal.makeStyleSheetRGB = function(r, g, b) {
		return 'rgb(' +r+ ',' +g+ ',' +b+ ')';
	};
	
	aGlobal.$BRAC = function(s) {
		return '(' +s+ ')';
	};

	aGlobal.$px = function(px) {
		return Math.floor(px) + 'px';
	};
	
	aGlobal.$T = function(s) {
		return document.createTextNode(s);
	};

	aGlobal.$H = function(tag, cls, id) {
		var el = document.createElement(tag);

		if (cls) {
			el.setAttribute("class", cls);
		}

		if (id) {
			el.id = id;
		}
		
		return el;
	};
})(window);