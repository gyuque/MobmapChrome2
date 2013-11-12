if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function AttributeMapping() {
		this.nameMap = {};
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
		}
	};


	function RecordAttributeMeta(name) {
		this.name = name;
		this.csvColumnIndex = -1;
	}
	
	// +++ Export +++
	aGlobal.mobmap.AttributeMapping = AttributeMapping;
})(window);