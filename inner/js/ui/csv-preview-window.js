if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	function CSVPreviewWindow() {
		this.element = this.jElement = this.previewContainer = null;
		this.csvLoader = null;
		this.previewTable = null;
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
			
			this.csvLoader.startPreviewLoad( this.onPreviewLoadFinish );
		},
		
		csvloaderPreloadError: function() {
			
		},
		
		onPreviewLoadFinish: function(success, previewRecords) {
			if (success) {
				this.previewTable = new CSVPreviewTable(previewRecords);
			}
		}
	};


	function CSVPreviewTable(sourceRecords) {
		
	}
	
	CSVPreviewTable.prototype = {
		
	};

	// +++ Export +++
	aGlobal.mobmap.CSVPreviewWindow = CSVPreviewWindow;
})(window);