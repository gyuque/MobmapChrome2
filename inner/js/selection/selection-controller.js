if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function SelectionController(ownerApp) {
		this.ownerApp = ownerApp;
		this.currentSelectionSession = null;
		this.responders = [];
	}
	
	SelectionController.prototype = {
		getCurrentSession: function() {
			return this.currentSelectionSession;
		},
		
		getTargetLayerList: function() {
			var prj = this.ownerApp.getCurrentProject();
			if (!prj) { return null; }
			
			return prj.getLayerList();
		},
		
		getSelectedTimeRage: function() {
			var prj = this.ownerApp.getCurrentProject();
			if (!prj) { return null; }
			
			return prj.timeRangeSelection.getFirstSelection();
		},
		
		getCurrentSessionType: function() {
			if (!this.currentSelectionSession) {
				return mobmap.SelectionSessionType.Unknown;
			}
			
			return this.currentSelectionSession.getType();
		},
		
		clear: function(suppress_event) {
			var prj = this.ownerApp.getCurrentProject();
			prj.forEachLayer(function(index, layer){
				layer.localSelectionPool.clear(suppress_event);
			});
		},
		
		addResponder: function(r) {
			if (this.responders.indexOf(r) >= 0) {
				return false;
			}
			
			this.responders.push(r);
			return true;
		},
		
		disposeCurrentSession: function(fireAfter) {
			if (this.currentSelectionSession) {
				this.fireSessionDispose();
				this.currentSelectionSession = null;
				if (fireAfter) {
					this.fireAfterDisposeSession();
				}
			}
		},
		
		startRectSelectionSession: function() {
			this.disposeCurrentSession();
			
			this.fireNewSession();
			this.currentSelectionSession = new mobmap.RectSelectionSession();
			this.fireAfterNewSession();
		},
		
		startLineGateSession: function() {
			this.disposeCurrentSession();

			this.fireNewSession();
			this.currentSelectionSession = new mobmap.LineGateSession();
			this.fireAfterNewSession();
		},
		
		cancelSessionIfType: function(stype, fireAfter) {
			if (this.currentSelectionSession) {
				if (this.currentSelectionSession.getType() === stype) {
					this.disposeCurrentSession(fireAfter);
					return true;
				}
			}
			
			return false;
		},
		
		putSessionFirstPoint: function(lat, lng) {
			var s = this.currentSelectionSession;
			if (s && s.setStartPos) {
				s.setStartPos(lat, lng);
			}
		},
		
		putSessionDraggingPoint: function(lat, lng) {
			var s = this.currentSelectionSession;
			if (s && s.setEndPos) {
				s.setEndPos(lat, lng);
				this.fireAfterSessionStateUpdate(s);
			}
		},
		
		commitDraggingSelection: function() {
			if (this.currentSelectionSession) {
				var prj = this.ownerApp.getCurrentProject();
				
				this.fireBeforeCommitSession(this.currentSelectionSession);
				this.currentSelectionSession.makeIDCollection(prj);
				
				if (this.currentSelectionSession.doAfterCommit) {
					this.currentSelectionSession.doAfterCommit(this.ownerApp);
				}
			}

			this.disposeCurrentSession(true);
		},
		
		fireSessionDispose: function() { this.callResponders('selWillDisposeCurrentSession'); },
		fireNewSession: function() { this.callResponders('selWillStartNewSession'); },
		fireAfterDisposeSession: function() { this.callResponders('selDidDisposeSession'); },
		fireAfterNewSession: function() { this.callResponders('selDidStartNewSession'); },
		fireAfterSessionStateUpdate: function(s) { this.callResponders('selDidUpdateSession',s); },
		fireBeforeCommitSession: function(s) { this.callResponders('selWillCommitSession',s); },
		
		callResponders: function(methodName, arg1, arg2) {
			var required = SelectionControllerResponderMethodList[methodName] || false;
			var ls = this.responders;
			var len = ls.length;
			
			for (var i = 0;i < len;++i) {
				var recv = ls[i];
				var hasMethod = !!recv[methodName];
				
				if (!hasMethod && required) {
					throw "Responder must implement " + methodName;
				}
				
				if (hasMethod) {
					recv[methodName](this, arg1, arg2);
				}
			}
		},
		
		// Gate selection
		
		runGateSelection: function(lat1, lng1, lat2, lng2, direction) {
			var job = new GateSelectionJob(this,
				lat1, lng1, lat2, lng2, direction);
				
			job.run();
		}
	};
	
	var SelectionControllerResponderMethodList = {
		// name                       | required
		selWillDisposeCurrentSession  : false,
		selWillStartNewSession        : false,
		selDidDisposeSession          : false,
		selDidStartNewSession         : false,
		selDidUpdateSession           : false,
		selWillCommitSession          : false
	};
	
	// GATE
	function GateSelectionJob(owner, lat1, lng1, lat2, lng2, direction) {
		this.end1 = {lat:lat1, lng:lng1};
		this.end2 = {lat:lat2, lng:lng2};
		this.direction = direction;
		this.owner = owner;
		this.chunkSize = 2000;
		this.tempPickRecord = mobmap.MovingData.createEmptyRecord();
		
		this.targetLayerIndex = -1;
		this.objectIndex = -1;
		this.objectIDList = [];
		
		this.tickClosure = this.tick.bind(this);
	}
	
	GateSelectionJob.prototype = {
		run: function() {
			if (this.objectIndex < 0) {
				var nextLayer = this.setupNextLayer();
				this.objectIndex = 0;
				this.makeObjectIDList(nextLayer);
				
				if (!nextLayer) {
					// Finished all layers
				}
			}
			
			this.tick();
		},
		
		tick: function() {
			if (this.processChunk()) {
				setTimeout(this.tickClosure, 9);
			}
		},
		
		processChunk: function() {
			var idList = this.objectIDList;
			var idCount = this.objectIDList.length;
			var shouldContinue = true;
			
			var selectedTimeRange = this.owner.getSelectedTimeRage();
			var targetLayer = this.owner.getTargetLayerList().getLayerAt(this.targetLayerIndex);
			var mdat = targetLayer.movingData;
			var anySelected = false;
			
			for (var i = 0;i < this.chunkSize;++i) {
				var targetIndex = this.objectIndex;
				if (targetIndex >= idCount) {
					shouldContinue = false;
					break;
				}
				
				// --------------------------
				// Process one object or person
				var oid = idList[targetIndex];
				var tl = mdat.getTimeListOfId(oid);
				if (this.runGateOnTimedList(targetLayer, tl, selectedTimeRange, oid)) {
					anySelected = true;
				}
				//console.log(oid, tl.getRecordList().length)

				// --------------------------
				++this.objectIndex;
			}
			
			if (anySelected) {
				targetLayer.localSelectionPool.fire();
			}
			
			return shouldContinue;
		},

		setupNextLayer: function() {
			while(1) {
				++this.targetLayerIndex;
			
				var ll = this.owner.getTargetLayerList();
				if (this.targetLayerIndex >= ll.getCount()) {
					return null;
				}
			
				var lyr = ll.getLayerAt( this.targetLayerIndex );
				if (lyr.capabilities & mobmap.LayerCapability.MarkerRenderable) {
					return lyr;
				}
			}
		},
		
		makeObjectIDList: function(targetLayer) {
			var ls = this.objectIDList;
			ls.length = 0;
			
			var mo = targetLayer.movingData;
			if (!mo) { return; }
			
			var idMap = mo.idMap;
			for (var oid in idMap) { ls.push(oid); }
		},
		
		runGateOnTimedList: function(layer, timedList, selectedTimeRange, objectID) {
			if (!timedList.hasMoreTwoEnds()) { return false; }
			
			var minT = layer.dataTimeRange.start;
			var maxT = layer.dataTimeRange.end;
			
			if (selectedTimeRange) {
				minT = selectedTimeRange.start;
				maxT = selectedTimeRange.end;
			}
			
			var recordList = timedList.getRecordList();
			var firstRecord = recordList[0];
			var lastRecord  = recordList[ recordList.length-1 ];

			var recMinTime = firstRecord._time;
			var recMaxTime = lastRecord._time;

			// Find start point
			var nextIndex = 0;
			var currentRecord = null;
			var indexOverMin = this.gateFindStartSection(minT, recordList);
			if (indexOverMin < 0) {
				return false;
			} else if (indexOverMin > 0) {
				var prevRec = recordList[indexOverMin - 1];
				nextIndex = indexOverMin;
				
				if (prevRec._time === minT) {
					currentRecord = prevRec;
					//console.log("PASS1");
				} else {
					currentRecord = this.tempPickRecord;
					timedList.pickIntpRecord(this.tempPickRecord, recordList, indexOverMin-1, indexOverMin, minT, null);
					//console.log("PASS2");
				}
			} else {
				// From the first
			}

			// Loop in timelist
			var tlIndex = nextIndex-1;
			var segmentPrevRecord = null;
			var selp = layer.localSelectionPool;
			for (;;) {
				if (currentRecord && segmentPrevRecord) {
					if (this.doCrossTestBetweenRecords(segmentPrevRecord, currentRecord)) {
						selp.addId(objectID, true);
						//console.log("SEL")
						return true;
					}
				//	console.log("    "+ segmentPrevRecord.y +","+ segmentPrevRecord.x+"  "+segmentPrevRecord._time+
				//	"   ->  "+ currentRecord.y +","+ currentRecord.x+"  "+currentRecord._time);
				}
				
				++tlIndex;
				if (tlIndex >= recordList.length) {
					break;
				}
				
				segmentPrevRecord = currentRecord;
				currentRecord = recordList[tlIndex];
				
				// Is interpolation needed?
				if (tlIndex > 0) {
					if (currentRecord._time > maxT) {
						currentRecord = this.tempPickRecord;
						timedList.pickIntpRecord(this.tempPickRecord, recordList, tlIndex-1, tlIndex, maxT, null);
					}
				}
			}
			
			return false;
		},

		doCrossTestBetweenRecords: function(rec1, rec2) {
			var g1 = this.end1;
			var g2 = this.end2;

			var enableDirection = (this.direction !== GateDirection.Bidirectional);
			var invDir = (this.direction === GateDirection.Back) ? -1 : 1;

			var xres = testSegmentCross(
						g1.lng, g1.lat,
						g2.lng, g2.lat,
						rec1.x, rec1.y,
						rec2.x, rec2.y, true);

			if (xres !== null) {
				if (enableDirection &&(xres * invDir) < 0) {
					return false;
				}

				return true;
			}

			return false;
		},

		gateFindStartSection: function(gateMinTime, recordList) {
			var len = recordList.length;
			for (var i = 0;i < len;++i) {
				var rec = recordList[i];
				if (rec._time > gateMinTime) {
					return i;
				}
			}
			
			return -1;
		}
	};

	aGlobal.mobmap.SelectionController = SelectionController;
})(window);