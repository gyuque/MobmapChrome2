if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	function ExportDataDialog(ownerApp) {
		this.ownerApp = ownerApp;
		
		this.selectElLayer = null;
		this.jGridElement = null;
		this.jAddHeaderCheck = null;
		this.jCompleteNotification = null;
		this.currentLayersSource = null;
		this.gridDummyDatasource = null;
		
		this.jSelectionOnlyBox = null;
		this.jSelectionOnlyRadioLabel = null;
		this.jPreviewBox = null;
		this.jRunButton = null;
		this.runButtonOriginalText = 'Export';
		
		this.initProperties();
		this.ensureWindowElement();
		
		this.bWaitingFileOpen = false;
		this.jobCurrentExporting = null;
	}
	
	ExportDataDialog.prototype = {
		open: function() {
			this.ensureWindowElement();
			this.showDialog();
		},
		
		fillLayerList: function(source) {
			this.currentLayersSource = source;
			
			this.selectElLayer.innerHTML = '';
			var sel = this.selectElLayer;
			
			source.forEachLayer(function(index, layer) {
				if (!!(layer.capabilities & mobmap.LayerCapability.MarkerRenderable)) {
					var op = document.createElement('option');
					op.value = layer.layerId;
					op.appendChild(document.createTextNode( layer.getShortDescription() ));
					sel.appendChild(op);
				}
			});
			
			this.renewColsGrid();
			this.renewPreview();
			this.renewSelectionRadio();
		},
		
		ensureWindowElement: function() {
			if (!this.element) {
				this.buildView();
				var messageElement = this.jMessageArea.empty()[0];
				this.buildMessageArea(messageElement);
			}
		},

		showDialog: function() {
			this.hideCompleteNotification();
			this.initRadioSelection();
			this.showDialogOnCenter('Export', false, 408);
		},
		
		
		buildMessageArea: function(containerElement) {
			// Layer selection
			var h_layersel = document.createElement('h4');
			h_layersel.innerHTML = 'Select source layer';

			var l_lab = document.createElement('label');
			var l_sel = document.createElement('select');
			
			l_lab.appendChild( document.createTextNode('Layer ') );
			l_lab.appendChild(l_sel);
			
			this.selectElLayer = l_sel;
			$(l_sel).change(this.onLayerSelectionChange.bind(this));

			// Column configuration
			var h_col = document.createElement('h4');
			h_col.innerHTML = 'Configure columns';
			
			var grid_el = document.createElement('div');
			this.jGridElement = $(grid_el);

			containerElement.appendChild(h_layersel);
			containerElement.appendChild(l_lab);
			this.jSelectionOnlyBox = this.putSelectionOnlyBox(containerElement);
			this.jSelectionOnlyBox.change( this.onSelectionOnlyRadioChange.bind(this) );

			containerElement.appendChild(h_col);
			this.jAddHeaderCheck = this.putHeaderToggle(containerElement);
			containerElement.appendChild(grid_el);
			
			this.jPreviewBox = this.putPreviewBox(containerElement);
			this.jCompleteNotification = this.putNotificationBox(containerElement);
			this.putExecuteButton(containerElement);
			
			this.jAddHeaderCheck.click( this.onAddHeaderCheckClick.bind(this) );
		},

		putSelectionOnlyBox: function(container) {
			var box = document.createElement('div');
			var pair_1 = generateRadioInLabel("All objects", "mm-exportdata-selonly-toggle", "mm-exportdata-selonly-toggle");
			var pair_2 = generateRadioInLabel("Selected only", "mm-exportdata-selonly-toggle", "mm-exportdata-selonly-toggle");

			pair_1.input.value = 0;
			pair_2.input.value = 1;

			box.appendChild(pair_1.label);
			box.appendChild(pair_2.label);
			
			var variable_label = document.createElement('span');
			pair_2.label.appendChild(variable_label);
			this.jSelectionOnlyRadioLabel = $(variable_label);

			container.appendChild(box);
			return $(box);
		},

		initRadioSelection: function() {
			if (this.jSelectionOnlyBox) {
				this.jSelectionOnlyBox.find('input[value=0]').attr('checked', 'checked');
			}
		},

		putHeaderToggle: function(container) {
			var box = document.createElement('div');
			var pair = generateCheckboxInLabel("Add header row", "mm-export-addheader", "mm-export-addheader");

			box.appendChild(pair.label);
			container.appendChild(box);
			return $(pair.input);
		},

		putExecuteButton: function(container) {
			var box = document.createElement('div');
			var btn = document.createElement('button');
			btn.appendChild( document.createTextNode( this.runButtonOriginalText ) );
			
			box.setAttribute('class', 'mm-exporter-trigger-container');
			box.appendChild(btn);
			container.appendChild(box);
			
			this.jRunButton = $(btn);
			this.jRunButton.click( this.onExecuteButtonClick.bind(this) );
		},
		
		putNotificationBox: function(container) {
			var box = document.createElement('div');
			box.appendChild( document.createTextNode('Export operation completed.') );
			
			container.appendChild(box);
			return $(box).addClass('mm-expandable-notification').hide();
		},

		putPreviewBox: function(container) {
			var h = document.createElement('h4');
			h.innerHTML = 'Preivew';
			container.appendChild(h);
			
			var box = document.createElement('pre');
			box.setAttribute('id', 'mm-exportdata-preview');
			container.appendChild(box);
			
			return $(box).text('Preview');
		},

		onLayerSelectionChange: function() {
			this.renewColsGrid();
			this.renewPreview();
			this.renewSelectionRadio();
		},

		onAddHeaderCheckClick: function() {
			this.renewPreview();
		},

		getHeaderEnabled: function() {
			var enabled = false;
			if (this.jAddHeaderCheck && this.jAddHeaderCheck[0]) {
				enabled = this.jAddHeaderCheck[0].checked;
			}

			return enabled;
		},

		getSelectedLayer: function() {
			if (!this.currentLayersSource) {
				return null;
			}
			
			var val = this.selectElLayer.value;
			if (!val && val !== 0) {
				return null;
			} else {
				return this.currentLayersSource.getLayerById( parseInt(val, 10) );
			}
		},
		
		renewColsGrid: function() {
			var o_el = this.jGridElement[0];
			var n_el = document.createElement('div');
			var par = o_el.parentNode;
			if (!par) {return;}
			
			par.replaceChild(n_el, o_el);
			
			this.jGridElement = $(n_el);
			this.fillColumnsTable(this.jGridElement);
		},

		renewSelectionRadio: function() {
			var lyr = this.getSelectedLayer();
			var n = this.countSelectionOnLayer(lyr);
			var should_show = (n > 0);
			
			if (should_show) {
				this.jSelectionOnlyRadioLabel.text(' (' + n +')');
				this.jSelectionOnlyBox.show();
			} else {
				this.jSelectionOnlyBox.hide();
			}
		},

		getSelectionOnlyState: function() {
			var lyr = this.getSelectedLayer();
			var n = this.countSelectionOnLayer(lyr);
			
			if (!n) { return false; }

			var r = this.jSelectionOnlyBox.find('input:checked')[0];
			if (r && r.checked) {
				if ( parseInt(r.value, 10) === 1) {
					return true;
				}
			}
			
			return false;
		},

		onSelectionOnlyRadioChange: function() {
			this.renewPreview();
		},

		countSelectionOnLayer: function(lyr) {
			if (lyr && lyr.localSelectionPool) {
				return lyr.localSelectionPool.count();
			}
			
			return 0;
		},

		fillColumnsTable: function(j) {
			var targetLayer = this.getSelectedLayer();
			
			var colList = this.generateGridColumnsList(targetLayer);
			var sc = this.generateColGridSchema(colList);
			var ds = this.generateDummyDataSource(colList);

			j.kendoGrid({
				editable: true,
				dataSource: {
					data: ds,
					schema: sc
				},
				reorderable: true,
				columns: colList,
				columnReorder: this.renewPreview.bind(this),
				edit: this.renewPreview.bind(this),
				save: this.renewPreview.bind(this)
			});

			this.gridDummyDatasource = ds;
		},

		generateGridColumnsList: function(sourceLayer) {
			var attrList = [];
			var colList = [];
			
			if (sourceLayer && sourceLayer.attributeMapping) {
				sourceLayer.attributeMapping.forEachAttribute(function(name, attrMetadata) {
					attrList.push(attrMetadata);
				});
			}
			
			attrList.sort(function(a,b) { return a.csvColumnIndex - b.csvColumnIndex; });
			for (var i in attrList) {
				var aname = attrList[i].name; 
				colList.push({
					field: aname,
					title: aname,
					template: generateGridColumnTemplate.bind(null, aname)
				})
			}
			
			return colList;
		},
		
		generateDummyDataSource: function(colList) {
			var rows = [];
			var dmy_row = {};
			
			for (var i in colList) {
				var c = colList[i];
				dmy_row[c.field] = true;
			}
			
			rows.push(dmy_row);
			return rows;
		},
		
		generateColGridSchema: function(colList) {
			var fields = {};
			
			for (var i in colList) {
				var c = colList[i];
				fields[c.field] = { type: "boolean" };
			}
			
			return {
				model: {
					fields: fields
				}
			};
		},
		
		
		pickColumnOrder: function() {
			var ordered_names = [];
			var grid = this.jGridElement.data('kendoGrid');
			var row = grid.dataSource.at(0);
			
			var cols = grid.columns;
			for (var i in cols) {
				if (row[cols[i].field]) {
					ordered_names.push(cols[i].field);
				}
			}
			
			return ordered_names;
		},
		
		onExecuteButtonClick: function() {
			if (this.jobCurrentExporting) {
				this.abortJob();
				return;
			}
			
			this.bWaitingFileOpen = true;
			this.hideCompleteNotification();
			this.ownerApp.openExportDest();
		},
		
		clearJob: function() {
			this.bWaitingFileOpen = false;
			this.jobCurrentExporting = null;
		},
		
		showCompleteNotification: function() {
			kendo.fx( this.jCompleteNotification ).expand("vertical").stop().play();
		},
		
		hideCompleteNotification: function() {
			this.jCompleteNotification.hide();
		},
		
		// Callback from owner App
		notifyExportDestSucceeded: function() {
			if (this.bWaitingFileOpen) {
				this.clearJob();
				this.jobCurrentExporting = this.generateExportJobForSelectedLayer();
				this.jobCurrentExporting.setHeaderEnabled( this.getHeaderEnabled() );
			}
		},
		
		notifyExportDestWriteEnd: function() {
			if (this.jobCurrentExporting) {
				this.jobCurrentExporting.advance();
			}
		},

		notifyExportDestFailed: function() {
			this.clearJob();
		},


		generateExportJobForSelectedLayer: function() {
			var lyr = this.getSelectedLayer();
			if (lyr && lyr.capabilities & mobmap.LayerCapability.MarkerRenderable) {
				return this.generateExportJobForMovementCSV(lyr);
			}
			
			return null;
		},

		generateExportJobForMovementCSV: function(layer) {
			var colFieldList = this.pickColumnOrder();
			var job = newMovementExportJob(this, layer, colFieldList,  this.getSelectionOnlyState());
			
			return job;
		},

		showProgressOnButton: function(ratio) {
			var perc = Math.floor(ratio * 100.0 + 0.001);
			if (this.jRunButton) {
				this.jRunButton.text(perc + '% (Click to cancel)');
			}
		},
		
		restoreRunButtonLabel: function() {
			this.jRunButton.text( this.runButtonOriginalText );
		},

		// export APIs
		onExportJobProgressChange: function(ratio) {
			this.showProgressOnButton(ratio);
		},
		
		exportJobWriteBufferedContent: function(content) {
			this.ownerApp.sendExportFileContent(content);
		},
		
		exportJobWritePreivewContent: function(content) {
			this.jPreviewBox.text(content);
		},
		
		exportJobCloseFile: function() {
			this.showCompleteNotification();
			
			this.clearJob();
			this.restoreRunButtonLabel();
		},
		
		abortJob: function() {
			this.hideCompleteNotification();
			this.clearJob();
			this.restoreRunButtonLabel();
		},
		
		
		renewPreview: function() {
			this.jPreviewBox.text("Updating...");
			setTimeout( this.runPreviewJob.bind(this) , 10 )
		},
		
		runPreviewJob: function() {
			var j = this.generateExportJobForSelectedLayer();
			if (j) {
				j.setHeaderEnabled( this.getHeaderEnabled() );
				j.preview();
			}
		}
	};
	
	// ExportJobBase
	function ExportJob() {
		this.sourceLayer = null;
		this.listener = null;
		this.progressCount = 0;
		
		this.nAdvanceCalled = 0;
		this.step = 150;
		this.bufferOneLine = null;
		this.sendProgress = null;
		this.timeList = [];
		this.posList = [];
		this.exportAttributeList = [];
		this.attributeOriginalNameList = [];
		
		this.advanceClosure = this.advance.bind(this);
		this.previewMode = false;
		this.headerEnabled = false;
		this.selectedOnly = false;
	}
	
	ExportJob.prototype = {
		setSelectedOnly: function(b) {
			this.selectedOnly = b;
		},

		setHeaderEnabled: function(b) {
			this.headerEnabled = b;
		},

		preview: function() {
			this.previewMode = true;
			this.step = Math.floor(this.step / 10);
			this.advance();
		},

		advance: function() {
			_rows_tmp.length = 0;
			var kPreviewMinimum = 50;
			var n_step = (this.nAdvanceCalled === 0) ? 10 : this.step;

			if (this.nAdvanceCalled === 0 && this.headerEnabled) {
				this.generateHeaderRow(_rows_tmp);
			}


			var i;
			for (i = 0;i < n_step;++i) {
				var should_continue = false;

				if (this.bufferOneLine) {
					if (this.bufferOneLine(_rows_tmp)) {
						should_continue = true;
					}
				}

				if (this.previewMode && _rows_tmp.length < kPreviewMinimum) {
					++n_step; // need more...
				}

				if (!should_continue) {
					break;
				}
			}

			++this.nAdvanceCalled;

			if (this.sendProgress && !this.previewMode) {
				this.sendProgress(this.listener);
			}

			var forceContinue = false;
			if (!this.previewMode && _rows_tmp.length === 0 && should_continue) {
				// Nothing was exported in this cycle. But don't finish!
				forceContinue = true;
			}

			if (_rows_tmp.length > 0 || forceContinue) {
				// Not finished
				if (this.previewMode) {
					if (this.listener.exportJobWritePreivewContent) {
						this.listener.exportJobWritePreivewContent(_rows_tmp.join(''));
					}
				} else {
					if (this.listener.exportJobWriteBufferedContent) {
						this.listener.exportJobWriteBufferedContent(_rows_tmp.join(''));
					}
				}
			} else {
				// Finished
				if (this.listener.exportJobCloseFile && !this.previewMode) {
					this.listener.exportJobCloseFile();
				}
			}
		},
		
		generateHeaderRow: function(rows) {
			var cols = [];
			var ls = this.attributeOriginalNameList;
			for (var i = 0;i < ls.length;++i) {
				cols.push( ls[i] );
			}
			
			rows.push( cols.join(',') + '\n' );
		}
	};


	function newMovementExportJob(listener, layer, columnList, selOnly) {
		var j = new ExportJob();
		j.setSelectedOnly(selOnly);

		j.sourceLayer = layer;
		j.listener = listener;
		
		j.bufferOneLine = movementexp_bufferOneLine;
		j.sendProgress  = movementexp_sendProgress;

		movementexp_prepare.call(j, columnList);
		return j;
	}

	function movementexp_prepare(columnList) {
		var tmap = {};
		var pid;
		
		var md = this.sourceLayer.movingData;
		var nIDs = 0;
		for (pid in md.idMap) {
			++nIDs;

			var tl = md.getTimeListOfId(pid);
			if (tl) {
				var recordList = tl.getRecordList();
				for (var i = 0;i < recordList.length;++i) {
					var rec = recordList[i];
					tmap[rec._time] = true;
				}
			}
		}
		
		//console.log(nIDs, "IDs to be exported");
		
		this.timeList.length = 0;
		var i;
		for (i in tmap) { this.timeList.push(i - 0); }
		this.timeList.sort(function(a,b){ return a-b; });

		// Initialize recordlist-pos list
		this.posList.length = 0;
		var tlList = md.tlList;
		var tlen = this.timeList.length;
		for (i = 0;i < nIDs;++i) {
			var initVal = 0;
			
			if (this.selectedOnly && this.sourceLayer.localSelectionPool) {
				if (this.sourceLayer.localSelectionPool.isIDSelected( tlList[i].id )) {
					initVal = 0;
				} else {
					initVal = -1;
				}
			}
			
			this.posList.push(initVal);
		}
		
		// Make attribute list
		this.exportAttributeList.length = 0;
		this.attributeOriginalNameList.length = 0;
		for (i = 0;i < columnList.length;++i) {
			var aname = columnList[i];
			this.attributeOriginalNameList.push(aname);
			
			if (aname === 'id' || aname === 'time') {
				this.exportAttributeList.push('_' + aname);
			} else {
				this.exportAttributeList.push(aname);
			}
		}
		console.log("<<", this.exportAttributeList);
	}
	
	function movementexp_bufferOneLine(rowsBuffer) {
		if (this.progressCount >= this.timeList.length) {
			return false;
		}
		
		var tSeconds = this.timeList[this.progressCount];

		var md = this.sourceLayer.movingData;
		var tlList = md.tlList;
		var nTLs = tlList.length;
		var nWrote = 0;

		for (var i = 0;i < nTLs;++i) {
			var tl = tlList[i];
	//	if(i>7199 || i <2)console.log(i,tl,this.posList[i])
			var rlist = tl.getRecordList();
			if (this.posList[i] < 0) {
				// Don't export this ID (sel-only mode)
				continue;
			}
			
			for (;;) {
				var rec = rlist[ this.posList[i] ];

				if (rec) {
					if (rec._time === tSeconds) {
						rowsBuffer.push( movementexp_generateLine.call(this, this.listener, rec)  + '\n' );
						++nWrote;
		//var rec2=rlist[ this.posList[i]+1 ];
		//if(rec2)console.log("^^",this.posList[i], rec._time, rec2._time)

						++ this.posList[i];
						
						// Don't exit loop to export duplicated time period
					} else {
						break;
					}
				} else {
					break;
				}
			}

		}
		
		//console.log("^^^ ",i, this.progressCount, tSeconds, nTLs, nWrote)
		
		++ this.progressCount;

		return true;
	}

	function movementexp_sendProgress(listener) {
		if (listener && listener.onExportJobProgressChange) {
			var r = 1;
			if (this.timeList.length) {
				r = this.progressCount / this.timeList.length;
			}

			listener.onExportJobProgressChange(r);
		}
	}
	
	function movementexp_generateLine(listener, record) {
		var alist = this.exportAttributeList;
		var len = alist.length;
		_fields_tmp.length = 0;
		
		for (var i = 0;i < len;++i) {
			if (alist[i] === '_time') {
				_fields_tmp.push(formatDateTime( record[ alist[i] ] ));
			} else {
				_fields_tmp.push( record[ alist[i] ] );
			}
		}
		
		return _fields_tmp.join(',');
	}
	
	function formatDateTime(rawT) {
		return kendo.toString(new Date(rawT * 1000.0), "yyyy-MM-dd HH:mm:ss");
//		d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()
	}

	var _fields_tmp = [];
	var _rows_tmp = [];
	
	// Column Sorter Templete  = = = = = = = =
	
	function generateGridColumnTemplate(aname, itemData) {
		var x = itemData[aname];
		return x ? '<span class="mm-booleangrid-true">Yes</span>' : '<span class="mm-booleangrid-false">No</span>';
	}
	
	// = = = = = = = = = = = = = = = = = = = =
	
	mobmap.MMDialogBaseInstallAPIs(ExportDataDialog.prototype);
	aGlobal.mobmap.ExportDataDialog = ExportDataDialog;
})(window);