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
		this.crrsnapshot_reportArea = null;
		this.crr_csvDownloadLink = null;
		this.cts_intervalInput = null;
		this.cts_reportArea = null;

		this.expandablePanel = new mobmap.ExpandablePanel();
		this.element = this.expandablePanel.element;
		this.jElement = $(this.element);
		this.expandablePanel.setTitle("Statistical operations");
		
		this.configurePanelContent();
		this.observeLayerEvents();
		this.observeSelectorEvents();
//		this.syncFromModel();
		this.toggleFormVisibility();

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
			
			var export_tool_box = document.createElement('div');
			export_tool_box.setAttribute('class', 'dynstat-active-only-area');
			containerElement.appendChild(export_tool_box);
			this.buildExportForm(export_tool_box);
			this.buildCorrelationForm(export_tool_box);
		},
		
		generateDownloadAElement: function(labelText) {
			var a = document.createElement('a');
			a.appendChild(document.createTextNode(labelText || 'Save'));
			a.setAttribute('class', 'dynstat-csv-download-link');
			a.target = '_blank';

			return a;
		},
		
		buildCSVGeneratorForm: function(containerElement, titleText, enable_report_area) {
			var box = document.createElement('div');
			box.setAttribute('class', 'dynstat-csv-download-form');
			
			var btn = document.createElement('button');
			btn.innerHTML = "Calculate";
			box.appendChild(btn);

			var lk= this.generateDownloadAElement();
			box.appendChild(lk);

			var report = null;
			if (enable_report_area) {
				report = document.createElement('div');
				box.appendChild(report);
			}

			containerElement.appendChild( mobmap.LayersView.generateOptionHeading(titleText) );
			containerElement.appendChild(box);
			return {
				outer: box,
				button: btn,
				download_link: lk,
				report: report
			};
		},
		
		buildCorrelationForm: function(containerElement) {
			var snapshot_generators = this.buildCSVGeneratorForm(containerElement, 'Correlation snapshot', true);
			this.crrsnapshot_reportArea = snapshot_generators.report;

			var ts_generators = this.buildCSVGeneratorForm(containerElement, 'Time series correlation', true);
			this.cts_reportArea = ts_generators.report;
			this.crr_csvDownloadLink = ts_generators.download_link;

			this.cts_intervalInput = this.addTimeSeriesIntervalForm(ts_generators.outer);

			$(snapshot_generators.button).click(this.onCalcCorrelationButtonClick.bind(this));
			$(ts_generators.button).click(this.onGenerateCorrelationTimeSeriesButtonClick.bind(this));
		},
		
		addTimeSeriesIntervalForm: function(containerElement) {
			var label = document.createElement('label');
			
			var num = document.createElement('input');
			num.type = 'number';
			num.value = 300;
			num.setAttribute('min', 1);
			num.setAttribute('max', 3600*24);
			
			label.appendChild( document.createTextNode('Every ') );
			label.appendChild(num);
			label.appendChild( document.createTextNode('sec.') );
			containerElement.insertBefore(label, containerElement.firstChild);
			
			return num;
		},

		buildExportForm: function(containerElement) {
			var generators = this.buildCSVGeneratorForm(containerElement, 'Export as mesh layer');
			this.csvDownloadLink = generators.download_link;
			$(generators.button).click(this.onGenerateCSVButtonClick.bind(this));
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

			this.boundLayer.eventDispatcher().
			 bind(mobmap.MMMeshLayer.STAT_TARGET_LAYER_CHANGE, this.onStatTargetLayerChange.bind(this));
		},

		onStatTargetLayerChange: function() {
			this.updateAttributeList();
			this.sendStatTargetAttributeName();
			this.toggleFormVisibility();
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
		
		toggleFormVisibility: function() {
			var show = this.getCurrentStatTargetId() >= 0;
			var j = this.jElement.find('.dynstat-active-only-area');
			
			if (show) {
				j.show();
			} else {
				j.hide();
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
			this.csvDownloadLink.setAttribute('download', 'mesh-exported.csv');
			this.csvDownloadLink.href = dl_url;

			return true;
		},

		onCalcCorrelationButtonClick: function() {
			var prj = this.getLayerOwnerProject();
			var meshData = this.getMeshDataWithValidDynStat();
			if (!meshData) { return false; }

			var curTime = prj.getCurrentTimeInSeconds();
			var disp_d = mobmap.DateTime.makePrettyDateFromSeconds(curTime);
			var disp_t = mobmap.DateTime.makePrettyTimeFromSeconds(curTime);
			meshData.updateMeshValueCache(curTime);
			meshData.updateDynStat(curTime);

			var mAvg = meshData.calcAverageOfAllCells(false);
			var dAvg = meshData.calcAverageOfAllCells(true);
			
			var detailOut = {};
			var R = meshData.calcCorrelation(mAvg, dAvg, detailOut);
//			console.log(mAvg, dAvg, R)
			
			this.crrsnapshot_reportArea.innerHTML = "";

			var strong = document.createElement('strong');
			strong.appendChild( document.createTextNode('R=' + R) );
			
			this.crrsnapshot_reportArea.appendChild( strong );
			this.crrsnapshot_reportArea.appendChild( document.createElement('br') );
			this.crrsnapshot_reportArea.appendChild( document.createTextNode('n=' + detailOut.n) );
			this.crrsnapshot_reportArea.appendChild( document.createElement('br') );
			this.crrsnapshot_reportArea.appendChild( document.createTextNode('t=' + detailOut.t) );
			this.crrsnapshot_reportArea.appendChild( document.createElement('br') );
			this.crrsnapshot_reportArea.appendChild( document.createTextNode('as of ' + disp_d + ' ' +disp_t) );
		},
		
		onGenerateCorrelationTimeSeriesButtonClick: function() {
			this.crr_csvDownloadLink.innerHTML = 'Wait...';
			this.crr_csvDownloadLink.removeAttribute('href');
			this.crr_csvDownloadLink.style.display = 'inline';
			
			setTimeout(this.generateCorrelationTimeSeries.bind(this), 100);
		},
		
		generateCorrelationTimeSeries: function() {
			var prj = this.getLayerOwnerProject();
			var meshData = this.getMeshDataWithValidDynStat();
			if (!meshData) { return false; }

			var stepSec = this.cts_intervalInput.value | 0;
			var range = prj.getAllLayersTimeRange();
			var lines = ["unixtime,Date,Time,Average(mesh value),Average(dynstat value),correlation R\n"];
			
			var t = prj.getCurrentTimeInSeconds();
			var beginT = t;
			var lastT = t;
			for (var i = 0;i < 9999;++i) {
				meshData.updateMeshValueCache(t);
				meshData.updateDynStat(t);
				var mAvg = meshData.calcAverageOfAllCells(false);
				var dAvg = meshData.calcAverageOfAllCells(true);
				var R = meshData.calcCorrelation(mAvg, dAvg);

				var disp_d = mobmap.DateTime.makePrettyDateFromSeconds(t);
				var disp_t = mobmap.DateTime.makePrettyTimeFromSeconds(t);
				lastT = t;
				//console.log(t, mAvg, dAvg, R);
				lines.push(t +',' +disp_d+ ',' +disp_t+ ','+ mAvg +','+ dAvg +','+ R +"\n");

				t += stepSec;
				if (t > range.end) {break;}
			}
			
			var dl_url = this.buildExportFile(lines);
			this.crr_csvDownloadLink.innerHTML = 'Save';
			this.crr_csvDownloadLink.setAttribute('download', 'correlations.csv');
			this.crr_csvDownloadLink.href = dl_url;
			this.crr_csvDownloadLink.style.display = '';
			
			this.makeTimeSeriesExportReport(this.cts_reportArea, beginT, lastT, stepSec);
		},
		
		makeTimeSeriesExportReport: function(outElement, t1, t2, stepSec) {
			outElement.innerHTML = '';
			
			var p1 = 'from ' + mobmap.DateTime.makePrettyDateFromSeconds(t1) + ' ' + mobmap.DateTime.makePrettyTimeFromSeconds(t1);
			var p2 = 'to ' + mobmap.DateTime.makePrettyDateFromSeconds(t2) + ' ' + mobmap.DateTime.makePrettyTimeFromSeconds(t2);

			outElement.appendChild( document.createTextNode(p1) );
			outElement.appendChild( document.createElement('br') );
			outElement.appendChild( document.createTextNode(p2) );
			outElement.appendChild( document.createElement('br') );
			outElement.appendChild( document.createTextNode('every ' +stepSec +'sec.') );
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