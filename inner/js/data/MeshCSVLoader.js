if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	function MeshCSVLoader(inFile) {
		this.baseLoader = new mobmap.HugeCSVLoader(inFile);
		this.readMode = MeshCSVLoader.RMODE_META;
		this.meshDefinition = {
			originLat: 30,
			originLng: 130,
			stepLat: 0.01,
			stepLng: 0.01
		};
	}

	MeshCSVLoader.RMODE_META = 0;
	MeshCSVLoader.RMODE_BODY = 1;

	MeshCSVLoader.prototype = {
		preload: function(listenerObject) {
			this.baseLoader.preload(listenerObject);
		},
		
		readMetadata: function() {
			this.readMode = MeshCSVLoader.RMODE_META;
			this.baseLoader.loadOneLine(this);
			this.baseLoader.loadOneLine(this);
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
				console.log("Type: Dynamic mesh");
			} else if (lw.indexOf('static-mesh') >= 0) {
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


		// callbacks - - - - - - - - - - - - -
		csvloaderReadLine: function(fields, lineno) {
			if (this.readMode === MeshCSVLoader.RMODE_META) {
				this.readMetaFields(fields);
			}
		},
		
		csvloaderLineError: function() {
			
		}
	};
	
	aGlobal.mobmap.MeshCSVLoader = MeshCSVLoader;
})(window);