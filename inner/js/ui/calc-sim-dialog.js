if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	var kSimNumType_Float = 0;
	var kSimNumType_Int   = 1;

	var kSimType_Position = 0;
	var kSimType_Velocity = 1;
	
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
				
				this.jMessageArea.empty();

				this.putNumTypeRadio( this.jMessageArea[0] );
				this.putSimTypeRadio( this.jMessageArea[0] );
				
				this.addOKButton();
				this.addCancelButton();
			}
		},
		
		putNumTypeRadio: function(containerElement) {
			var r1 = generateRadioInLabel("float(0.0-1.0)", 'sim-num-type', 'sim-num-type-radio');
			var r2 = generateRadioInLabel("int(0-10)", 'sim-num-type', 'sim-num-type-radio');

			r1.input.checked = true;
			r1.input.value = kSimNumType_Float;
			r2.input.value = kSimNumType_Int;

			containerElement.appendChild(r1.label);
			containerElement.appendChild(r2.label);
		},
		
		putSimTypeRadio: function(containerElement) {
			var innerBox = document.createElement('div');
			innerBox.setAttribute('class', 'mm-simtype-selection-box');
			
			var r1 = generateRadioInLabel('Position similarity', 'mm-sim-type', 'mm-simtype-radio');
			var r2 = generateRadioInLabel('Velocity similarity', 'mm-sim-type', 'mm-simtype-radio');

			r1.input.checked = true;
			r1.input.value = kSimType_Position;
			r2.input.value = kSimType_Velocity;

			innerBox.appendChild(r1.label);
			innerBox.appendChild(r2.label);

			containerElement.appendChild(innerBox);
		},

		showDialog: function() {
			this.showDialogOnCenter('Calc trajectories similarity');
		},
		
		getChosenNumType: function() {
			return parseInt( this.jMessageArea.find('.sim-num-type-radio input:checked').val() , 10);
		},
		
		getChosenSimType: function() {
			return parseInt( this.jMessageArea.find('.mm-simtype-radio input:checked').val() , 10);
		}
	};
	
	CalcSimDialog.calcPositionSimilarity = function(layer, originObjectId, numType) {
		var far_thresh = 20000.0;

		var mdat = layer.movingData;
		if (!mdat) { return false; }
		
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
			
			var nm_score = Math.max(0, 1.0 - score);
			resultMap[oid] = nm_score;
			
			var tl_writeTarget = mdat.getTimeListOfId(oid);
			if (numType === kSimNumType_Float) {
				tl_writeTarget.fillValue('psim', nm_score);
			} else {
				tl_writeTarget.fillValue('psim', Math.floor(nm_score * 10.0));
			}
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
