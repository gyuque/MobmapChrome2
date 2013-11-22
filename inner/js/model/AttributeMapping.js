if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function AttributeMapping() {
		this.nameMap = {};
		
		this.colIndexMap = {};
	}
	
	AttributeMapping.prototype = {
		addAttribute: function(name) {
			var a = new RecordAttributeMeta(name);
			this.nameMap[name] = a;
			
			return a;
		},
		
		getAttributeMetadata: function(name) {
			return this.nameMap[name] || null;
		},
		
		setColumnIndex: function(name, index) {
			var a = this.nameMap[name];
			if (a) {
				a.csvColumnIndex = index;
			}
		},
		
		forEachAttribute: function(proc) {
			for (var i in this.nameMap) if (this.nameMap.hasOwnProperty(i)) {
				proc(i, this.nameMap[i]);
			}
		},
		
		generateColIndexMap: function() {
			this.clearColIndexMap();
			
			for (var name in this.nameMap) {
				var meta = this.nameMap[name];
				this.colIndexMap[ meta.csvColumnIndex ] = meta;
			}
		},
		
		clearColIndexMap: function() {
			for (var i in this.colIndexMap) {
				delete this.colIndexMap[i];
			}
		},
		
		isColumnHasName: function(idx, name) {
			if ( !this.colIndexMap.hasOwnProperty(idx) ) {
				return false;
			}
			
			var meta = this.colIndexMap[idx];
			return meta.name === name;
		},
		
		// short-hand methods
		isIDColumn:   function(idx) { return this.isColumnHasName(idx, 'id');   },
		isTimeColumn: function(idx) { return this.isColumnHasName(idx, 'time'); },
		isXColumn:    function(idx) { return this.isColumnHasName(idx, 'x');    },
		isYColumn:    function(idx) { return this.isColumnHasName(idx, 'y');    }
	};


	function RecordAttributeMeta(name) {
		this.name = name;
		this.csvColumnIndex = -1;
	}
	
	// +++ Export +++
	aGlobal.mobmap.AttributeMapping = AttributeMapping;
})(window);