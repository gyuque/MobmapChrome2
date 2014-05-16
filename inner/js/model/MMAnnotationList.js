if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	var gNextAnnId = 1;

	function MMAnnotationList() {
		this.jElement = $( createEventDummyElement() );
		this.list = [];
		
		addTestAnnotation(this);
	}
	
	MMAnnotationList.LIST_CHANGE = 'annotation-list-event-list-change';
	
	MMAnnotationList.prototype = {
		setParentEventElement: function(parentEventElement) {
			replaceParentEventElement(this.jElement[0], parentEventElement);
		},

		eventDispatcher: function() {
			return this.jElement;
		},
		
		fireChange: function() {
			this.eventDispatcher().trigger(MMAnnotationList.LIST_CHANGE, this);
		},
		
		getRawList: function() {
			return this.list;
		},
		
		append: function(a) {
			if (this.list.indexOf(a) < 0) {
				this.list.push(a);
				this.fireChange();
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

		var l1 = new MMLocationAnnotation(35.7177096,139.7448731);
		alist.append(l1);
	}
	
	// annotation objects
	function annbase_setDescription(d) {
		this.description = d;
	}
	
	function MMGateAnnotation(lat1, lng1, lat2, lng2, dir) {
		this.id = gNextAnnId++;
		this.typeName = 'Line Gate';
		this.description = 'Untitled';

		this.direction = dir;
		
		this.startPos = {
			lat: lat1,
			lng: lng1
		};

		this.endPos = {
			lat: lat2,
			lng: lng2
		};
		
		var dirString = (dir === GateDirection.Bidirectional) ? ' bi-direction' : ' single direction';
		this.contentString = this.makeLocationString() + dirString;
		this.typeId = AnnotationItemType.GATE;
	}
	
	MMGateAnnotation.prototype = {
		makeLocationString: function() {
			var l1 = this.startPos;
			var l2 = this.endPos;
			
			return '(' +l1.lat+ ',' +l1.lng+ ')-(' +l2.lat+ ',' +l2.lng+ ')';
		},
		
		setDescription: annbase_setDescription
	};


	function MMObjectCollectionAnnotation(idlist) {
		this.id = gNextAnnId++;
		this.typeName = 'ID Collection';
		this.description = 'Untitled';

		this.idlist = idlist;
		this.contentString = 'ID:' + MMObjectCollectionAnnotation.generateCollectionSummary(idlist);
		this.typeId = AnnotationItemType.OBJ_COLLECTION;
	}

	MMObjectCollectionAnnotation.prototype = {
		setDescription: annbase_setDescription
	};

	MMObjectCollectionAnnotation.generateCollectionSummary = function(list) {
		if (!list || list.length === 0) { return '(none)'; }

		if (list.length < 5) {
			return list.join(',') + ' (' +list.length+ ')';
		}
		
		return list[0] +','+ list[1] +','+ list[2] +'... (' +list.length+ ')';
	};


	function MMLocationAnnotation(lat, lng) {
		this.id = gNextAnnId++;
		this.typeName = 'Location';
		this.description = 'Untitled';
		
		this.coordinate = {
			lat: lat,
			lng: lng
		};

		this.contentString = lat + ', ' + lng;
		this.typeId = AnnotationItemType.LOCATION;
	}
	
	MMLocationAnnotation.prototype = {
		setDescription: annbase_setDescription
	};

	/* test
	console.log( MMObjectCollectionAnnotation.generateCollectionSummary([10]) );
	console.log( MMObjectCollectionAnnotation.generateCollectionSummary([10,20]) );
	console.log( MMObjectCollectionAnnotation.generateCollectionSummary([10,20,30,40,50,60]) );
	*/
	
	mobmap.MMAnnotationList = MMAnnotationList;
	mobmap.MMGateAnnotation = MMGateAnnotation;
	mobmap.MMObjectCollectionAnnotation = MMObjectCollectionAnnotation;
})(window);