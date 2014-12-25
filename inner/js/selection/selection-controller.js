if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function SelectionController(ownerApp) {
		this.ownerApp = ownerApp;
		this.currentSelectionSession = null;
		this.responders = [];
		this.boolOp = SelectionController.BoolOpNew;
	}
	
	SelectionController.BoolOpNew = 'new';
	SelectionController.BoolOpOr  = 'or';
	SelectionController.BoolOpAnd = 'and';
	
	SelectionController.prototype = {
		setBoolOp: function(t) {
			if (this.boolOp !== t) {
				this.boolOp = t;
				return true;
			}
			
			return false;
		},
		
		getCurrentSession: function() {
			return this.currentSelectionSession;
		},
		
		getTargetLayerList: function() {
			var prj = this.ownerApp.getCurrentProject();
			if (!prj) { return null; }
			
			return prj.getLayerList();
		},
		
		selectByIdList: function(ls) {
			if (!ls) { return; }
			if (ls.length === 0) { return; }
			
			var prj = this.ownerApp.getCurrentProject();
			prj.forEachLayer(function(index, layer){
				if (layer.capabilities & mobmap.LayerCapability.SpatialSelectable) {
					layer.localSelectionPool.clear(true);
					layer.localSelectionPool.addFromList(ls, false, layer.movingData.idMap);
				}
			});
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
				if (
						(layer.capabilities & mobmap.LayerCapability.SpatialSelectable) ||
						(layer.capabilities & mobmap.LayerCapability.PolygonSelectable) 
					) {
					layer.localSelectionPool.clear(suppress_event);
				}
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
			this.startSessionOfType(mobmap.RectSelectionSession);
		},

		startPolygonPickSelectionSession: function() {
			this.startSessionOfType(mobmap.PolygonPickSelectionSession);
		},

		startLineGateSession: function() {
			this.startSessionOfType(mobmap.LineGateSession);
		},
		
		startSessionOfType: function(sessionClass) {
			this.disposeCurrentSession();

			this.fireNewSession();
			this.currentSelectionSession = new sessionClass();
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
		
		putSessionClickPoint: function(lat, lng) {
			var s = this.currentSelectionSession;
			if (s && s.setPosition) {
				s.setPosition(lat, lng);
				this.fireAfterSessionStateUpdate(s);
			}
		},
		
		commitDraggingSelection: function() {
			if (this.currentSelectionSession) {
				var prj = this.ownerApp.getCurrentProject();
				
				this.fireBeforeCommitSession(this.currentSelectionSession);
				var and_op = (this.boolOp === SelectionController.BoolOpAnd);
				var new_op = (this.boolOp === SelectionController.BoolOpNew);
				this.currentSelectionSession.makeIDCollection(prj, and_op, new_op);
				
				if (this.currentSelectionSession.doAfterCommit) {
					this.currentSelectionSession.doAfterCommit(this.ownerApp);
				}
			}

			this.disposeCurrentSession(true);
		},
		
		commitClickingSelection: function() {
			if (this.currentSelectionSession) {
				var prj = this.ownerApp.getCurrentProject();
				this.currentSelectionSession.makeIDCollection(prj);
			}
		},
		
		fireSessionDispose: function() { this.callResponders('selWillDisposeCurrentSession'); },
		fireNewSession: function() { this.callResponders('selWillStartNewSession'); },
		fireAfterDisposeSession: function() { this.callResponders('selDidDisposeSession'); },
		fireAfterNewSession: function() { this.callResponders('selDidStartNewSession'); },
		fireAfterSessionStateUpdate: function(s) { this.callResponders('selDidUpdateSession',s); },
		fireBeforeCommitSession: function(s) { this.callResponders('selWillCommitSession',s); },
		fireAfterGateProcess: function() { this.callResponders('selDidGateProcess'); },

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
		
		runGateSelection: function(lat1, lng1, lat2, lng2, direction, conditionExp) {
			var job = new GateSelectionJob(this,
				lat1, lng1, lat2, lng2, direction);
			
			job.configureBooleanOperation(this.boolOp);
			job.setLineConditionExpressionQuery(conditionExp || null);
			job.run();
		},
		
		runGateSelectionWithTestProvider: function(testProvider) {
			var job = new GateSelectionJob(this,
				0, 0, 0, 0, GateDirection.Bidirectional, testProvider);
			
			job.configureBooleanOperation(this.boolOp);
			job.chunkSize = 1000;
			job.run();
		},
		
		renewLayerSelectionIfNeeded: function(targetLayer) {
			if (this.boolOp !== SelectionController.BoolOpNew) { return; }

			var selp = targetLayer.localSelectionPool;
			if (selp) {
				selp.clear(true);
			}
		},
		
		fireEmptySelectionIfNeeded: function(targetLayer) {
			if (this.boolOp !== SelectionController.BoolOpNew) { return; }

			var selp = targetLayer.localSelectionPool;
			if (selp && !selp.isAnySelected()) {
				selp.fire();
			}
		},

		notifyGateJobProgress: function(rate) {
			this.ownerApp.updateGateBusyDialog(rate);
		},
		
		// Expression
		doExpressionSelection: function(targetLayerId, expressionString) {
			var prj = this.ownerApp.getCurrentProject();
			if (!prj) { return; }
			
			var layer = prj.getLayerById(targetLayerId);
			if (!layer || !(layer.capabilities & mobmap.LayerCapability.SpatialSelectable)) {
				return -1;
			}
			
			var pickTime = prj.getCurrentTimeInSeconds();
			var pickPool = layer.movingData.createPickPool();
			pickPool.clear();

			layer.movingData.pickAt(pickPool, pickTime);
			
			var expq = new mobmap.ExpressionQuery();
			expq.parse(expressionString);
			if (expq.hasError) {
				return -1;
			}

			this.renewLayerSelectionIfNeeded(layer);

			var evalOutList = [];
			var evalNOTOutList = [];
			var nFounds = expq.run(pickPool.getArray(), evalOutList, pickPool.pickedCount, evalNOTOutList);
			var and_op = (this.boolOp === SelectionController.BoolOpAnd);
			
			var i;
			var selp = layer.localSelectionPool;

			if (!and_op) {
				for (i = 0;i < nFounds;++i) {
					var foundRecord = evalOutList[i];
					selp.addId(foundRecord._id, true);
				}
			}
			
			// remove complement
			if (and_op) {
				var nn = evalNOTOutList.length;
				for (i = 0;i < nn;++i) {
					var droppedRecord = evalNOTOutList[i];
					selp.removeId(droppedRecord._id, true);
				}
			}

			selp.fire();
			
			return nFounds;
		}
	};
	
	var SelectionControllerResponderMethodList = {
		// name                       | required
		selWillDisposeCurrentSession  : false,
		selWillStartNewSession        : false,
		selDidDisposeSession          : false,
		selDidStartNewSession         : false,
		selDidUpdateSession           : false,
		selWillCommitSession          : false,
		selDidGateProcess             : false
	};
	
	// GATE
	function GateSelectionJob(owner, lat1, lng1, lat2, lng2, direction, alternativeTestProvider) {
		this.end1 = {lat:lat1, lng:lng1};
		this.end2 = {lat:lat2, lng:lng2};
		this.direction = direction;
		this.lineConditionExpressionQuery = null;
		this.owner = owner;
		this.chunkSize = 2000;
		this.tempPickRecord = mobmap.MovingData.createEmptyRecord();
		
		this.targetLayerIndex = -1;
		this.objectIndex = -1;
		this.objectIDList = [];
		
		this.tickClosure = this.tick.bind(this);
		this.testFunctionProvider = alternativeTestProvider || null;
		
		this.useAndOp = false;
	}
	
	GateSelectionJob.prototype = {
		configureBooleanOperation: function(boolOp) {
			this.useAndOp = (boolOp === SelectionController.BoolOpAnd);
		},
		
		setLineConditionExpressionQuery: function(q) {
			this.lineConditionExpressionQuery = q;
		},
		
		run: function() {
			if (this.objectIndex < 0) {
				var nextLayer = this.setupNextLayer();
				if (!nextLayer) {
					// Finished all layers
					this.owner.fireAfterGateProcess();
					return;
				}

				this.objectIndex = 0;
				this.owner.renewLayerSelectionIfNeeded(nextLayer);
				this.makeObjectIDList(nextLayer);
			}
			
			this.tick();
		},
		
		tick: function() {
			if (this.processChunk()) {
				setTimeout(this.tickClosure, 9);
			} else {
				this.objectIndex = -1;
				this.run();
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
				} else {
					if (this.onIDNotHit(targetLayer.localSelectionPool, oid)) {
						anySelected = true;
					}
				}
				//console.log(oid, tl.getRecordList().length)

				// --------------------------
				++this.objectIndex;
			}
			
			if (anySelected) {
				targetLayer.localSelectionPool.fire();
			}
			
			if (this.owner.notifyGateJobProgress) {
				this.owner.notifyGateJobProgress(this.objectIndex / idCount);
			}
			
			if (!shouldContinue) {
				this.owner.fireEmptySelectionIfNeeded(targetLayer);
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
			if (!timedList.hasMoreTwoEnds()) {
				return this.runGateOnSingleRecord(layer, timedList, objectID);
			}
			
			var minT = layer.dataTimeRange.start;
			var maxT = layer.dataTimeRange.end;
			
			if (selectedTimeRange) {
				minT = selectedTimeRange.start;
				maxT = selectedTimeRange.end;
			}
			
			var selp = layer.localSelectionPool;
			var recordList = timedList.getRecordList();
			var firstRecord = recordList[0];
			var lastRecord  = recordList[ recordList.length-1 ];

			var recMinTime = firstRecord._time;
			var recMaxTime = lastRecord._time;
			
			// Outside time range
			if (recMaxTime <= minT) {
				if (this.testFunctionProvider) {
					if (this.testFunctionProvider.testSingleRecord(lastRecord)) {
						this.onIDHit(selp, objectID);
						return true;
					}
				}
			}

			if (recMinTime >= maxT) {
				if (this.testFunctionProvider) {
					if (this.testFunctionProvider.testSingleRecord(firstRecord)) {
						this.onIDHit(selp, objectID);
						return true;
					}
				}
			}

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
			for (;;) {
				if (currentRecord && segmentPrevRecord) {
					if (this.doCrossTestBetweenRecords(segmentPrevRecord, currentRecord)) {
						//console.log("SEL")
						this.onIDHit(selp, objectID);
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

		onIDHit: function(selp, objectID) {
			if (!this.useAndOp) {
				selp.addId(objectID, true);
			}
		},
		
		onIDNotHit: function(selp, objectID) {
			if (this.useAndOp && selp.isIDSelected(objectID)) {
				selp.removeId(objectID, true);
				return true;
			}
			
			return false;
		},
		
		runGateOnSingleRecord: function(layer, timedList, objectID) {
			if (!this.testFunctionProvider) {
				return false;
			}
			
			var records = timedList.getRecordList();
			if (records.length > 0) {
				if (this.testFunctionProvider.testSingleRecord(records[0])) {
					//console.log("SINGLE")
					this.onIDHit(layer.localSelectionPool, objectID);
					return true;
				}
			}

			return false;
		},

		doCrossTestBetweenRecords: function(rec1, rec2) {
			if (this.testFunctionProvider) {
				return this.testFunctionProvider.testBetweenRecords(rec1, rec2);
			}
			
			if (this.lineConditionExpressionQuery) {
				var exp_node = this.lineConditionExpressionQuery.rootNode;
				
				if (!exp_node.evaluate(rec1) && !exp_node.evaluate(rec2)) {
					// NOT passed expression test
					return false;
				}
			}
			
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