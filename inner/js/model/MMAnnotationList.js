if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	var gNextAnnId = 1;

	function MMAnnotationList() {
		this.jElement = $( createEventDummyElement() );
		this.list = [];
		
		addTestAnnotation(this);
	}
	
	MMAnnotationList.prototype = {
		setParentEventElement: function(parentEventElement) {
			replaceParentEventElement(this.jElement[0], parentEventElement);
		},

		eventDispatcher: function() {
			return this.jElement;
		},
		
		getRawList: function() {
			return this.list;
		},
		
		append: function(a) {
			if (this.list.indexOf(a) < 0) {
				this.list.push(a);
			}
		},
		
		findById: function(aid) {
			var ls = this.list;
			for (var i in ls) {
				if (ls[i].id === aid) { return ls[i]; }
			}
			
			return null;
		}
	};

	function addTestAnnotation(alist) {
		var g1 = new MMGateAnnotation(35.711596, 139.848082, 35.70954,139.850163);
		alist.append(g1);
	}
	
	// annotation objects
	
	function MMGateAnnotation(lat1, lng1, lat2, lng2) {
		this.id = gNextAnnId++;
		this.typeName = 'Line Gate';
		this.description = 'JR総武線乗客抽出';
		
		this.startPos = {
			lat: lat1,
			lng: lng1
		};

		this.endPos = {
			lat: lat2,
			lng: lng2
		};
		
		this.contentString = this.makeLocationString() + ' single direction';
		this.typeId = AnnotationItemType.GATE;
	}
	
	MMGateAnnotation.prototype = {
		makeLocationString: function() {
			var l1 = this.startPos;
			var l2 = this.endPos;
			
			return '(' +l1.lat+ ',' +l1.lng+ ')-(' +l2.lat+ ',' +l2.lng+ ')';
		}
	};
	
	mobmap.MMAnnotationList = MMAnnotationList;
})(window);