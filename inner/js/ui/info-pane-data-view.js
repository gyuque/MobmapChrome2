if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	function DataDetailView(containerElement) {
		this.ownerApp = null;
		this.dataSourceForGrid = null;
		this.gridOuterElement = null;
		this.jGridOuterElement = null;
		this.jCollapseWarning = null;
		this.targetSelectElement = null;
		this.currentTargetId = -1;
		this.forceShowAll = false;
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
			this.addTargetSelector( this.containerElement );
			this.addCollapseDisp( this.containerElement );
			
			this.gridOuterElement = $H('div', 'mm-data-grid-outer');
			this.jGridOuterElement = $(this.gridOuterElement);
			this.containerElement.appendChild(this.gridOuterElement);
			this.jGridOuterElement.kendoGrid({
				detailTemplate: this.generateRowDetailBox.bind(this)
			});
			
			var gr = this.getDataGridObject();
			gr.setDataSource(this.dataSourceForGrid);
		},
		
		generateRowDetailBox: function(item) {
			console.log(item._id)
			return '<div class="mm-datatable-detail-box"><button>Select this</button> <button>Deselect others</button></div>';
		},

		addCollapseDisp: function(contaierElement) {
			var div = $H('div', 'mm-datatable-collapse-warning');
			contaierElement.appendChild(div);

			this.jCollapseWarning = $(div).hide().click(this.onCollapseWarningClick.bind(this));
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
			
			lab.appendChild( $T('Target: ') );
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
			if (sourceLayer.layerId !== this.currentTargetId) {
				return;
			}
			
			
			var nToShow = count;
			if (!this.forceShowAll && nToShow > 100) {
				nToShow = 100;
				this.showCollapseWarning(count);
			} else {
				this.hideCollapseWarning();
			}

			// Refer records
			var arr = this.dataSourceArray;
			arr.length = nToShow;
			for (var i = 0;i < nToShow;++i) {
				arr[i] = pickedArray[i];
			}
			
			this.dataSourceForGrid.read();
			
			var gr = this.getDataGridObject();
			gr.hideColumn("_pickIndex");
			gr.hideColumn("_pickTime");
			gr.hideColumn("_backKeyTime");
			gr.hideColumn("_fwdKeyTime");

//			console.log("renew", count)
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