if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	var DATAATTR_ANAME = 'data-aname';
	var DATAATTR_AROWNAME = 'data-attr-row-name';
	var DATAATTR_COLI = 'data-colindex';

	function CSVPreviewWindow() {
		this.element = this.jElement = this.previewContainer = null;
		this.csvLoader = null;
		this.previewTable = null;
		this.autoDetector = null;
		this.attrMap = null;
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

			this.jElement.show().kendoWindow({
				modal:true,
				pinned: true,
				position: { top: '0px',left: '0px' },
				width: "100%",
				height: "100%",
				visible: false,
				animation: {
				    close: { duration: 200 }
				},
				title: 'CSV Preview'
			});
			
			// Set wrapper ID
			this.jElement.data("kendoWindow").wrapper.attr('id', 'mm-csv-preview-window');
		},
		
		open: function() {
			this.jElement.data("kendoWindow").open();
		},


		// Preload and preview ===================
		generatePreview: function(sourceFile) {
			this.csvLoader = new mobmap.GeoCSVLoader(sourceFile);
			this.csvLoader.preload(this);
		},
		
		csvloaderAfterPreloadFinish: function() {
			var lineCount = this.csvLoader.countLines();
			console.log(lineCount);
			
			this.csvLoader.startPreviewLoad( this.onPreviewLoadFinish.bind(this) );
		},
		
		csvloaderPreloadError: function() {
			
		},
		
		onPreviewLoadFinish: function(success, previewRecords) {
			if (success) {
				this.clearPreviewArea();

				this.attrMap = new mobmap.AttributeMapping();
				this.addDefaultAttributes(this.attrMap);
				
				this.autoDetector = new ColumnsAutoDetector();
				this.autoDetector.detect(previewRecords);

				this.previewTable = new CSVPreviewTable(previewRecords, this);
				var table = this.previewTable.generateTable();
				this.previewContainer.appendChild(table);
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
		}
	};


	// ------------------------------------------------------------
	function CSVPreviewTable(sourceRecords, listener) {
		this.sourceRecords = sourceRecords;
		this.listener = listener || null;
		
		this.attrRows = [];
		this.dataRows = [];
		this.bgLineImages = {};
		this.bgArrowImages = {};
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
				var tr = $H('tr');
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
		},
		
		updatePickerCursorOnRow: function(attrName, targetRow, attrColIndex) {
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