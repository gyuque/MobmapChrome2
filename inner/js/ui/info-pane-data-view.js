if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	function DataDetailView(containerElement) {
		this.ownerApp = null;
		this.dataSourceForGrid = null;
		this.gridOuterElement = null;
		this.jGridOuterElement = null;
		// -----------------
		this.containerElement = containerElement;
		this.jContainerElement = $(containerElement);

		this.buildView();
	}
	
	DataDetailView.prototype = {
		buildView: function() {
			this.dataSourceForGrid = new kendo.data.DataSource();
			
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
		
		getDataGridObject: function() {
			return this.jGridOuterElement.data("kendoGrid");
		}
	};

	// +++ Export +++
	aGlobal.mobmap.DataDetailView = DataDetailView;
})(window);