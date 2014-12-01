if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	var sharedNextMeshStatPanelId = 1;

	function MeshStatSubPanel(layer) {
		this.initializeFormNames();
		this.boundLayer = layer;
		this.targetSelector = null;
		this.funcSelector = null;
		this.circleChartCheckbox = null;
		this.useForColorCheckbox = null;
		this.csvDownloadLink = null;
		this.crr_csvDownloadLink = null;

		this.expandablePanel = new mobmap.ExpandablePanel();
		this.element = this.expandablePanel.element;
		this.jElement = $(this.element);
		this.expandablePanel.setTitle("Statistical operations");
		
		this.configurePanelContent();
		this.observeLayerEvents();
		this.observeSelectorEvents();
//		this.syncFromModel();

//		this.updateClosedPanelContent();
	}
	
	MeshStatSubPanel.prototype = {
		configurePanelContent: function() {
			var cc = this.expandablePanel.closedContentElement;
			cc.innerHTML = '';

			var ec = this.expandablePanel.expandedContentElement;
			ec.innerHTML = '';
			
			this.buildForm(ec);
		},
		
		buildForm: function(containerElement) {
			containerElement.appendChild( mobmap.LayersView.generateOptionHeading('Dynamic stat') );
			
			this.targetSelector = new TargetSelector(this.fname_TargetSel, true);
			containerElement.appendChild(this.targetSelector.wrapLabel('Layer '));
			
			this.funcSelector = new StatFuncSelector(this.fname_StatFunc);
			containerElement.appendChild(this.funcSelector.wrapLabel('Function '));


			var pair_chart_chk = generateCheckboxInLabel("Show circle chart", this.fname_ChartCheck, "mm-target-selector-label");
			containerElement.appendChild(pair_chart_chk.label);
			this.circleChartCheckbox = pair_chart_chk.input;
			$(pair_chart_chk.input).click(this.onChartCheckClick.bind(this));


			var pair_color_chk = generateCheckboxInLabel("Use for cell coloring", this.fname_ColorCheck, "mm-target-selector-label");
			containerElement.appendChild(pair_color_chk.label);
			this.useForColorCheckbox = pair_color_chk.input;
			$(pair_color_chk.input).click(this.onUseForColorCheckClick.bind(this));
			
			this.buildExportForm(containerElement);
			this.buildCorrelationForm(containerElement);
		},
		
		buildCorrelationForm: function(containerElement) {
			containerElement.appendChild( mobmap.LayersView.generateOptionHeading('Correlation') );
			
			var btn = document.createElement('button');
			btn.innerHTML = "Calc correlation";
			containerElement.appendChild(btn);

			var btnCSV = document.createElement('button');
			btnCSV.innerHTML = "Generate time series CSV";
			containerElement.appendChild(btnCSV);
			
			this.crr_csvDownloadLink = document.createElement('a');
			this.crr_csvDownloadLink.innerHTML = 'Save';
			containerElement.appendChild(this.crr_csvDownloadLink);
			
			$(btn).click(this.onCalcCorrelationButtonClick.bind(this));
			$(btnCSV).click(this.onGenerateCorrelationTimeSeriesButtonClick.bind(this));
		},

		buildExportForm: function(containerElement) {
			containerElement.appendChild( mobmap.LayersView.generateOptionHeading('Export') );

			var btn = document.createElement('button');
			btn.innerHTML = "Generate CSV";
			containerElement.appendChild(btn);

			this.csvDownloadLink = document.createElement('a');
			this.csvDownloadLink.innerHTML = 'Save';
			containerElement.appendChild(this.csvDownloadLink);

			$(btn).click(this.onGenerateCSVButtonClick.bind(this));
		},
		
		initializeFormNames: function() {
			this.fname_TargetSel = 'mm-mesh-stat-target-sel-' + sharedNextMeshStatPanelId;
			this.fname_StatFunc  = 'mm-mesh-stat-func-sel-' + sharedNextMeshStatPanelId;
			this.fname_ChartCheck  = 'mm-mesh-stat-chart-check-' + sharedNextMeshStatPanelId;
			this.fname_ColorCheck  = 'mm-mesh-stat-color-check-' + sharedNextMeshStatPanelId;

			++sharedNextMeshStatPanelId;
		},
		
		setTargetList: function(targetLayerList) {
			if (!this.targetSelector) { return; }
			this.targetSelector.clear();

			var len = targetLayerList.length;
			for (var i = 0;i < len;++i) {
				var targetInfo = targetLayerList[i];
				this.targetSelector.addOption(targetInfo.desc, targetInfo.id);
			}
			
			this.syncTargetLayerFromModel();
		},

		observeLayerEvents: function() {
			if (!this.boundLayer) { return; }

			this.boundLayer.eventDispatcher().bind(mobmap.MMMeshLayer.STAT_TARGET_LAYER_CHANGE, this.onStatTargetLayerChange.bind(this));
		},

		onStatTargetLayerChange: function() {
			this.updateAttributeList();
			this.sendStatTargetAttributeName();
		},

		updateAttributeList: function() {
			var targetLayer = this.findStatTargetLayer(this.boundLayer.statTargetLayerId);
			var sel = this.funcSelector;
			
			sel.clear();
			if (targetLayer && targetLayer.movingData) {
				targetLayer.movingData.forEachExtraProperty(function(attrName, flags){
					sel.addAttributeName(attrName);
				});
			}
		},
		
		findStatTargetLayer: function(layerId) {
			if (!this.boundLayer) { return null; }
			var ls = this.boundLayer.ownerList;
			if (!ls) { return null; }
			
			return ls.getLayerById(layerId);
		},

		observeSelectorEvents: function() {
			this.targetSelector.eventDispatcher().bind(TargetSelector.SELECTION_CHANGE_EVENT, this.onTargetLayerSelectorChange.bind(this));
			this.funcSelector.eventDispatcher().bind(StatFuncSelector.SELECTION_CHANGE_EVENT, this.onStatFuncSelectorChange.bind(this));
		},
		
		onTargetLayerSelectorChange: function() {
			var newValue = this.targetSelector.val();
			this.sendNewStatTargetId(newValue);
		},
		
		onStatFuncSelectorChange: function() {
			this.sendStatTargetAttributeName();
		},
		
		sendStatTargetAttributeName: function() {
			var newValurPair = this.funcSelector.pairValue();
			var funcType = newValurPair[0] | 0;
			var attrName = null;
			if (newValurPair && funcType > 0) {
				attrName = newValurPair[1];
			} else {
				funcType = kStatFunctionSum;
			}
			
			var changed = false;
			if (this.boundLayer.setStatTargetAttributeName(attrName)) { changed = true; }
			if (this.boundLayer.setStatFunctionType(funcType)) { changed = true; }
			
			if (changed) {
				this.boundLayer.fireStatTargetAttributeNameChange();
			}
		},
		
		getCurrentStatTargetId: function() {
			if (!this.boundLayer) { return -1; }
			return this.boundLayer.statTargetLayerId;
		},
		
		sendNewStatTargetId: function(newValue) {
			if (this.boundLayer) {
				this.boundLayer.setStatTargetLayerId(newValue);
			}
		},
		
		syncTargetLayerFromModel: function() {
			var curId = this.getCurrentStatTargetId();
			this.targetSelector.setValue(curId);
		},
		
		// chart check
		onChartCheckClick: function() {
			this.sendChartCheckValue();
		},
		
		getChartCheckValue: function() {
			if (!this.circleChartCheckbox) { return false; }
			
			return !!(this.circleChartCheckbox.checked);
		},
		
		sendChartCheckValue: function() {
			var newValue = this.getChartCheckValue();
			if (this.boundLayer) {
				this.boundLayer.setStatChartEnabled(newValue);
			}
		},
		
		// color check
		onUseForColorCheckClick: function() {
			this.sendUseForColorCheckValue();
		},
		
		sendUseForColorCheckValue: function() {
			var newValue = this.getUseForColorCheckValue();
			if (this.boundLayer) {
				this.boundLayer.setUseDynStatValueForColoring(newValue);
			}
		},
		
		getUseForColorCheckValue: function() {
			if (!this.useForColorCheckbox) { return false; }
			
			return !!(this.useForColorCheckbox.checked);
		},
		
		
		onGenerateCSVButtonClick: function() {
			var prj = this.getLayerOwnerProject();
			var meshData = this.getMeshDataWithValidDynStat();
			if (!meshData) { return false; }

			var curTime = prj.getCurrentTimeInSeconds();
			meshData.updateDynStat(curTime);

			var outLines = [];
			this.fillExportableMetaLines(this.boundLayer, outLines);
			meshData.forEachCell( this.makeExportableCellRecord.bind(this, curTime, outLines) );

			var dl_url = this.buildExportFile(outLines);
			this.csvDownloadLink.target = '_blank';
			this.csvDownloadLink.setAttribute('download', 'mesh-exported.csv');
			this.csvDownloadLink.href = dl_url;

			return true;
		},

		onCalcCorrelationButtonClick: function() {
			var prj = this.getLayerOwnerProject();
			var meshData = this.getMeshDataWithValidDynStat();
			if (!meshData) { return false; }

			var curTime = prj.getCurrentTimeInSeconds();
			meshData.updateMeshValueCache(curTime);
			meshData.updateDynStat(curTime);

			var mAvg = meshData.calcAverageOfAllCells(false);
			var dAvg = meshData.calcAverageOfAllCells(true);
			
			var R = meshData.calcCorrelation(mAvg, dAvg);
			console.log(mAvg, dAvg, R)
		},
		
		onGenerateCorrelationTimeSeriesButtonClick: function() {
			var prj = this.getLayerOwnerProject();
			var meshData = this.getMeshDataWithValidDynStat();
			if (!meshData) { return false; }

			var stepSec = 60*5;
			var range = prj.getAllLayersTimeRange();
			var lines = [];
			
			var t = prj.getCurrentTimeInSeconds();
			for (var i = 0;i < 9999;++i) {
				meshData.updateMeshValueCache(t);
				meshData.updateDynStat(t);
				var mAvg = meshData.calcAverageOfAllCells(false);
				var dAvg = meshData.calcAverageOfAllCells(true);
				var R = meshData.calcCorrelation(mAvg, dAvg);

				var disp_t = mobmap.DateTime.makePrettyTimeFromSeconds(t);
				//console.log(t, mAvg, dAvg, R);
				lines.push(t +',' +disp_t+ ','+ mAvg +','+ dAvg +','+ R +"\n");

				t += stepSec;
				if (t > range.end) {break;}
			}
			
			var dl_url = this.buildExportFile(lines);
			this.crr_csvDownloadLink.target = '_blank';
			this.crr_csvDownloadLink.setAttribute('download', 'correlations.csv');
			this.crr_csvDownloadLink.href = dl_url;
		},

		getMeshDataWithValidDynStat: function() {
			if (!this.boundLayer) {
				return null;
			}

			var d = this.boundLayer.meshData;
			if (!d) { return null; }
			if (!d.hasValidDynStatTarget()) { return null; }
			
			return d;
		},

		fillExportableMetaLines: function(sourceLayer, outLines) {
			var a = sourceLayer.rawMetadataLines;
			if (a) {
				for (var i in a ){
					outLines.push(a[i] + "\n");
				}
			}
		},

		makeExportableCellRecord: function(pickTime, outLines, cellKey, cell) {
			var cellRec = cell.pickAtTime(pickTime);
			if (cellRec) {
				var cellTitle = cell.name;
				outLines.push(cellTitle +','+ cellRec.statVal + "\n");
			}
		},

		buildExportFile: function(inLines) {
			var blob = new Blob(inLines);
			console.log(blob)
			return window.URL.createObjectURL(blob);
		},


		getLayerOwnerProject: function() {
			if (!this.boundLayer) { return null; }
			if (!this.boundLayer.ownerList) { return null; }
			
			return this.boundLayer.ownerList.ownerProject || null;
		},

		show: function() { this.expandablePanel.show(); },
		hide: function() { this.expandablePanel.hide(); }
	};


	function TargetSelector(formName, addNoneItem) {
		this.element = document.createElement('select');
		this.element.name = formName;
		this.addNoneItem = !!(addNoneItem);
		this.jElement = $(this.element);
		this.jElement.change(this.onSelectChange.bind(this));
		
		this.clear();
	}
	
	TargetSelector.SELECTION_CHANGE_EVENT = 'mm-target-selector-selchange-event';
	
	TargetSelector.prototype = {
		eventDispatcher: function() { return this.jElement; },

		wrapLabel: function(labelText) {
			return wrapInputWithLabel(this.element, labelText);
		},
		
		clear: function() {
			this.element.innerHTML = '';
			
			if (this.addNoneItem) {
				this.addOption("None", -1);
			}
		},

		addOption: function(label, value) {
			return addSelectBoxOption(this.element, label, value);
		},
		
		onSelectChange: function() {
			this.eventDispatcher().trigger(TargetSelector.SELECTION_CHANGE_EVENT, this);
		},
		
		val: function() {
			return this.jElement.val() | 0;
		},
		
		setValue: function(newValue) {
			this.jElement.val(newValue);
		}
	};



	function StatFuncSelector(formName) {
		this.element = document.createElement('select');
		this.element.name = formName;

		this.jElement = $(this.element);
		this.jElement.change(this.onSelectChange.bind(this));

		this.clear();
	}

	StatFuncSelector.SELECTION_CHANGE_EVENT = 'mm-statfunc-selector-selchange-event';

	StatFuncSelector.prototype = {
		eventDispatcher: function() { return this.jElement; },

		clear: function() {
			this.element.innerHTML = '';
			this.addDefaultItem();
		},
		
		addDefaultItem: function() {
			this.addOption('COUNT(*)', '0:0');
		},
		
		addAttributeName: function(attrName) {
			this.addOption('SUM(' + attrName + ')', '1:' + attrName);
			this.addOption('AVG(' + attrName + ')', '2:' + attrName);
		},

		onSelectChange: function() {
			this.eventDispatcher().trigger(StatFuncSelector.SELECTION_CHANGE_EVENT, this);
		},
		
		pairValue: function() {
			var raw = this.jElement.val();
			if (!raw) { return null; }
			
			var fields = raw.split(':');
			if (fields.length < 2) { return null; }
			
			fields[0] = parseInt(fields[0], 10);
			return fields;
		},

		wrapLabel: function(labelText) { return wrapInputWithLabel(this.element, labelText); },
		addOption: function(label, value) { return addSelectBoxOption(this.element, label, value); }
	};



	function addSelectBoxOption(selElement, label, value) {
		var opt = document.createElement('option');
		opt.value = value;
		opt.appendChild( document.createTextNode(label) );

		selElement.appendChild(opt);
		return opt;
	}

	function wrapInputWithLabel(el, labelText) {
		var lab = document.createElement('label');
		lab.setAttribute('class', 'mm-target-selector-label');
		lab.appendChild( document.createTextNode(labelText) );
		lab.appendChild(el);

		return lab;
	}


	aGlobal.mobmap.MeshStatSubPanel = MeshStatSubPanel;
})(window);