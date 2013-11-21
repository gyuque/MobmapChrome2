if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	function GeoCSVLoader(inFile) {
		this.attrMap = null;
		this.fileName = inFile.name;
		this.previewSink = new PreviewSink(this);
		this.baseLoader = new HugeCSVLoader(inFile);
		
		this.lineCountCache = -1;
	}

	GeoCSVLoader.prototype = {
		preload: function(listenerObject) { this.baseLoader.preload(listenerObject); },
		countLines: function() {
			if (this.lineCountCache >= 0) { return this.lineCountCache; }

			this.lineCountCache = this.baseLoader.countLines();
			return this.lineCountCache;
		},
		
		startPreviewLoad: function(callback) {
			this.previewSink.finishCallback = callback;
			this.baseLoader.startPreviewLoad(this.previewSink);
		},

		startFullLoad: function(listenerObject) {
			this.baseLoader.startFullLoad(listenerObject);
		},
		
		setAttributeMap: function(attrMap) {
			this.attrMap = attrMap;
		},
		
		applyAttributeMapToFieldList: function(fieldList) {
			
		}
	};

	// Data sink for preview phase ----------------------
	function PreviewSink(owner) {
		this.records = [];
		this.hasError = false;
		this.errorObject = null;
		this.owner = owner;
		this.finishCallback = null;
	}
	
	PreviewSink.prototype = {
		init: function() {
			this.records.length = 0;
			this.hasError = false;
			this.errorObject = null;
		},
		
		csvloaderReadLine: function(fields, lineno) {
			this.records.push(
				// fields is a temporary object.
				// WE MUST COPY IT
				fields.slice()
			);
		},
		
		csvloaderLineError: function(e) {
			this.hasError = true;
			this.errorObject = e;
		},
		
		csvloaderLoadFinish: function() {
			if (this.finishCallback) {
				this.finishCallback(!this.hasError, this.records);
			}
		}
	};

	// Base ---------------------------------------------------
	function HugeCSVLoader(inFile) {
		this.inputFile = inFile;
		this.inputBytes = null;
		this.loadJob = {
			currentPos: 0,
			step: 5000,
			lineno: 0,
			listenerObject: null
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
			
			for (i = 0;i < limit;i++) {
				var hasMore = this.readLine();
				if (!hasMore || hasMore === LINE_ERR) {break;}
			}
			
			if (hasMore === LINE_ERR) { return;}
			
			if (this.loadJob.listenerObject.csvloaderReportProgress) {
				this.loadJob.listenerObject.csvloaderReportProgress(this.loadJob.lineno);
			}

			if (hasMore && fullMode) {
				setTimeout(this.advanceClosure, 1, fullMode);
			} else {
				this.loadJob.listenerObject.csvloaderLoadFinish(this);
			}
		},

		readLine: function() {
			var buf = this.inputBytes;
			var eofPos = buf.length - 1;
			var pos = this.loadJob.currentPos;
			var k;

			temp_fields.length = 0;
			temp_chars.length = 0;
			for (;pos <= eofPos;++pos) {
				k = buf[pos];

				if (k === DELM || k === 0x0a || k === 0x0d || pos === eofPos) {
					if (pos === eofPos) {
						temp_chars.push(k);
					}

					temp_fields.push(this.bytesToString(temp_chars));
					temp_chars.length = 0;
				} else {
					temp_chars.push(k);
				}


				if (k === 0x0a || k === 0x0d || pos === eofPos) {
					++this.loadJob.lineno;
					break;
				}
			}

			// CRLF
			k = buf[pos+1];
			if (k === 0x0a || k === 0x0d) { ++pos; }
			this.loadJob.currentPos = ++pos;
//			console.log(pos);
			try {
				this.loadJob.listenerObject.csvloaderReadLine(temp_fields, this.loadJob.lineno-1);
			} catch(e) {
				if (this.loadJob.listenerObject.csvloaderLineError) {
					this.loadJob.listenerObject.csvloaderLineError(e);
				}
				return LINE_ERR;
			}

			return (pos <= eofPos);
		},

		startPreviewLoad: function(listenerObject) {
			this.loadJob.listenerObject = listenerObject;
			this.rewind();
			this.advance();
		},
		
		startFullLoad: function(listenerObject) {
			this.loadJob.listenerObject = listenerObject;
			this.rewind();
			this.advance(true);
		},
		
		rewind: function() {
			this.loadJob.currentPos = 0;
			this.loadJob.lineno = 0;
		},
		
		bytesToString: function(buf) {
			var len = buf.length;
			for (var i = 0;i < len;i++) {
				buf[i] = String.fromCharCode(buf[i]);
			}
			
			return buf.join('');
		}
	};

	var LINE_ERR = -1;
	var DELM = 0x2c;
	var temp_chars = [];
	var temp_fields = [];

	// +++ Export +++
	aGlobal.mobmap.GeoCSVLoader = GeoCSVLoader;
})(window);