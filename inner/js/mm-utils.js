if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	aGlobal.createCleanHash = function() {
		var o = {__proto__:null};
		delete o.__proto__;

		return o;
	};

	aGlobal.createCheckbox = function(cls, id) {
		var check = $H('input', cls, id);
		check.type = 'checkbox';
		return check;
	};

	aGlobal.createWrapperLabel = function(input, labelText, cls, id) {
		var lb = $H('label', cls, id);
		lb.appendChild(input);
		lb.appendChild($T(labelText));
		return lb;
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

	aGlobal.absoluteTimeToPrettyString = function(t) {
		var _2 = aGlobal.padding_02;
		if (t < 315360000) {
			var hr  = Math.floor(t / 3600);
			var min = Math.floor(t / 60) % 60;
			var sec = t % 60;
			
			return _2(hr) +':'+ _2(min) +':'+ _2(sec);
		} else {
			var dt = new Date(t * 1000);
			return dt.getFullYear() +'-'+ _2(dt.getMonth()+1) +'-'+ _2(dt.getDate()) +' '+
			       _2(dt.getHours()) +':'+ _2(dt.getMinutes()) +':'+ _2(dt.getSeconds());
		}
	};
	
	aGlobal.padding_02 = function(v) {
		if (v < 10) {  return '0' + v; }
		return v.toString();
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