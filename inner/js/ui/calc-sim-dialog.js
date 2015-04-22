if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	var kSimNumType_Float = 0;
	var kSimNumType_Int   = 1;

	var kSimType_Position = 0;
	var kSimType_Velocity = 1;
	
	function CalcSimDialog() {
		this.pThreshInputElement  = null;
		this.vThreshInputElement  = null;
		this.outNameInputElement  = null;
		this.intervalInputElement = null;
		
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

				var bx = this.jMessageArea[0];
				this.putSimTypeRadio( bx );
				this.putNumTypeRadio( bx );
				this.putThresholdInputBox( bx );
				this.putIntervalInputBox( bx);
				this.putAttributeNameInputBox( bx );
				
				this.addOKButton();
				this.addCancelButton();
			}
		},
		
		putNumTypeRadio: function(containerElement) {
			var innerBox = make_form_box(containerElement, 'mm-simnumtype-selection-box', 'Result value range');

			var r1 = generateRadioInLabel("float(0.0-1.0)", 'sim-num-type', 'sim-num-type-radio');
			var r2 = generateRadioInLabel("int(0-10)", 'sim-num-type', 'sim-num-type-radio');

			r1.input.checked = true;
			r1.input.value = kSimNumType_Float;
			r2.input.value = kSimNumType_Int;

			innerBox.appendChild(r1.label);
			innerBox.appendChild(r2.label);
			containerElement.appendChild(innerBox);
		},
		
		putSimTypeRadio: function(containerElement) {
			var innerBox = make_form_box(containerElement, 'mm-simtype-selection-box', 'Similarity type');
			
			var r1 = generateRadioInLabel('Position similarity', 'mm-sim-type', 'mm-simtype-radio');
			var r2 = generateRadioInLabel('Velocity similarity', 'mm-sim-type', 'mm-simtype-radio');

			r1.input.checked = true;
			r1.input.value = kSimType_Position;
			r2.input.value = kSimType_Velocity;

			innerBox.appendChild(r1.label);
			innerBox.appendChild(r2.label);
			containerElement.appendChild(innerBox);
		},

		putThresholdInputBox: function(containerElement) {
			var innerBox = make_form_box(containerElement, 'mm-sim-threshold-box', 'Threshold');
			
			var pth = generateInputElementInLabel('number', 'For position ', 'mm-calcsim-thresh', 'mm-calcsim-thresh-input', true);
			var vth = generateInputElementInLabel('number', 'For velocity ', 'mm-calcsim-thresh', 'mm-calcsim-thresh-input', true);

			pth.input.value = "20000";
			vth.input.value = "1";

			pth.input.setAttribute('min', '1');
			vth.input.setAttribute('min', '0.01');
			vth.input.setAttribute('step', '0.01');

			this.pThreshInputElement = pth.input;
			this.vThreshInputElement = vth.input;

			innerBox.appendChild(pth.label);
			innerBox.appendChild(vth.label);
			containerElement.appendChild(innerBox);
		},
		
		putAttributeNameInputBox: function(containerElement) {
			var innerBox = make_form_box(containerElement, 'mm-sim-attrname-box', 'Output attribute name');

			var pair = generateInputElementInLabel('text', 'Name ', 'mm-calcsim-outname', 'mm-calcsim-outname-input', true);
			this.outNameInputElement = pair.input;
			pair.input.value = 'sim';
			
			innerBox.appendChild(pair.label);
			containerElement.appendChild(innerBox);
		},
		
		putIntervalInputBox: function(containerElement) {
			var innerBox = make_form_box(containerElement, 'mm-sim-interval-box', 'Time interval');
			var pair = generateInputElementInLabel('number', ' sec.', 'mm-calcsim-interval', 'mm-calcsim-interval-input', false);
			pair.input.value = "300";
			pair.input.setAttribute('min', '1');
			pair.input.setAttribute('step', '1');

			this.intervalInputElement = pair.input;
			innerBox.appendChild(pair.label);
			containerElement.appendChild(innerBox);
		},

		showDialog: function() {
			this.showDialogOnCenter('Calc trajectories similarity', false, 312);
		},
		
		getChosenNumType: function() {
			return parseInt( this.jMessageArea.find('.sim-num-type-radio input:checked').val() , 10);
		},
		
		getChosenSimType: function() {
			return parseInt( this.jMessageArea.find('.mm-simtype-radio input:checked').val() , 10);
		},
		
		getThresholdForChosenType: function() {
			var val = this.getChosenSimType();
			var raw = '0';
			if (val === kSimType_Velocity) {
				raw = this.vThreshInputElement.value;
			} else {
				raw = this.pThreshInputElement.value;
			}
			
			return parseFloat(raw);
		},

		getOutputAttributeName: function() {
			return this.outNameInputElement.value;
		},
		
		getTimeInterval: function() {
			var v = parseInt(this.intervalInputElement.value, 10);
			if (v < 1) {v=1;}
			
			return v;
		}
	};
	
	CalcSimDialog.calcSimilarity = function(layer, originObjectId, numType, simType, far_thresh, outName, secInterval) {
		var mdat = layer.movingData;
		if (!mdat) { return false; }

		var timeRange = getTimeRangeOfTL(mdat, originObjectId);
		if (!timeRange) {
			return false;
		}

		var pickedRec = mobmap.MovingData.createEmptyRecord();
//		console.log(timeRange);
		var resultMap = {};
		resultMap[originObjectId] = 0;

		// Origin value
		var ox, oy; // for psim
		var ov;     // for vsim

		var nTimePeriods = 0;
		var oid;
		var idMap = mdat.idMap;
		var o_tl = mdat.getTimeListOfId(originObjectId);
		for (var t = timeRange.begin;t < timeRange.end;t += secInterval) {
			++nTimePeriods;

			o_tl.pickAt(null, pickedRec, t);
			ox = pickedRec.x;
			oy = pickedRec.y;
			
			if (simType === kSimType_Velocity) {
				// advanced distance per 1 sec.
				o_tl.pickAt(null, pickedRec, t + 1);
				ov = calcDistanceFromLatLng(ox, oy, pickedRec.x, pickedRec.y);
			}

			for (oid in idMap) {
				if (oid === originObjectId) { continue; }

				var tl = mdat.getTimeListOfId(oid);
				tl.pickAt(null, pickedRec, t);

				var dis = 0;
				if (simType === kSimType_Velocity) {
					// VELOCITY diff
					var x1 = pickedRec.x;
					var y1 = pickedRec.y;
					tl.pickAt(null, pickedRec, t+1);
					
					var dest_velo = calcDistanceFromLatLng(x1, y1, pickedRec.x, pickedRec.y);
					dis = Math.abs(dest_velo - ov) / (dest_velo + 1);
				} else {
					// POSITION diff
					dis = calcDistanceFromLatLng(ox, oy, pickedRec.x, pickedRec.y);
				}
				
				if (!resultMap.hasOwnProperty(oid)) {
					resultMap[oid] = 0;
				}

				resultMap[oid] += dis;
			}
		}

		layer.addAttribute(outName, AttributeType.FLOAT, kInitialValueTypeEmpty);

		// Normalize
		for (oid in idMap) {
			var score = resultMap[oid];
			score /= nTimePeriods;
			score /= far_thresh;

			var nm_score = Math.max(0, 1.0 - score);
			resultMap[oid] = nm_score;

			var tl_writeTarget = mdat.getTimeListOfId(oid);
			if (numType === kSimNumType_Float) {
				tl_writeTarget.fillValue(outName, nm_score);
			} else {
				tl_writeTarget.fillValue(outName, Math.floor(nm_score * 10.0));
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
	
	function make_form_box(containerElement, className, titleText) {
		var innerBox = document.createElement('div');
		innerBox.setAttribute('class', className);
		appendBoxTitle(innerBox, titleText);

		return innerBox;
	}
	
	function appendBoxTitle(containerElement, title) {
		var h = document.createElement('h4');
		h.setAttribute('class', 'mm-calcsim-box-title');
		h.appendChild( document.createTextNode(title) );
		containerElement.appendChild(h);
	}

	
	mobmap.MMDialogBaseInstallAPIs(CalcSimDialog.prototype);
	aGlobal.mobmap.CalcSimDialog = CalcSimDialog;
})(window);
