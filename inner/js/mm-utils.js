if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	aGlobal.isMMRequiredAttribute = function(name)
		{ return (kRequiredAttributes.indexOf(name) >= 0); };

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
	
	aGlobal.generateRadioInLabel = function(labelText, radio_name, label_class) {
		var le = $H('label');
		var r = $H('input');
		r.type = 'radio';
		r.name = radio_name;
		
		if (label_class) {
			le.setAttribute('class', label_class);
		}
		
		le.appendChild(r);
		le.appendChild( document.createTextNode(labelText) );
		return {label:le, input:r};
	};
	
	aGlobal.RGBColor = function(r,g,b) {
		this.r = r || 0;
		this.g = g || 0;
		this.b = b || 0;
	};
	
	aGlobal.hsvToRGB = function(aHSV) {
		var hue = aHSV[0] % 360;
		var sat = aHSV[1];
		var v = aHSV[2];
		var r, g, b;
		
		var h = hue / 60.0;
		var i = Math.floor(h);
		var f = h - i;
		var p = v * (1.0 - sat);
		var q = (i%2) ? v * (1.0 - f * sat) : v * (1.0 - (1.0 - f) * sat);
		
		switch(i) {
		case 0:
	 		r = v;
			g = q;
			b = p;
			break;
		case 1:
 			r = q;
			g = v;
			b = p;
			break;
		case 2:
			r = p;
			g = v;
			b = q;
			break;
		case 3:
			r = p;
			g = q;
			b = v;
			break;
		case 4:
			r = q;
			g = p;
			b = v;
			break;
		case 5:
			r = v;
			g = p;
			b = q;
			break;
		}
		
		aHSV[0] = Math.floor(r * 255);
		aHSV[1] = Math.floor(g * 255);
		aHSV[2] = Math.floor(b * 255);
	}
})(window);