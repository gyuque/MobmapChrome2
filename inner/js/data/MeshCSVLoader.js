if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	function MeshCSVLoader(inFile) {
		this.baseLoader = new mobmap.HugeCSVLoader(inFile);
		this.readMode = MeshCSVLoader.RMODE_META;
		this.dataType = MeshCSVLoader.DTYPE_STATIC;
		this.meshDefinition = {
			originLat: 30,
			originLng: 130,
			stepLat: 0.01,
			stepLng: 0.01
		};
	}

	MeshCSVLoader.RMODE_META = 0;
	MeshCSVLoader.RMODE_BODY = 1;

	MeshCSVLoader.DTYPE_STATIC  = 0;
	MeshCSVLoader.DTYPE_DYNAMIC = 1;

	MeshCSVLoader.prototype = {
		preload: function(listenerObject) {
			this.baseLoader.preload(listenerObject);
		},
		
		readMetadata: function() {
			this.readMode = MeshCSVLoader.RMODE_META;
			this.baseLoader.loadOneLine(this);
			this.baseLoader.loadOneLine(this);
		},

		readRestContentAsync: function() {
			this.readMode = MeshCSVLoader.RMODE_BODY;
			this.baseLoader.startFullLoad(this, true);
		},

		// Metadata lines - - - - - - - -
		readMetaFields: function(fields) {
			if (fields.length < 1) { return; }
			
			var firstCol = fields[0];
			if (firstCol.indexOf('@') === 0) {
				this.readDataType(firstCol);
			} else {
				this.readMeshDefinitionFields(fields);
			}
		},

		readDataType: function(typeStr) {
			console.log("typeStr=", typeStr);
			var lw = typeStr.toLowerCase();
			
			if (lw.indexOf('dynamic-mesh') >= 0) {
				this.dataType = MeshCSVLoader.DTYPE_DYNAMIC;
				console.log("Type: Dynamic mesh");
			} else if (lw.indexOf('static-mesh') >= 0) {
				this.dataType = MeshCSVLoader.DTYPE_STATIC;
				console.log("Type: Static mesh");
			}
		},

		readMeshDefinitionFields: function(fields) {
			var df = this.meshDefinition;
			
			df.originLat = parseFloat( fields[0] );
			df.originLng = parseFloat( fields[1] );
			df.stepLat   = parseFloat( fields[2] );
			df.stepLng   = parseFloat( fields[3] );
			console.log(this.meshDefinition)
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
			
			var latI = parseInt( fields[latIndexCol] , 10);
			var lngI = parseInt( fields[lngIndexCol] , 10);
			var val  = parseFloat( fields[valueCol] );
			
			console.log("Data:", latI, lngI, "=>", val, "at", seconds);
		},

		// callbacks - - - - - - - - - - - - -
		csvloaderReadLine: function(fields, lineno) {
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
			
		}
	};
	
	aGlobal.mobmap.MeshCSVLoader = MeshCSVLoader;
})(window);