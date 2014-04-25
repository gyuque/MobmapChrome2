if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	function DataDetailView(containerElement) {
		this.ownerApp = null;
		this.dataSourceForGrid = null;
		this.gridOuterElement = null;
		this.jGridOuterElement = null;
		this.jCollapseWarning = null;
		this.jTableTitle = null;
		this.targetSelectElement = null;
		this.currentTargetId = -1;
		this.forceShowAll = false;
		this.nowShowingSelectedOnly = false;
		// -----------------
		this.dataSourceArray = [];
		this.containerElement = containerElement;
		this.jContainerElement = $(containerElement);

		this.buildView();
	}
	
	DataDetailView.prototype = {
		setApp: function(a) {
			this.ownerApp = a;
			this.observeApp();
			this.observeProject();
		},
		
		observeApp: function() {
			var ed = this.ownerApp.eventDispatcher();
			ed.bind(mobmap.Mobmap2App.PROJECT_SET_EVENT, this.onAppProjectSet.bind(this));
		},

		onAppProjectSet: function() {
			this.observeProject();
		},

		observeProject: function() {
			var prj = this.ownerApp.getCurrentProject();
			if (prj) {
				var ed = prj.eventDispatcher();
				ed.
				 bind(mobmap.MMProject.LAYERLIST_CHANGE, this.onLayerListChange.bind(this)).
				 bind(mobmap.LayerEvent.LoadFinish, this.onAnyLayerLoadFinish.bind(this));
			}
		},

		onAnyLayerLoadFinish: function() {
			this.onLayerListChange();
		},

		onLayerListChange: function() {
			var prj = this.ownerApp.getCurrentProject();
			
			this.clearTargetSelect();
			if (prj) {
				this.fillTargetSelect(prj.getLayerList());
			}
			
			this.fetchTargetSelectValue();
		},

		buildView: function() {
			this.dataSourceForGrid = new kendo.data.DataSource({data: this.dataSourceArray});
			this.addCollapseDisp( this.containerElement );
			this.addTargetSelector( this.containerElement );
			this.addTableTitle( this.containerElement );
			
			this.gridOuterElement = $H('div', 'mm-data-grid-outer');
			this.jGridOuterElement = $(this.gridOuterElement).click( this.onClickInsideGrid.bind(this) );
			this.containerElement.appendChild(this.gridOuterElement);
			this.jGridOuterElement.kendoGrid({
				detailTemplate: this.generateRowDetailBox.bind(this)
			});
			
			var gr = this.getDataGridObject();
			gr.setDataSource(this.dataSourceForGrid);
		},
		
		generateRowDetailBox: function(item) {
			var count = this.generateRowDetailRecordsCount(item._id);
			var velo  = this.generateRowDetailVelocity(item);
			var buttons = 
			 this.generateDetailRowButton('reveal', item, 'images/drowbtn-reveal.png', 'Reveal on map') +
			 this.generateDetailRowButton('only', item, 'images/drowbtn-only.png', 'Select this only');
			
			if (this.nowShowingSelectedOnly) {
				buttons += this.generateDetailRowButton('deselect', item, 'images/drowbtn-remove.png', 'Deselect this');
			}
			
			return '<div class="mm-datatable-detail-box">'+ count+velo+buttons+ '</div>';
		},
		
		generateRowDetailRecordsCount: function(objId) {
			var n = 0;
			var sourceLayer = this.getCurrentSourceLayer();
			if (sourceLayer) {
				var tl = sourceLayer.movingData.getTimeListOfId(objId);
				if (tl) {
					n = tl.getRecordList().length;
				}
			}
			
			return '<div class="mm-datatable-detail-mini-info">' +n+ ' records</div>' ;
		},
		
		generateRowDetailVelocity: function(item) {
			var mPerSec = 0;
			var dispV1 = '0';
			var dispV2 = '0';
			
			if (item._backKeyTime && item._fwdKeyTime) {
				var sourceLayer = this.getCurrentSourceLayer();
				if (sourceLayer) {
					var rec1 = sourceLayer.movingData.getKeyFrameRecord(item._id, item._backKeyTime);
					var rec2 = sourceLayer.movingData.getKeyFrameRecord(item._id, item._fwdKeyTime);
					
					var etime = item._fwdKeyTime - item._backKeyTime;
					var distance = calcDistanceFromLatLng(rec1.x, rec1.y, rec2.x, rec2.y);
					if (etime) {
						mPerSec = distance / etime;
						dispV1 = mPerSec.toFixed(1);
						dispV2 = (mPerSec * 3600.0 / 1000.0).toFixed(1);
					}
				}
			}
			
			return '<div class="mm-datatable-detail-mini-info">' +dispV1+ ' m/s (' +dispV2+ ' km/h)</div>' ;
		},
		
		getCurrentSourceLayer: function() {
			if (!this.ownerApp) { return null; }

			var prj = this.ownerApp.getCurrentProject();
			if (!prj) { return null; }
			
			return prj.getLayerById(this.currentTargetId);
		},
		
		generateDetailRowButton: function(commandName, boundItem, iconURL, title) {
			return '<img class="mm-detail-row-command-button" data-command="' +commandName+ '" data-lat="' +boundItem.y+ '" data-lng="' +boundItem.x+ '" data-objid="' +boundItem._id+ '" title="' +title+ '" src="' +iconURL+ '">';
		},

		addCollapseDisp: function(contaierElement) {
			var div = $H('div', 'mm-datatable-collapse-warning');
			contaierElement.appendChild(div);

			this.jCollapseWarning = $(div).hide().click(this.onCollapseWarningClick.bind(this));
		},
		
		addTableTitle: function(containerElement) {
			var h = $H('h3', 'mm-datatable-title');
			containerElement.appendChild(h);
			this.jTableTitle = $(h).hide();
		},
		
		updateTableTitle: function(sel_enabled, n) {
			if (sel_enabled) {
				var postfix = (n > 1) ? ' selected objects' : ' selected object';
				this.jTableTitle.text(n + postfix).show();
			} else {
				this.jTableTitle.hide();
			}
		},
		
		showCollapseWarning: function(nAll) {
			var msg = 'Showing cut-off table. Click here to show all '+ nAll + ' rows.';
			this.jCollapseWarning.text(msg).show();
		},
		
		onCollapseWarningClick: function() {
			this.forceShowAll = true;
			this.requestRedraw();
			this.forceShowAll = false;
		},
		
		hideCollapseWarning: function() {
			this.jCollapseWarning.hide();
		},

		addTargetSelector: function(containerElement) {
			var lab = $H('label', 'mm-data-view-target-selector-label');
			var sel = $H('select');
			
			lab.appendChild( $T('Layer: ') );
			lab.appendChild( sel );
			
			containerElement.appendChild(lab);
			this.targetSelectElement = sel;

			$(sel).change( this.onTargetSelectChange.bind(this) );
		},

		getDataGridObject: function() {
			return this.jGridOuterElement.data("kendoGrid");
		},
		
		clearTargetSelect: function() {
			this.targetSelectElement.innerHTML = '';
		},
		
		fillTargetSelect: function(layerList) {
			var len = layerList.getCount();
			for (var i = 0;i < len;++i) {
				var layer = layerList.getLayerAt(i);
				if (layer.capabilities & mobmap.LayerCapability.MarkerRenderable) {
					var desc = layer.getShortDescription();
					
					var op = $H('option');
					op.appendChild( $T(desc) );
					op.value = layer.layerId;
					
					this.targetSelectElement.appendChild(op);
				}
			}
		},
		
		notifyMovingDataPicked: function(sourceLayer, pickedArray, count) {
			var nToShow = count;
			if (sourceLayer.layerId !== this.currentTargetId) {
				return;
			}
			
			var any_selected = false;
			var sel_count = 0;
			var selp = sourceLayer.localSelectionPool;
			if (selp.isAnySelected()) {
				any_selected = true;
				sel_count = selp.count();
				nToShow = sel_count;
			}
			
			if (!this.forceShowAll && nToShow > 100) {
				this.showCollapseWarning(nToShow);
				nToShow = 100;
			} else {
				this.hideCollapseWarning();
			}

			// Refer records
			var i;
			var arr = this.dataSourceArray;
			arr.length = nToShow;
			
			if (!any_selected) {
				for (i = 0;i < nToShow;++i) {
					arr[i] = pickedArray[i];
				}
			} else {
				var wroteCount = 0;
				for (i = 0;i < count;++i) {
					var srcRecord = pickedArray[i];
					if (selp.isIDSelected(srcRecord._id)) {
						arr[wroteCount++] = srcRecord;
					}
					
					if (wroteCount >= nToShow) {
						break;
					}
				}
			}
			
			this.nowShowingSelectedOnly = any_selected;
			this.updateTableTitle(any_selected, sel_count);
			this.dataSourceForGrid.read();
			
			var gr = this.getDataGridObject();
			gr.hideColumn("_pickIndex");
			gr.hideColumn("_pickTime");
			gr.hideColumn("_backKeyTime");
			gr.hideColumn("_fwdKeyTime");

//			console.log("renew", count)
		},
		
		onClickInsideGrid: function(e) {
			if (e.target) {
				var cmd = e.target.getAttribute('data-command');
				if (cmd && cmd.length > 0) {
					this.execDetailBoxCommand(cmd, e.target);
				}
			}
		},
		
		execDetailBoxCommand: function(cmdName, sourceElement) {
			var oid = sourceElement.getAttribute('data-objid');
			
			switch(cmdName) {
				case 'reveal': {
					if (this.ownerApp) {
						var lat = parseFloat( sourceElement.getAttribute('data-lat') );
						var lng = parseFloat( sourceElement.getAttribute('data-lng') );
						var mp = this.ownerApp.getMapPane();
						mp.showAimingMarker(lat, lng);
						mp.panTo(lat, lng);
					}
					break;
				} 
			
				case 'deselect': {
					this.deselectId(oid);
					break;
				}
		
				case 'only': {
					this.selectOneId(oid);
					break;
				}
			}
		},
		
		deselectId: function(objId) {
			var lyr = this.getCurrentSourceLayer();
			if (lyr && lyr.localSelectionPool) {
				lyr.localSelectionPool.removeId(objId);
			}
		},
		
		selectOneId: function(objId) {
			var lyr = this.getCurrentSourceLayer();
			if (lyr && lyr.localSelectionPool) {
				lyr.localSelectionPool.clear(true);
				lyr.localSelectionPool.addId(objId);
			}
		},
		
		onTargetSelectChange: function() {
			this.fetchTargetSelectValue();
		},
		
		fetchTargetSelectValue: function() {
			var v = parseInt(this.targetSelectElement.value);
			if (this.currentTargetId !== v) {
				this.currentTargetId = v;
				this.requestRedraw();
			}
		},
		
		requestRedraw: function() {
			if (this.ownerApp) {
				this.ownerApp.redrawMap();
			}
		}
	};

	// +++ Export +++
	aGlobal.mobmap.DataDetailView = DataDetailView;
})(window);