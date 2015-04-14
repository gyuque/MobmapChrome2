if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function CalcSimDialog() {
		this.initProperties();
		this.ensureWindowElement();
		
		this.targetLayer = null;
		this.originObjectId = null;
	}
	
	CalcSimDialog.prototype = {
		open: function(callback, targetLayer, originObjectId) {
			this.ensureWindowElement();
			this.targetLayer = targetLayer;
			this.originObjectId = originObjectId;
			
			this.showDialog();
			this.okCallback = callback;
		},

		ensureWindowElement: function() {
			if (!this.element) {
				this.buildView();

				this.addOKButton();
				this.addCancelButton();
			}
		},

		showDialog: function() {
			this.showDialogOnCenter('Calc trajectories similarity');
		}
	};
	
	CalcSimDialog.calcPositionSimilarity = function(layer, originObjectId) {
		var far_thresh = 10000.0;

		var mdat = layer.movingData;
		if (!mdat) {
			return false;
		}
		
		var secInterval = 300;
		var timeRange = getTimeRangeOfTL(mdat, originObjectId);
		if (!timeRange) {
			return false;
		}

		var pickedRec = mobmap.MovingData.createEmptyRecord();
//		console.log(timeRange);
		var resultMap = {};
		resultMap[originObjectId] = 0;

		var nTimePeriods = 0;
		var oid;
		var idMap = mdat.idMap;
		var o_tl = mdat.getTimeListOfId(originObjectId);
		for (var t = timeRange.begin;t < timeRange.end;t += secInterval) {
			++nTimePeriods;

			o_tl.pickAt(null, pickedRec, t);
			var ox = pickedRec.x;
			var oy = pickedRec.y;
			
			for (oid in idMap) {
				if (oid === originObjectId) { continue; }
			
				var tl = mdat.getTimeListOfId(oid);
				tl.pickAt(null, pickedRec, t);

				var dis = calcDistanceFromLatLng(ox, oy, pickedRec.x, pickedRec.y);
				if (!resultMap.hasOwnProperty(oid)) {
					resultMap[oid] = 0;
				}
				
				resultMap[oid] += dis;
			}
		}

		layer.addAttribute('psim', AttributeType.FLOAT, kInitialValueTypeEmpty);

		// Normalize
		for (oid in idMap) {
			var score = resultMap[oid];
			score /= nTimePeriods;
			score /= far_thresh;
			
			resultMap[oid] = Math.max(0, 1.0 - score);
			
			var tl_writeTarget = mdat.getTimeListOfId(oid);
			tl_writeTarget.fillValue('psim', resultMap[oid]);
		}
		
		layer.fireDataChange();
	};
	
	function getTimeRangeOfTL(mdat, oid) {
		var tl = mdat.getTimeListOfId(oid);
		if (!tl) {
			return null;
		}
		
		var recordList = tl.getRecordList();
		var r1 = recordList[0];
		var r2 = recordList[ recordList.length - 1 ];
		
		return {begin: r1._time, end: r2._time};
	}
	
	mobmap.MMDialogBaseInstallAPIs(CalcSimDialog.prototype);
	aGlobal.mobmap.CalcSimDialog = CalcSimDialog;
})(window);
