if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function LayerMarkerOptions() {
		this.jEventElement = $( createEventDummyElement() );
		this.varyingType = LayerMarkerOptions.MV_NONE;
		this.tailType = LayerMarkerOptions.TAIL_NONE;
		this.tailInterval = 20;
		this.tailSegments = 2;
		this.tailFade = false;
		this.tailWidth = 2;
		this.tailColoring = LayerMarkerOptions.TC_MARKER_COLOR;
this.tailSpeedLimit = 0;
		this.showSelectedOnly = false;
		this.boundAttributeName = null;
		this.labelAttributeName = null;
		this.connectionAttributeName = null;
		this.connectionLineWidth = 2;
		this.enableConnectionArrow = true;
		this.labelDisplayLimit = 500;
		this.bLabelInverted = false;

		this.gstopConnectionStart = new MMGradientStop(0,    0,255,  0, 1);
		this.gstopConnectionEnd   = new MMGradientStop(1,    0,155,255, 1);
		
		this.indexMap = new LayerMarkerOptions.CustomIndexMapping();
	}
	
	LayerMarkerOptions.CHANGE_EVENT = "layer-marker-options-event-change";
	
	LayerMarkerOptions.prototype = {
		setParentEventElement: function(pe) {
			replaceParentEventElement(this.jEventElement[0], pe);
		},
		
		eventDispatcher: function() {
			return this.jEventElement;
		},
		
		setVaryingType: function(t) {
			if (this.varyingType !== t) {
				this.varyingType = t;
				this.fire(true);
			}
		},
		
		setTailType: function(t) {
			if (this.tailType !== t) {
				this.tailType = t;
				this.fire();
			}
		},

		setTailFade: function(f) {
			if (this.tailFade !== f) {
				this.tailFade = f;
				this.fire();
			}
		},

		setTailSegments: function(s) {
			if (this.tailSegments !== s) {
				this.tailSegments = s;
				this.fire();
			}
		},

		setTailInterval: function(i) {
			if (this.tailInterval !== i) {
				this.tailInterval = i;
				this.fire();
			}
		},

		setTailWidth: function(w) {
			if (this.tailWidth !== w) {
				this.tailWidth = w;
				this.fire();
			}
		},
		
		setTailColoring: function(c) {
			if (this.tailColoring !== c) {
				this.tailColoring = c;
				this.fire();
			}
		},
		
		setIndexMapEnabled: function(enabled, suppress_event) {
			if (this.indexMap.enabled !== enabled) {
				this.indexMap.enabled = enabled;
				if (!suppress_event) {
					this.fire(true);
				}
				
				return true;
			}
			
			return false;
		},
		
		updateIndexMap: function(sourceText, suppress_event) {
			var changed = this.indexMap.updateFromText(sourceText);
			if (changed && !suppress_event) {
				this.fire();
			}
			
			return changed;
		},

		bindAttributeName: function(a_name) {
			if (this.boundAttributeName !== a_name) {
				this.boundAttributeName = a_name;
				this.fire(true);
			}
		},
		
		bindLabelAttribute: function(a_name) {
			if (this.labelAttributeName !== a_name) {
				this.labelAttributeName = a_name;
				this.fire(false);
			}
		},
		
		bindConnectionAttributeName: function(a_name) {
			if (this.connectionAttributeName !== a_name) {
				this.connectionAttributeName = a_name;
				this.fire(false);
			}
		},
		
		setLabelDisplayLimit: function(n) {
			if (n < 1) {n=1;}
			else if (n > 10000) {n=10000;}
			
			if (this.labelDisplayLimit !== n) {
				this.labelDisplayLimit = n;
				this.fire(false);
			}
		},
		
		setLabelInverted: function(b) {
			if (this.bLabelInverted !== b) {
				this.bLabelInverted = b;
				this.fire(false);
			}
		},

		setShowSelectedOnly: function(newVal) {
			if (this.showSelectedOnly === newVal) { return; }
			this.showSelectedOnly = newVal;
			this.fire();
		},
		
		setConnectionLineGradient: function(startStopSource, endStopSource) {
			this.gstopConnectionStart.copyColorFrom(startStopSource);
			this.gstopConnectionEnd.copyColorFrom(endStopSource);
			
			this.fire(false);
		},
		
		setConnectionArrowEnabled: function(newVal) {
			if (this.enableConnectionArrow !== newVal) {
				this.enableConnectionArrow = newVal;
				this.fire(false);
			}
		},
		
		setConnectionLineWidth: function(newVal) {
			newVal = newVal | 0;
			
			if (this.connectionLineWidth !== newVal) {
				this.connectionLineWidth = newVal;
				this.fire(false);
			}
		},
		
		fire: function(affect_traj) {
			this.eventDispatcher().trigger(LayerMarkerOptions.CHANGE_EVENT, [this, !!affect_traj]);
		}
	};
	
	LayerMarkerOptions.CustomIndexMapping = function() {
		this.rawToIndexMap = {};
		this.lastError = 0;
		this.lastSource = null;
		this.enabled = false;
	};
	
	LayerMarkerOptions.CustomIndexMapping.prototype = {
		importMap: function(m) {
			for (var i in m) if (m.hasOwnProperty(i)) {
				this.rawToIndexMap[i] = m[i];
			}
		},
		
		clearMap: function() {
			var m = this.rawToIndexMap;
			for (var i in m) if (m.hasOwnProperty(i)) {
				delete m[i];
			}
		},
		
		updateFromText: function(source) {
			if (this.lastSource === source) {
				return false;
			}
			
			this.clear();
			this.parse(source);
			return true;
		},
		
		clear: function() {
			this.lastError = 0;

			var m = this.rawToIndexMap;
			for (var i in m) if (m.hasOwnProperty(i)) {
				delete m[i];
			}
		},
		
		parse: function(sourceText) {
			var pair_list = LayerMarkerOptions.CustomIndexMapping.splitTokens(sourceText);
			if (!pair_list) {
				this.lastError = -1;
			}
			
			for (var i in pair_list) {
				var pair = pair_list[i];
				this.rawToIndexMap[ pair.lefthand.content ] = pair.righthand.content;
			}
		},
		
		dump: function() {
			var m = this.rawToIndexMap;
			console.log('------------------------------------');
			for (var i in m) {
				console.log(i + ' => ', m[i])
			}
			console.log('------------------------------------');
		},
		
		mapValue: function(rawVal) {
			var m = this.rawToIndexMap;
			if (m.hasOwnProperty(rawVal)) {
				return m[rawVal];
			} else {
				return m['*'] || 0;
			}
		}
	};
	
	
	var RE_STRL = /^(('[^']*')|(\"[^\"]*\"))/ ;
	var RE_WS   = /^\s+/ ;
	var RE_DIGIT= /^([0-9]+)/ ;
	var RE_DELIM= /^(\:)/ ;
	var RE_WILDC= /^\*/ ;
	
	var kTokTypeDigit  = 0;
	var kTokTypeStrLit = 1;
	var kTokTypeDelim  = 2;
	var kTokTypeWildcard = 3;
	
	var kExpectRawValue = 0;
	var kExpectDelim    = 1;
	var kExpectIndex    = 2;
	
	LayerMarkerOptions.CustomIndexMapping.dequote = function(s) {
		return s.replace(/^['"]/, '').replace(/['"]$/, '');
	};
	
	LayerMarkerOptions.CustomIndexMapping.splitTokens = function(sourceText) {
		var exp = kExpectRawValue;
		var results = [];
		
		var tempRawValToken = null;
		
		for (var i = 0;i < 9999;++i) {
			sourceText = sourceText.replace(RE_WS, '');

			var foundToken = null;
			if (RE_STRL.test(sourceText)) {
				sourceText = sourceText.replace(RE_STRL, '');
				foundToken = {
					type: kTokTypeStrLit,
					content: LayerMarkerOptions.CustomIndexMapping.dequote( RegExp['$1'] )
				};
			} else if (RE_DIGIT.test(sourceText)) {
				sourceText = sourceText.replace(RE_DIGIT, '');
				var matched_digit = RegExp['$1'];
				foundToken = {
					type: kTokTypeDigit,
					content: parseInt(matched_digit, 10)
				};
			} else if (RE_DELIM.test(sourceText)) {
				sourceText = sourceText.replace(RE_DELIM, '');
				foundToken = {
					type: kTokTypeDelim
				};
			} else if (RE_WILDC.test(sourceText)) {
				sourceText = sourceText.replace(RE_WILDC, '');
				foundToken = {
					type: kTokTypeWildcard,
					content: '*'
				};
			} else {
				if (sourceText.length > 0) {
					// BAD token
					return null;
				}
			}
			
			switch(exp) {
				case kExpectRawValue:
					if (!foundToken) { return results; }
					if (foundToken.type === kTokTypeDigit || 
						foundToken.type === kTokTypeStrLit ||
						foundToken.type === kTokTypeWildcard) {
						tempRawValToken = foundToken;
						++exp;
					} else {
						// Error
						return null;
					}
					break;
					
				case kExpectDelim:
					if (!foundToken) { return null; /*Error*/ }
					if (foundToken.type !== kTokTypeDelim) { return null; /*Error*/ }
					
					++exp;
					break;

				case kExpectIndex:
					if (!foundToken) { return null; /*Error*/ }
					if (foundToken.type !== kTokTypeDigit) { return null; /*Error*/ }
					
					results.push({
						lefthand: tempRawValToken,
						righthand: foundToken
					});
					
					exp = kExpectRawValue;
					break;
			}
		}
		
		return null;
	};
	
	
	LayerMarkerOptions.MV_NONE = 0;
	LayerMarkerOptions.MV_ATTR = 1;
	LayerMarkerOptions.MV_DAY  = 2;

	LayerMarkerOptions.TAIL_NONE        = 0;
	LayerMarkerOptions.TAIL_WITH_MARKER = 1;
	LayerMarkerOptions.TAIL_ONLY        = 2;

	LayerMarkerOptions.TC_MARKER_COLOR = 0;
	LayerMarkerOptions.TC_DIRECTION    = 1;
	
	aGlobal.mobmap.LayerMarkerOptions = LayerMarkerOptions;
})(window);