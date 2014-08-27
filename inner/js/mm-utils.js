if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	aGlobal.isMMRequiredAttribute = function(name)
		{ return (kRequiredAttributes.indexOf(name) >= 0); };

	aGlobal.replaceParentEventElement = function(selfElement, parentEventElement) {
		var cur = selfElement.parentNode;
		if (cur === parentEventElement) { return; }
		if (cur) { cur.removeChild(selfElement); }

		parentEventElement.appendChild(selfElement);
	}

	aGlobal.createCleanHash = function() {
		var o = {__proto__:null};
		delete o.__proto__;

		return o;
	};

	aGlobal.isNumbersNear = function(a, b) {
		var d = a - b;
		return (d > -0.000001 && d < 0.000001);
	};
	

	aGlobal.calcDistanceFromLatLng = function(x1, y1, x2, y2) {
		var DEG2RAD = Math.PI / 180.0;
		x1 *= DEG2RAD;
		y1 *= DEG2RAD;
		x2 *= DEG2RAD;
		y2 *= DEG2RAD;
		var dx = Math.abs(x2-x1);
		var dy = Math.abs(y2-y1);
		var phi = dy*0.5 + y1;

		var S = Math.sin(phi);
		var M = 6335439.0 / (Math.sqrt( Math.pow( (1- 0.006674*S*S) , 3) ));
		var N = 6378137.0 / Math.sqrt( 1- 0.006674*S*S );

		return Math.sqrt( Math.pow(M*dy, 2) + Math.pow(N*Math.cos(phi)*dx ,2) );
	};

	aGlobal.createCheckbox = function(cls, id) {
		var check = $H('input', cls, id);
		check.type = 'checkbox';
		return check;
	};

	aGlobal.createEventDummyElement = function() { return document.createElement('span'); } ;

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

	aGlobal.makeStyleSheetRGBA = function(r, g, b, a) {
		return 'rgba(' +r+ ',' +g+ ',' +b+ ',' +a+ ')';
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

	aGlobal.makeFieldSetWithLegend = function(legendText) {
		var fs = $H('fieldset');
		var lg = $H('legend');

		lg.appendChild( document.createTextNode(legendText) );
		fs.appendChild(lg);

		return fs;
	};

	aGlobal.generateRadioInLabel = function(labelText, radio_name, label_class) {
		return generateInputElementInLabel('radio', labelText, radio_name, label_class);
	};

	aGlobal.generateCheckboxInLabel = function(labelText, radio_name, label_class) {
		return generateInputElementInLabel('checkbox', labelText, radio_name, label_class);
	};

	aGlobal.generateInputElementInLabel = function(type, labelText, radio_name, label_class, label_in_front) {
		var le = $H('label');
		var r = $H('input');
		r.type = type;
		r.name = radio_name;
		
		if (label_class) {
			le.setAttribute('class', label_class);
		}
		
		if (label_in_front) { le.appendChild( document.createTextNode(labelText) ); }
		le.appendChild(r);
		if (!label_in_front) { le.appendChild( document.createTextNode(labelText) ); }
		return {label:le, input:r};
	};
	
	aGlobal.RGBColor = function(r,g,b) {
		this.r = r || 0;
		this.g = g || 0;
		this.b = b || 0;
	};
	
	aGlobal.RGBColor.prototype.toHTMLRGB = function() {
		return 'rgb(' +this.r+ ',' +this.g+ ',' +this.b+ ')';
	};

	aGlobal.RGBColor.prototype.equals = function(c) {
		return this.r === c.r && this.g === c.g && this.b === c.b;
	};
	
	aGlobal.parseHTMLRGBHex3 = function(hex) {
		return parseInt(hex.replace('#', '') , 16);
	},
	
	aGlobal.blendRGBColors = function(rgbOut, c1, c2, a2) {
		rgbOut.r = Math.min(255, c1.r*(1.0-a2) + c2.r*a2) | 0;
		rgbOut.g = Math.min(255, c1.g*(1.0-a2) + c2.g*a2) | 0;
		rgbOut.b = Math.min(255, c1.b*(1.0-a2) + c2.b*a2) | 0;
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
	
	function getDefaultHourPrefix(name, plu) {
		switch(name) {
		case 'sec':  return plu ? 'seconds' : 'second';
		case 'min':  return plu ? 'minutes' : 'minute';
		case 'hour': return plu ? 'hours' : 'hour';
		}
		
		return '';
	}
	
	function makeFixedNumber(n) {
		var d = Math.floor(n * 10) % 10;
		if (d === 0) {
			return Math.floor(n);
		} else {
			return n.toFixed(1);
		}
	}
	
	aGlobal.makePrettySecRange = function(s, messageProvider) {
		if (!messageProvider) {
			messageProvider = getDefaultHourPrefix;
		}
		
		if (s < 120) {
			return makeFixedNumber(s) +' '+ messageProvider('sec', s > 1);
		}
		
		if (s < 7200) {
			var m = (s / 60);
			return makeFixedNumber(m) +' '+ messageProvider('min', m > 1);
		}
		
		var h = (s / 3600);
		return makeFixedNumber(h) +' '+ messageProvider('hour', h > 1);
	}

	aGlobal.MMGradientStop = function(pos, r, g, b, a) {
		this.position = pos;
		this.r = r;
		this.g = g;
		this.b = b;
		this.a = a;
	};
	
	aGlobal.MMGradientStop.prototype.equals = function(s) {
		return this.position === s.position && 
		       this.r === s.r &&
		       this.g === s.g &&
		       this.b === s.b &&
		       this.a === s.a ;
	};
	
	aGlobal.MMGradientStop.prototype.copyFrom = function(s) {
		this.position = s.position;
		this.r = s.r;
		this.g = s.g;
		this.b = s.b;
		this.a = s.a;

		return this;
	};
	
	// Used for generated gradient colors
	aGlobal.CachedColorList = function() {
		this.list = new Array(100);
	};
	
	aGlobal.CachedColorList.prototype = {
		countColors: function() {
			return this.list.length;
		},
		
		getColor: function(ratio) {
			var index = Math.floor(ratio * 99.0);
			if (index < 0) { index = 0; }
			else if (index > 99) { index = 99; }
			
			return this.list[index];
		},
		
		makeCacheFromCanvas: function(cv) {
			var g = cv.getContext('2d');
			var w = cv.width - 0;
			var n = this.countColors();
			var imageData = g.getImageData(0, 0, w, 1);
			var pixels = imageData.data;
			var pos = 0;
			
			for (var i = 0;i < n;++i) {
				var t = i / (n-1);
				pos = Math.floor((w-1) * t) << 2;
				
				var cR = pixels[pos++];
				var cG = pixels[pos++];
				var cB = pixels[pos++];
				var cA = pixels[pos  ] / 255.0;
				
				this.list[i] = makeStyleSheetRGBA(cR, cG, cB, cA);
			}
		}
	};

	aGlobal.testSegmentCross = (function() {
		function matchDir(x1, y1, x2, y2, x3, y3, x4, y4, timeDir) {
			// Rotate x/y
			var dx1 = -(y2 - y1);
			var dy1 = x2 - x1;

			var dx2 = x4 - x3;
			var dy2 = y4 - y3;

			var dp = dx1 * dx2 + dy1 * dy2;
			if (!timeDir) { dp = -dp; }

			return dp;
		}

		return function (x1, y1, x2, y2, x3, y3, x4, y4, timeDir) {
		//console.log(x1, y1, x2, y2, x3, y3, x4, y4)
			if (
					((x1 - x2) * (y3 - y1) + (y1 - y2) * (x1 - x3)) *
					((x1 - x2) * (y4 - y1) + (y1 - y2) * (x1 - x4)) <= 0
				) {

				if (
						((x3 - x4) * (y1 - y3) + (y3 - y4) * (x3 - x1)) *
		            	((x3 - x4) * (y2 - y3) + (y3 - y4) * (x3 - x2)) <= 0
				) {
					return matchDir(x1, y1, x2, y2, x3, y3, x4, y4, timeDir);
				}
			}

			return null;
		} ;
	})();

	aGlobal.mmEscapeHTML = function(raw) {
	  var el = document.createElement('span');
	  el.appendChild(document.createTextNode(raw));
	  return el.innerHTML;
	};
	
	aGlobal.mmFindParentByTagName = function(node, tagName) {
		tagName = tagName.toLowerCase();

		node = node.parentNode;
		for (var i = 0;i < 10;++i) {
			if (!node) { return null; }
			
			if (node.tagName && node.tagName.toLowerCase() === tagName) {
				return node;
			}
			
			node = node.parentNode;
		}
		
		return null;
	};
	
	aGlobal.typedcolumnParseFieldName = function(raw) {
		var namePart;
		var atype = AttributeType.STRING;

		if (raw.indexOf(':') >= 0) {
			var sp_str = raw.split(':');
			namePart = sp_str[0];
			atype = typedcolumnGetTypeFromTypeNameString( sp_str[1] );
		} else {
			namePart = raw;
		}

		return {
			name: namePart,
			type: atype
		};
	};
	
	aGlobal.typedcolumnGetTypeFromTypeNameString = function(name) {
		switch( name.toLowerCase() ) {
		case 'int':    return AttributeType.INTEGER; break;
		case 'float':  return AttributeType.FLOAT;   break;
		case 'cfloat': return AttributeType.CFLOAT;  break;
		}
		
		return AttributeType.STRING;
	};
	
	aGlobal.removeForceRefreshParam = function(originalURL) {
		var re = "[\\?\\&]" + kForceRefreshParamName + "=[0-9]+";
		return originalURL.replace( new RegExp(re) , '');
	};
	
	aGlobal.addParameterAfterURL = function(originalURL, param) {
		var delim = '?';
		if ( (/\?/).test(originalURL) ) {
			var delim = '&';
		}
		
		return originalURL + delim + param;
	};
	
})(window);