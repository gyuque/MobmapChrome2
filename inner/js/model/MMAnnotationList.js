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
		var g1 = new MMGateAnnotation(35.711596, 139.848082, 35.70954,139.850163, GateDirection.Back);
		alist.append(g1);

		var c1 = new MMObjectCollectionAnnotation([2000, 6000, 9000, 15000, 16000]);
		alist.append(c1);
	}
	
	// annotation objects
	
	function MMGateAnnotation(lat1, lng1, lat2, lng2, dir) {
		this.id = gNextAnnId++;
		this.typeName = 'Line Gate';
		this.description = 'JR総武線乗客抽出';
		
		this.direction = dir;
		
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


	function MMObjectCollectionAnnotation(idlist) {
		this.id = gNextAnnId++;
		this.typeName = 'ID Collection';
		this.description = 'test-collection';

		this.idlist = idlist;
		this.contentString = 'ID:' + MMObjectCollectionAnnotation.generateCollectionSummary(idlist);
		this.typeId = AnnotationItemType.OBJ_COLLECTION;
	}


	MMObjectCollectionAnnotation.generateCollectionSummary = function(list) {
		if (!list || list.length === 0) { return '(none)'; }

		if (list.length < 5) {
			return list.join(',') + ' (' +list.length+ ')';
		}
		
		return list[0] +','+ list[1] +','+ list[2] +'... (' +list.length+ ')';
	};

	/* test
	console.log( MMObjectCollectionAnnotation.generateCollectionSummary([10]) );
	console.log( MMObjectCollectionAnnotation.generateCollectionSummary([10,20]) );
	console.log( MMObjectCollectionAnnotation.generateCollectionSummary([10,20,30,40,50,60]) );
	*/
	
	mobmap.MMAnnotationList = MMAnnotationList;
})(window);