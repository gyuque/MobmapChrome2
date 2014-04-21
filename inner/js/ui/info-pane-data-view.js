if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	function DataDetailView(containerElement) {
		this.ownerApp = null;
		this.dataSourceForGrid = null;
		this.gridOuterElement = null;
		this.jGridOuterElement = null;
		this.targetSelectElement = null;
		// -----------------
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
		},

		buildView: function() {
			this.dataSourceForGrid = new kendo.data.DataSource();
			this.addTargetSelector( this.containerElement );
			
			this.gridOuterElement = $H('div', 'mm-data-grid-outer');
			this.jGridOuterElement = $(this.gridOuterElement);
			this.containerElement.appendChild(this.gridOuterElement);
			this.jGridOuterElement.kendoGrid();
			
			this.getDataGridObject().setDataSource(this.dataSourceForGrid);
			/*
			var testdata = [];
			for (var i = 0;i < 99;++i) {
				testdata.push( {id: 'Test'+i, x:139.25+i*0.1, y:35.5+i*0.1} );
			}
			this.dataSourceForGrid.data( testdata );*/
		},
		
		addTargetSelector: function(containerElement) {
			var lab = $H('label');
			var sel = $H('select');
			
			lab.appendChild( $T('Target: ') );
			lab.appendChild( sel );
			
			containerElement.appendChild(lab);
			this.targetSelectElement = sel;
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
		}
	};

	// +++ Export +++
	aGlobal.mobmap.DataDetailView = DataDetailView;
})(window);