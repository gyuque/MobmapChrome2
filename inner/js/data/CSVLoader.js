if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	function GeoCSVLoader(inFile) {
		this.baseLoader = new HugeCSVLoader(inFile);
	}

	GeoCSVLoader.prototype = {
		preload: function(listenerObject) { this.baseLoader.preload(listenerObject); },
		countLines: function() { return this.baseLoader.countLines(); }
	};

	// Base ---------------------------------------------------
	function HugeCSVLoader(inFile) {
		this.inputFile = inFile;
		this.inputBytes = null;
		this.loadJob = {
			currentPos: 0,
			step: 5000,
			lineno: 0,
			callbacks: null
		};
		
		this.advanceClosure = this.advance.bind(this);
	}
	
	HugeCSVLoader.prototype = {
		preload: function(listenerObject) {
			var file = this.inputFile;
			var reader = new FileReader();
			
			reader.onloadend = (function(e) {
				var abuf = e.target.result;
				this.inputBytes = new Uint8Array(abuf, 0);
				listenerObject.csvloaderAfterPreloadFinish(this);
			}).bind(this);
			
			reader.onerror = function(e) {
				listenerObject.csvloaderPreloadError(e);
				alert(e);
			};
			
			reader.readAsArrayBuffer(file);
		},
		
		countLines: function() {
			var buf = this.inputBytes;
			var len = buf.length;
			var lc = 0;
			
			for (var i = 0;i < len;i++) {
				if (buf[i] === 0x0a) {
					++lc;
				} else {
					// last line?
					if (i === (len - 1) && i > 1) {
						if (buf[i  ] !== 0x0a && buf[i  ] !== 0x0d && 
							buf[i-1] !== 0x0a && buf[i-1] !== 0x0d) {
							++lc;
						}
					}
				}
			}

			return lc;
		},
		
		advance: function(fullMode) {
			var i;
			var limit = this.loadJob.step;
			if (limit > 10 && !fullMode) {limit=10;}
		}
	};

	// +++ Export +++
	aGlobal.mobmap.GeoCSVLoader = GeoCSVLoader;
})(window);