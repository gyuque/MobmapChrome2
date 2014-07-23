if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function LayerMarkerOptions() {
		this.jEventElement = $( createEventDummyElement() );
		this.varyingType = LayerMarkerOptions.MV_NONE;
		this.tailType = LayerMarkerOptions.TAIL_NONE;
		this.tailInterval = 20;
		this.tailSegments = 6;
		this.tailFade = false;
		this.tailWidth = 2;
		this.tailColoring = LayerMarkerOptions.TC_MARKER_COLOR;
		this.showSelectedOnly = false;
		this.boundAttributeName = null;
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
				this.fire();
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

		bindAttributeName: function(a_name) {
			if (this.boundAttributeName !== a_name) {
				this.boundAttributeName = a_name;
				this.fire();
			}
		},
		
		setShowSelectedOnly: function(newVal) {
			if (this.showSelectedOnly === newVal) { return; }
			this.showSelectedOnly = newVal;
			this.fire();
		},
		
		fire: function() {
			this.eventDispatcher().trigger(LayerMarkerOptions.CHANGE_EVENT, this);
		}
	};
	
	LayerMarkerOptions.CustomIndexMapping = function() {
		this.rawToIndexMap = {};
	};
	
	LayerMarkerOptions.CustomIndexMapping.prototype = {
		parse: function(sourceText) {
			var pair_list = LayerMarkerOptions.CustomIndexMapping.splitTokens(sourceText);
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
		}
	};
	
	
	var RE_STRL = /^(('[^']*')|(\"[^\"]*\"))/ ;
	var RE_WS   = /^\s+/ ;
	var RE_DIGIT= /^([0-9]+)/ ;
	var RE_DELIM= /^(\:)/ ;
	
	var kTokTypeDigit  = 0;
	var kTokTypeStrLit = 1;
	var kTokTypeDelim  = 2;
	
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
		
		for (var i = 0;i < 999;++i) {
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
			}
			
			
			switch(exp) {
				case kExpectRawValue:
					if (!foundToken) { return results; }
					if (foundToken.type === kTokTypeDigit || foundToken.type === kTokTypeStrLit) {
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