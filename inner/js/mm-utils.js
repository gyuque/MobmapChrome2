if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	aGlobal.createCleanHash = function() {
		var o = {__proto__:null};
		delete o.__proto__;

		return o;
	}
	
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