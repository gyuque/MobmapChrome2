if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	function MeshCSVLoader(inFile) {
		this.fileName = inFile.name;
		this.meshDataListener = null;
		this.baseLoader = new mobmap.HugeCSVLoader(inFile);
		this.readMode = MeshCSVLoader.RMODE_META;
		this.dataType = MeshCSVLoader.DTYPE_STATIC;
		this.usingMeshCode = null;
		this.meshDefinition = {
			originLat: 30,
			originLng: 130,
			stepLat: 0.01,
			stepLng: 0.01
		};
		
		this.rawMetadataLines = [];
	}

	MeshCSVLoader.RMODE_META = 0;
	MeshCSVLoader.RMODE_BODY = 1;

	MeshCSVLoader.DTYPE_UNKNOWN = -1;
	MeshCSVLoader.DTYPE_STATIC  =  0;
	MeshCSVLoader.DTYPE_DYNAMIC =  1;

	MeshCSVLoader.prototype = {
		preload: function(listenerObject) {
			this.baseLoader.preload(listenerObject);
		},
		
		readMetadata: function() {
			this.readMode = MeshCSVLoader.RMODE_META;
			this.dataType = MeshCSVLoader.DTYPE_UNKNOWN;
			this.baseLoader.loadOneLine(this);
			this.baseLoader.loadOneLine(this);
		},

		readRestContentAsync: function(listener) {
			this.meshDataListener = listener;
			this.readMode = MeshCSVLoader.RMODE_BODY;
			this.baseLoader.startFullLoad(this, true);
		},
		
		isValidType: function() {
			return (this.dataType === MeshCSVLoader.DTYPE_DYNAMIC ||
				    this.dataType === MeshCSVLoader.DTYPE_STATIC) ;
		},
		
		isDynamic: function() {
			return (this.dataType === MeshCSVLoader.DTYPE_DYNAMIC);
		},

		// Metadata lines - - - - - - - -
		readMetaFields: function(fields) {
			if (fields.length < 1) { return; }

			this.rawMetadataLines.push(fields.join(','));

			var firstCol = fields[0];
			if (firstCol.indexOf('@') === 0) {
				if (this.isMetaUseMeshCode(firstCol)) {
					var level = fields[1] ? parseInt(fields[1], 10) : 1;
					this.setupMeshCodeMode( level );
				} else {
					this.readDataType(firstCol);
				}
			} else {
				this.readMeshDefinitionFields(fields);
			}
		},

		isMetaUseMeshCode: function(metaStr) {
			var lw = metaStr.toLowerCase();
			if (lw.indexOf('use-mesh-code') >= 0) {
				return true;
			}
			
			return false;
		},
		
		setupMeshCodeMode: function(meshLevel) {
			// Japanese mesh code mode
			this.usingMeshCode = {
				level: meshLevel
			};

			var md = this.meshDefinition;
			md.originLat = 0;
			md.originLng = 100;

			switch(meshLevel) {
			case 4:
			// 4-ji (2x2 div of 3-ji)
				md.stepLat = (1.0 / 1.5) / 160.0;
				md.stepLng = (1.0      ) / 160.0;
				break;

			case 3:
			// 3-ji (1/10 of 2-ji)
				md.stepLat = (1.0 / 1.5) / 80.0;
				md.stepLng = (1.0      ) / 80.0;
				break;
				
			case 2:
			// 2-ji (1/8 of 1-ji)
				md.stepLat = (1.0 / 1.5) / 8.0;
				md.stepLng = (1.0      ) / 8.0;
				break;
				
			default:
			// 1-ji
				md.stepLat = 1.0 / 1.5;
				md.stepLng = 1.0;
				break;
			}
		},

		readDataType: function(typeStr) {
			// console.log("typeStr=", typeStr);
			var lw = typeStr.toLowerCase();
			
			if (lw.indexOf('dynamic-mesh') >= 0) {
				this.dataType = MeshCSVLoader.DTYPE_DYNAMIC;
				// console.log("Type: Dynamic mesh");
			} else if (lw.indexOf('static-mesh') >= 0) {
				this.dataType = MeshCSVLoader.DTYPE_STATIC;
				// console.log("Type: Static mesh");
			} else {
				this.dataType = MeshCSVLoader.DTYPE_UNKNOWN;
			}
		},

		readMeshDefinitionFields: function(fields) {
			var df = this.meshDefinition;
			
			df.originLat = parseFloat( fields[0] );
			df.originLng = parseFloat( fields[1] );
			df.stepLat   = parseFloat( fields[2] );
			df.stepLng   = parseFloat( fields[3] );
			// console.log(this.meshDefinition)
		},

		readContentFields: function(fields) {
			var latIndexCol = 0;
			var lngIndexCol = 1;
			var valueCol    = 2;
			var seconds = 0;
			
			if (this.dataType === MeshCSVLoader.DTYPE_DYNAMIC) {
				var rawT = fields[0];
				seconds = mobmap.GeoCSVLoader.parseFieldTime(rawT);
				
				++latIndexCol;
				++lngIndexCol;
				++valueCol;
			}
			
			var latI, lngI, cellName = null;
			if (!this.usingMeshCode) {
				latI = parseInt( fields[latIndexCol] , 10);
				lngI = parseInt( fields[lngIndexCol] , 10);
			} else {
				// Mesh-code mode
				var meshCode = parseInt( fields[latIndexCol] , 10);
				latI = this.calcLatIndexFromMeshCode(meshCode);
				lngI = this.calcLngIndexFromMeshCode(meshCode);
				--valueCol;
				
				cellName = meshCode;
			}
			var val  = parseFloat( fields[valueCol] );
			
			if (this.meshDataListener &&
				this.meshDataListener.meshloaderNewRecordLoaded) {
				
				this.
				 meshDataListener.
				 meshloaderNewRecordLoaded(seconds, latI, lngI, val, cellName);
			}
		},

		calcLatIndexFromMeshCode: function(meshCode) {
			var index = 0;
			switch (this.usingMeshCode.level) {
			case 4:
				index = this.calcLv4LatitudeIndexFromCode(meshCode);
				break;

			case 3:
				var i1 = Math.floor(meshCode / 1000000);
				var yx2 = Math.floor(meshCode / 100) % 100;
				var i2  = Math.floor(yx2 / 10);
				var yx3 = meshCode % 100;
				var i3  = Math.floor(yx3 / 10);
			
				index = i1 * 80 + i2 * 10 + i3;
				break;
					
			case 2:
				var i1 = Math.floor(meshCode / 10000);
				var yx2 = meshCode % 100;
				var i2  = Math.floor(yx2 / 10);
				
				index = i1 * 8 + i2;
				
				break;

			default:
				index = Math.floor(meshCode / 100); break;
			}
			
			return index;
		},
		
		calcLv4LatitudeIndexFromCode: function(meshCode) {
			// Example: 533923431
			// Pick:    ^^  ^ ^ ^
			
			var i1 = Math.floor(meshCode / 10000000);

			var yx2 = Math.floor(meshCode / 1000) % 100;
			var i2  = Math.floor(yx2 / 10);

			var yx3 = Math.floor(meshCode / 10) % 100;
			var i3  = Math.floor(yx3 / 10);

			var yx4 = meshCode % 10;
			var i4 = (yx4 < 3) ? 0 : 1;

			return i1 * 160 + i2 * 20 + i3 * 2 + i4;
		},
		
		calcLngIndexFromMeshCode: function(meshCode) {
			var index = 0;
			switch (this.usingMeshCode.level) {
			case 4:
				index = this.calcLv4LongitudeIndexFromCode(meshCode);
				break;

			case 3:
				var i1 = Math.floor(meshCode / 10000) % 100;
				var i2 = Math.floor(meshCode / 100) % 10;
				var i3 = meshCode % 10;

				index = i1 * 80 + i2 * 10 + i3;
				break;
				
			case 2:
				var i1 = Math.floor(meshCode / 100) % 100;
				var i2 = meshCode % 10;
				
				index = i1 * 8 + i2;
				
				break;

			default:
				index = meshCode % 100; break;
			}

			return index;
		},

		calcLv4LongitudeIndexFromCode: function(meshCode) {
			// Example: 533923431
			// Pick:      ^^ ^ ^^

			var i1 = Math.floor(meshCode / 100000) % 100;
			var i2 = Math.floor(meshCode / 1000) % 10;
			var i3 = Math.floor(meshCode / 10) % 10;

			var yx4 = meshCode % 10;
			var i4 = (yx4 === 2 || yx4 === 4) ? 1 : 0;

			return i1 * 160 + i2 * 20 + i3 * 2 + i4;
		},

		// callbacks - - - - - - - - - - - - -
		csvloaderReadLine: function(fields, lineno) {
			if (fields.length < 1) {
				return;
			}
			
			if (this.readMode === MeshCSVLoader.RMODE_META) {
				this.readMetaFields(fields);
			} else {
				this.readContentFields(fields);
			}
		},
		
		csvloaderLineError: function(e) {
			console.log(e);
			console.trace();
		},
		
		csvloaderReportProgress: function(ratRead) {
			
		},
		
		csvloaderLoadFinish: function() {
			if (this.meshDataListener &&
				this.meshDataListener.meshloaderLoadFinish) {
				this.meshDataListener.meshloaderLoadFinish();
			}
		}
	};
	
	aGlobal.mobmap.MeshCSVLoader = MeshCSVLoader;
})(window);