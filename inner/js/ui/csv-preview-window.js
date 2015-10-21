if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	var DATAATTR_CURPOS = 'data-cursor-pos';
	var DATAATTR_ANAME = 'data-aname';
	var DATAATTR_AROWNAME = 'data-attr-row-name';
	var DATAATTR_COLI = 'data-colindex';
	var DATAATTR_ISSAMPLE = 'data-sample-col';

	function CSVPreviewWindow(ownerApp) {
		this.ownerApp = ownerApp;
		
		this.element = this.jElement = this.previewContainer = null;
		this.jIgnoreFirstLineCheck = null;
		this.jTriggerContainer = null;
		this.csvLoader = null;
		this.previewTable = null;
		this.autoDetector = null;
		this.attrMap = null;
		this.immediateLoadEnabled = false;
		// ----------------------------------
		this.buildElements();
	}
	
	CSVPreviewWindow.prototype = {
		buildElements: function() {
			this.element = $H('div');
			this.jElement = $(this.element);
			this.element.id = 'mm-csv-preview-inner';
			document.body.appendChild(this.element);
			
			this.previewContainer = $H('div', 'mm-csv-preview-table-container');
			this.element.appendChild(this.previewContainer);

			this.controlArea = $H('div', 'mm-csv-preview-control-container');
			this.element.appendChild(this.controlArea);
			this.buildPreviewControlTools(this.controlArea);

			this.jElement.show().kendoWindow({
				modal:true,
				pinned: true,
				position: { top: '0px',left: '0px' },
				width: "95%",
				height: "80%",
				visible: false,
				animation: {
				    close: { duration: 200 }
				},
				title: 'CSV Preview'
			});
			
			// Set wrapper ID
			this.jElement.data("kendoWindow").wrapper.attr('id', 'mm-csv-preview-window');
		},
		
		// shortcut to kendo window object
		wnd: function() { return this.jElement.data("kendoWindow"); },
		
		open: function() {
			this.wnd().center();
			this.wnd().open();
		},
		
		close: function() {
			this.wnd().close();
		},
		
		syncAttributeMap: function() {
			if (this.attrMap) {
				this.previewTable.writeSetting(this.attrMap);
			}
			return this.attrMap;
		},

		// Tools
		buildPreviewControlTools: function(containerElement) {
			var buttonContainer = $H('div', 'mm-trigger-box', 'mm-csv-full-load-container');
			
			var loadButton = $H('button');
			var jBtn = $(loadButton).text('Start loading').click(
				this.onFullLoadClick.bind(this)
			);
			loadButton.id = "mm-csvpreview-fullload-button";
			
			var chkIgnore = createCheckbox();
			var lbIgnore = createWrapperLabel(chkIgnore, "Ignore first line"); 
			this.jIgnoreFirstLineCheck = $(chkIgnore).
			 hide().
			 click( this.onIgnoreFirstCheckClick.bind(this) );
			
			containerElement.appendChild(lbIgnore);
			buttonContainer.appendChild(loadButton);
			containerElement.appendChild(buttonContainer);
			
			this.jTriggerContainer = $(buttonContainer);
		},
		
		onFullLoadClick: function() {
			this.csvLoader.setIgnoreFirstLine( this.getIgnoreFirstChecked() );
			this.ownerApp.loadCSVWithLoader(this.csvLoader);
		},
		
		onIgnoreFirstCheckClick: function() {
			var currentVal = this.getIgnoreFirstChecked();
			this.previewTable.setIgnoreFirstLineStyle(currentVal);
		},
		
		getIgnoreFirstChecked: function() {
			return this.jIgnoreFirstLineCheck[0].checked;
		},

		// Immediate load =======================
		loadNetworkedMovementDataImmediate: function(sourceFile) {
			this.immediateLoadEnabled = true;
			this.attrMap = null;
			this.csvLoader = new mobmap.NetworkedMovingCSVLoader(sourceFile);
			this.csvLoader.preload(this);
		},

		// Preload and preview ===================
		generatePreview: function(sourceFile) {
			this.clearPreviewArea();
			this.showTrigger(false);
			
			this.immediateLoadEnabled = false;
			this.attrMap = null;
			this.csvLoader = new mobmap.GeoCSVLoader(sourceFile);
			this.csvLoader.preload(this);
		},
		
		csvloaderAfterPreloadFinish: function() {
			var lineCount = this.csvLoader.countLines();
			console.log(lineCount);
			
			if (this.immediateLoadEnabled) {
				this.ownerApp.loadCSVWithLoader(this.csvLoader);
			} else {
				this.csvLoader.startPreviewLoad( this.onPreviewLoadFinish.bind(this) );
			}
		},
		
		csvloaderPreloadError: function() {
			
		},
		
		onPreviewLoadFinish: function(success, previewRecords) {
			if (success) {
				this.showTrigger(true);

				this.attrMap = new mobmap.AttributeMapping();
				this.addDefaultAttributes(this.attrMap);
				
				this.autoDetector = new ColumnsAutoDetector();
				this.autoDetector.detect(previewRecords);
				this.autoDetector.applyToAttrMap(this.attrMap);

				var auto_ignore_1st = this.detectHeaderRow(previewRecords);
				this.previewTable = new CSVPreviewTable(previewRecords, this);
				var table = this.previewTable.generateTable();
				this.previewContainer.appendChild(table);
				this.jIgnoreFirstLineCheck.show();

				if (auto_ignore_1st) {
					this.checkIgnoreFirstLine();
				}

				// Show initial status
				this.previewTable.showSetting(this.attrMap);
			}
		},
		
		clearPreviewArea: function() {
			this.previewContainer.innerHTML = '';
		},
		
		addDefaultAttributes: function(attrMap) {
			var src = kRequiredAttributes;
			var len = src.length;
			for (var i = 0;i < len;++i) {
				var a = attrMap.addAttribute(src[i]);
				a.csvColumnIndex = i;
			}
		},
		
		onPickerCellClick: function(attrName, colIndex) {
			this.setAttrColumnIndex(attrName, colIndex);
		},
		
		setAttrColumnIndex: function(attrName, colIndex) {
			if (this.attrMap) {
				this.attrMap.setColumnIndex(attrName, colIndex);
				this.previewTable.showSetting(this.attrMap);
			}
		},
		
		detectHeaderRow: function(recordList) {
			if (recordList.length < 1) {
				return false;
			}
			
			var re = /^[\-\.0-9\:\/ ]+$/;
			var firstRow = recordList[0];
			var ok_cols = 0;
			for (var i in firstRow) {
				if (re.test(firstRow[i])) {
					++ok_cols;
				}
			}
			
			return (ok_cols < 3);
		},
		
		checkIgnoreFirstLine: function() {
			this.jIgnoreFirstLineCheck.attr('checked', 'checked');
			this.onIgnoreFirstCheckClick();
		},
		
		showTrigger: function(visible) {
			if (visible) {
				this.jTriggerContainer.show();
			} else {
				this.jTriggerContainer.hide();
			}
		}
	};


	// ------------------------------------------------------------
	function CSVPreviewTable(sourceRecords, listener) {
		this.sourceRecords = sourceRecords;
		this.listener = listener || null;
		this.additionalInputManager = null;
		
		this.attrRows = [];
		this.dataRows = [];
		this.bgLineImages = {};
		this.bgArrowImages = {};
		
		this.jTable = null;
	}
	
	CSVPreviewTable.AttrColors = {
		id: [250,0,90],
		time: [200,100,0],
		x: [0,200,0],
		y: [0,0,220]
	}
	
	CSVPreviewTable.prototype = {
		generateTable: function() {
			var tbl = $H('table', 'mm-csv-preview-table');
			var fieldsCount = this.countMaxColumns();
			
			// HEADING ROW =====
			var headingRow = this.generateHeadingRow(fieldsCount);
			tbl.appendChild(headingRow);
			
			// DATA ROWS =======
			this.addDataRows(tbl, fieldsCount);
			
			// SETTING =========
			this.addSettingHeader(tbl, fieldsCount + 1);
			this.createSettingRows(tbl, fieldsCount);
			
			this.observeTable(tbl);
			this.jTable = $(tbl);
			return tbl;
		},
		
		observeTable: function(tableElement) {
			$(tableElement).click( (function(e){
				var col_node = this.findPickerColumnNode(e.target);
				if (col_node) {
					this.onPickerClick(col_node);
				}
			}).bind(this) );
		},
		
		setIgnoreFirstLineStyle: function(ig) {
			var j = this.jTable;
			if (!j) {return;}

			if (ig) {
				j.addClass('ignore-first');
			} else {
				j.removeClass('ignore-first');
			}
		},
		
		onPickerClick: function(element) {
			var attrName = element.getAttribute(DATAATTR_ANAME);
			var colIndex = parseInt( element.getAttribute(DATAATTR_COLI) , 10);
			
			if (this.listener && this.listener.onPickerCellClick) {
				this.listener.onPickerCellClick(attrName, colIndex);
			}
		},
		
		findPickerColumnNode: function(el) {
			for (var i = 0;i < 3;++i) {
				if (el.getAttribute(DATAATTR_ANAME)) {
					return el;
				}
				
				el = el.parentNode;
				if (!el) {break;}
			}
			
			return null;
		},
		
		generateHeadingRow: function(fieldsCount) {
			var tr = $H('tr', 'mm-csv-preview-heading-row');
			var nCols = fieldsCount + 1;
			
			for (var i = 0;i < nCols;++i) {
				var th = $H('th');
				if (i > 0) {
					th.appendChild($T(i));
				}
				
				tr.appendChild(th);
			}

			return tr;
		},
		
		addDataRows: function(targetTable, fieldsCount) {
			var ls = this.sourceRecords;
			var len = ls.length;
			for (var i = 0;i < len;++i) {
				var fields = ls[i];
				var tr = $H('tr', 'mm-csv-preview-datarow-'+i);
				this.dataRows.push(tr);
				
				this.addDataRowColumns(tr, fieldsCount, fields, i+1);
				targetTable.appendChild(tr);
			}
		},

		addDataRowColumns: function(rowElement, columnsCount, fields, lineno) {
			var headCol = $H('td', 'mm-heading-column');
			headCol.appendChild($T(lineno));
			rowElement.appendChild(headCol);

			for (var i = 0;i < columnsCount;++i) {
				var td = $H('td');
				td.setAttribute(DATAATTR_COLI, i);
				td.setAttribute(DATAATTR_ISSAMPLE, 1);

				if (fields[i]) {
					td.appendChild($T(fields[i]));
				}

				rowElement.appendChild(td);
			}
		},

		addSettingHeader: function(targetTable, colspan) {
			var tr = $H('tr');
			var td = $H('td', 'csv-preview-setting-h');
			td.setAttribute('colspan', colspan);
			
			td.appendChild($T('Column setting'));
			tr.appendChild(td);
			targetTable.appendChild(tr);
			
			return td;
		},
		
		countMaxColumns: function() {
			var max = 0;
			var ls = this.sourceRecords;
			var len = ls.length;
			for (var i = 0;i < len;++i) {
				var c = ls[i].length;
				if (c > max) {max = c;}
			}
			
			return max;
		},

		// ==== Column picker ====

		// Required fields + additinal attribute input fields
		createSettingRows: function(targetTable, columnsCount) {
			var attrs = kRequiredAttributes;
			var len = attrs.length;
			
			for (var i = 0;i < len;++i) {
				var attrName = attrs[i];
				var acolor = CSVPreviewTable.AttrColors[attrName];
				
				// Generate background images
				this.bgLineImages[attrName] = PickerBGGenerator.generateLineBG(acolor[0], acolor[1], acolor[2]);
				this.bgArrowImages[attrName] = PickerBGGenerator.generateArrowBG(acolor[0], acolor[1], acolor[2]);

				// Generate row
				var tr = $H('tr');
				this.attrRows.push(tr);
				
				var hcol = this.generateSettingRowHeadCol(attrName);
				tr.setAttribute(DATAATTR_AROWNAME, attrName);
				tr.appendChild(hcol);
				hcol.style.background = makeHeadColGradient(acolor);

				this.generateSettingRowColumns(tr, attrName, columnsCount);
				
				targetTable.appendChild(tr);
			}
			
			// additional field
			this.additionalInputManager = new AdditionalInputManager();
			this.createAdditinalAttributesRow(targetTable, columnsCount);
		},
		
		generateSettingRowHeadCol: function(attrName) {
			var td = $H('td', 'mm-csv-setting-headcol');
			td.appendChild($T(attrName));
			return td;
		},
		
		generateSettingRowColumns: function(targetRow, attrName, columnsCount) {
			for (var i = 0;i < columnsCount;++i) {
				var td = $H('td', 'mm-csv-picker-col');
				td.setAttribute(DATAATTR_ANAME, attrName);
				td.setAttribute(DATAATTR_COLI, i);
				targetRow.appendChild(td);
				
				td.appendChild($T(attrName));
			}
		},


		// Additional attributes
		createAdditinalAttributesRow: function(targetTable, columnsCount) {
			var rowElement = $H('tr');
			targetTable.appendChild(rowElement);

			var headCol = this.generateAdditionalAttributesHeadCol();
			rowElement.appendChild(headCol);
			
			this.generateAdditionalAttributesInputColumns(rowElement, columnsCount);
			return rowElement;
		},
		
		generateAdditionalAttributesHeadCol: function() {
			var td = $H('td', 'mm-csv-setting-additional-headcol');
			td.appendChild($T("Additional"));
			return td;
		},

		generateAdditionalAttributesInputColumns: function(targetRow, columnsCount) {
			for (var i = 0;i < columnsCount;++i) {
				var td = $H('td', 'mm-csv-additional-input-col');
				targetRow.appendChild(td);
				this.setupAdditionalFieldInputColumn(td);
			}
		},
		
		setupAdditionalFieldInputColumn: function(colElement) {
			var input = document.createElement('input');
			input.type = 'text';
			
			colElement.appendChild(input);
			
			// Add to manager - - - - - -
			this.additionalInputManager.addField(colElement, input);
		},


		showSetting: function(attrMap) {
			var ls = this.attrRows;
			var len = ls.length;
			for (var i = 0;i < len;++i) {
				var row = ls[i];
				var attrName = row.getAttribute(DATAATTR_AROWNAME);
				var ameta = attrMap.getAttributeMetadata(attrName);
				if (attrName) {
					this.updatePickerCursorOnRow(attrName, row, ameta.csvColumnIndex);
				}
			}
			
			this.showDataColCursor(attrMap);
		},
		
		
		writeSetting: function(targetAttrMap) {
			this.writeExtraAttributes(targetAttrMap);
		},
		
		writeExtraAttributes: function(targetAttrMap) {
			this.additionalInputManager.forEachValidField(function(colObj, index){
				var meta = targetAttrMap.addAttribute(colObj.valName);
				meta.csvColumnIndex = index;
				meta.dataType = colObj.valType;
			});
		},

		pickCursorPosition: function(targetRow) {
			return parseInt(targetRow.getAttribute(DATAATTR_CURPOS), 10);
		},
		
		
		showDataColCursor: function(attrMap) {
			this.jTable.find('td[' +DATAATTR_ISSAMPLE+ ']').css('background-color', '').css('color', '');
			
			var ls = this.dataRows;
			var len = ls.length;
			for (var i = 0;i < len;++i) {
				var dataRow = ls[i];
				attrMap.forEachAttribute(this.showDataColCursorOfAttribute.bind(this, dataRow, attrMap));
			}
		},
		
		showDataColCursorOfAttribute: function(row, attrMap, attrName, attrMeta) {
			var acolor = CSVPreviewTable.AttrColors[attrName];
			
			var ls = row.childNodes;
			var len = ls.length;
			for (var i = 0;i < len;++i) {
				var col = ls[i];
				if (col.getAttribute(DATAATTR_ISSAMPLE)) {
					var colIndex = parseInt( col.getAttribute(DATAATTR_COLI) , 10);
					var collid = attrMap.isColumnCollided(colIndex);
					
					if (collid) {
						col.style.backgroundColor = '#900';
						col.style.color = '#fff';
					} else if (attrMeta.csvColumnIndex === colIndex) {
						col.style.backgroundColor = makeStyleSheetRGB_BlendWhite2(acolor[0], acolor[1], acolor[2]);
					}
				}
			}
		},
		
		updatePickerCursorOnRow: function(attrName, targetRow, attrColIndex) {
			// Put index on data attr
			targetRow.setAttribute(DATAATTR_CURPOS, attrColIndex);
			
			var ls = targetRow.childNodes;
			var len = ls.length;
			for (var i = 0;i < len;++i) {
				var col = ls[i];
				if (!col.getAttribute(DATAATTR_ANAME)) {continue;}
				
				var style = col.style;
				var colIndex = parseInt( col.getAttribute(DATAATTR_COLI) , 10);
				
				if (colIndex < attrColIndex) {
					style.color = style.boxShadow = style.textShadow = '';
					style.backgroundImage = 'url("' + this.bgLineImages[attrName] + '")';
				} else if (colIndex > attrColIndex) {
					style.color = style.boxShadow = style.textShadow = '';
					style.backgroundImage = 'none';
				} else {
					var acolor = CSVPreviewTable.AttrColors[attrName];
					style.boxShadow = '-40px 0 29px -8px ' + makeStyleSheetRGB_BlendWhite(acolor[0], acolor[1], acolor[2]) + ' inset';
					style.textShadow = '0 1px 2px ' + makeStyleSheetRGB_BlendBlack(acolor[0], acolor[1], acolor[2]);
					style.backgroundImage = 'url("' + this.bgArrowImages[attrName] + '")';
					style.color = "#fff";
				}
			}
		}
	};
	
	var PickerBGGenerator = {
		generateCanvas: function() {
			var cv = document.createElement('canvas');
			cv.width = 800;
			cv.height = 24;
			var g = cv.getContext('2d');
			return {canvas:cv, g:g};
		},
		
		generateLineBG: function(red, green, blue) {
			var canvasSet = this.generateCanvas();
			canvasSet.g.fillStyle = makeStyleSheetRGB(red, green, blue);
			canvasSet.g.fillRect(0, 9, 800, 3);
			
			return canvasSet.canvas.toDataURL();
		},
		
		generateArrowBG: function(red, green, blue) {
			var canvasSet = this.generateCanvas();
			canvasSet.g.fillStyle = makeStyleSheetRGB(red, green, blue);
			canvasSet.g.fillRect(0, 9, 390, 3);
			canvasSet.g.fillRect(390, 0, 1, 11);
			canvasSet.g.fillRect(389, 1, 3, 11);
			canvasSet.g.fillRect(388, 2, 5, 1);
			canvasSet.g.fillRect(387, 3, 7, 1);
			
			return canvasSet.canvas.toDataURL();
		}
	};
	
	function makeHeadColGradient(baseColor) {
		return 'linear-gradient(to bottom, '+
		makeStyleSheetRGB(baseColor[0], baseColor[1], baseColor[2])+
		','+
		makeStyleSheetRGB_BlendBlack(baseColor[0], baseColor[1], baseColor[2])+
		')';
	}
	
	function ColumnsAutoDetector() {
		this.success = false;
		this.colmap = {};
	}
	
	ColumnsAutoDetector.RE_ID = /^[0-9 \t]+$/
	ColumnsAutoDetector.RE_COORD = /^[-+.0-9 \t]+$/

	ColumnsAutoDetector.RE_TIME1 = /[0-9]+:[0-9]+/

	ColumnsAutoDetector.CheckCoordVal = function(fieldRaw, min, max) {
		if (!ColumnsAutoDetector.RE_COORD.test(fieldRaw)) {
			return false;
		}
		
		var val = parseFloat(fieldRaw);
		return (val >= min && val <= max);
	};
	
	ColumnsAutoDetector.prototype = {
		applyToAttrMap: function(attrMap) {
			for (var i in this.colmap) if (this.colmap.hasOwnProperty(i)) {
				var attrName = this.colmap[i];
				var meta = attrMap.getAttributeMetadata(attrName);
				if (meta) {
					meta.csvColumnIndex = i - 0;
				}
			}
		},
		
		detect: function(records) {
			var targetRow = records[1] || records[0];
			if (!targetRow) {
				return;
			}
			
			this.detectTime1(targetRow);
			this.detectId(targetRow);
			this.detectX(targetRow);
			this.detectY(targetRow);
			
			//console.log(this.colmap)
			this.success = true;
		},
		
		detectId: function(targetRow) {
			this.findColumnByCondition(
				targetRow,
				'id',
				function(field) {
					return ColumnsAutoDetector.RE_ID.test(field);
				}
			);
		},

		detectX: function(targetRow) {
			this.findColumnByCondition(
				targetRow,
				'x',
				function(field) {
					return ColumnsAutoDetector.CheckCoordVal(field, 100, 180);
				}
			);
		},

		detectY: function(targetRow) {
			this.findColumnByCondition(
				targetRow,
				'y',
				function(field) {
					return ColumnsAutoDetector.CheckCoordVal(field, 10, 80);
				}
			);
		},
		
		detectTime1: function(targetRow) {
			this.findColumnByCondition(
				targetRow,
				'time',
				function(field) {
					return ColumnsAutoDetector.RE_TIME1.test(field);
				}
			);
		},
		
		findColumnByCondition: function(targetRow, attr_name, cond_func) {
			var len = targetRow.length;
			for (var i = 0;i < len;++i) {
				if (this.colmap[i]) {continue;}
				
				if (cond_func(targetRow[i])) {
					this.colmap[i] = attr_name;
					return i;
				}
			}
			
			return -1;
		},
		
		getIdColumnIndex: function()   { return this.getColumnIndexByName('id'); },
		getTimeColumnIndex: function() { return this.getColumnIndexByName('time'); },
		getXColumnIndex: function()    { return this.getColumnIndexByName('x'); },
		getYColumnIndex: function()    { return this.getColumnIndexByName('y'); },
		
		getColumnIndexByName: function(name) {
			for (var i in this.colmap) {
				if (this.colmap[i] === name) {
					return (i-0);
				}
			}
			
			return -1;
		}
	};

	function AdditionalInputManager() {
		this.list = [];
	}
	
	AdditionalInputManager.prototype = {
		addField: function(containerColumn, inputElement) {
			
			var colObj = {
				jCol: $(containerColumn),
				jInput: $(inputElement),
				valType: -1,
				valName: null
			};
			
			this.list.push(colObj);
			this.observeColumn(colObj);
		},
		
		observeColumn: function(colObj) {
			var handler = (function(e) {
				this.onFieldChange(colObj);
			}).bind(this);
			
			colObj.jInput.blur(handler).keyup(handler);
		},
		
		onFieldChange: function(colObj) {
			this.updateFieldStatuses();
		},
		
		updateFieldStatuses: function() {
			var ls = this.list;
			var len = ls.length;
			for (var i = 0;i < len;++i) {
				var colObj = ls[i];
				this.updateFieldStatusOfColumn(colObj);
			}
		},
		
		updateFieldStatusOfColumn: function(colObj) {
			var currentVal = colObj.jInput.val();
			var parseRes = typedcolumnParseFieldName(currentVal);

			var n_changed = (colObj.valName !== parseRes.name);
			var t_changed = (colObj.valType !== parseRes.type);
			if (t_changed || n_changed) {
				colObj.valType = parseRes.type;
				colObj.valName = parseRes.name;
				this.modifyColumnStyle(colObj);
			}
		},
		
		modifyColumnStyle: function(colObj) {
			this.removeAllClasses(colObj.jCol);
			var c = AdditionalInputManager.TypeClassNames[colObj.valType];
			if (c && AdditionalInputManager.isValidName(colObj.valName)) {
				colObj.jCol.addClass(c);
			}
		},
		
		removeAllClasses: function(j) {
			var m = AdditionalInputManager.TypeClassNames;
			for (var i in m) {
				j.removeClass(m[i]);
			}
		},
		
		forEachValidField: function(proc) {
			var ls = this.list;
			var len = ls.length;
			for (var i = 0;i < len;++i) {
				var colObj = ls[i];
				if (AdditionalInputManager.isValidName(colObj.valName)) {
					proc(colObj, i);
				}
			}
		}
	};
	
	AdditionalInputManager.TypeClassNames = {};
	AdditionalInputManager.TypeClassNames[AttributeType.STRING ] = 'a-specified-string';
	AdditionalInputManager.TypeClassNames[AttributeType.INTEGER] = 'a-specified-integer';
	AdditionalInputManager.TypeClassNames[AttributeType.FLOAT  ] = 'a-specified-float';
	AdditionalInputManager.TypeClassNames[AttributeType.CFLOAT ] = 'a-specified-cfloat';
	
	AdditionalInputManager.isValidName = function(s) {
		if (!s) {return false;}
		return AttributeNamePattern.test(s);
	};

	// / / test data
	var TestRecords = [
	 ["01972939","2013-02-24 00:03:43","35.65","139.64"],["00690961","2013-02-24 00:10:26","35.67","139.66"],
	 ["00529402","2013-02-24 00:24:10","35.68","139.70"],["01733612","2013-02-24 00:28:02","35.58","139.67"],
	 ["00529402","2013-02-24 00:29:02","35.67","139.72"],["00919054","2013-02-24 00:32:42","35.64","139.62"],
	 ["00529402","2013-02-24 00:33:58","35.70","139.74"],["00529402","2013-02-24 00:39:00","35.69","139.76"],
	 ["00529402","2013-02-24 00:44:02","35.69","139.77"],["01142511","2013-02-24 00:45:07","35.64","139.83"]];

	function testColumnsAutoDetector() {
		var detector = new ColumnsAutoDetector();
		detector.detect(TestRecords);
		
		if (!detector.success) {
			throw "detector must success";
		}
		
		var idcol = detector.getIdColumnIndex();
		if (idcol !== 0) {
			throw "id column must be 0";
		}

		var ycol = detector.getYColumnIndex();
		if (ycol !== 2) {
			throw "y column must be 2";
		}

		var xcol = detector.getXColumnIndex();
		if (xcol !== 3) {
			throw "x column must be 3";
		}

		var tcol = detector.getTimeColumnIndex();
		if (tcol !== 1) {
			throw "time column must be 1";
		}
	}

	// +++ Export +++
	aGlobal.mobmap.CSVPreviewWindow = CSVPreviewWindow;
})(window);