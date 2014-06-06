if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function ExportSelectionDialog() {
		this.targetLayer = null;
		this.jTrjKMLBox = null;
		this.jTrjKMLLeadSentence = null;
		this.jTrjKMLButton = null;
		this.jGeneratedKMLLinkElement = null;
		this.initProperties();
	}
	
	ExportSelectionDialog.prototype = {
		ensureWindowElement: function() {
			if (!this.element) {
				this.buildView();
				this.jMessageArea.html("Select export type.");
				
				var tkml = this.generateTrajectoryKMLExportBox();
				this.insertElementBeforeButtonArea(tkml);
			}
		},

		generateTrajectoryKMLExportBox: function() {
			var box = document.createElement('div');
			this.jTrjKMLBox = $(box).hide();
			
			var lead = document.createElement('div');
			this.jTrjKMLLeadSentence = $(lead);
			
			var btn = document.createElement('button');
			btn.innerHTML = 'Generate KML';
			this.jTrjKMLButton = $(btn).click(this.onTrajectoryKMLButtonClick.bind(this));

			var a = document.createElement('a');
			a.innerHTML = 'Save';
			a.setAttribute('download', 'mobmap-exported.kml');
			a.setAttribute('target', '_blank');
			this.jGeneratedKMLLinkElement = $(a);
			
			box.appendChild(lead);
			box.appendChild(btn);
			box.appendChild(a);
			return box;
		},

		showDialog: function(targetLayer) {
			this.targetLayer = targetLayer;
			this.ensureWindowElement();
			this.initTrajectoryKMLExportBox();
			this.showDialogOnCenter('Export');
		},
		
		initTrajectoryKMLExportBox: function() {
			this.jGeneratedKMLLinkElement.hide();

			var lyr = this.targetLayer;
			if (!(lyr.capabilities & mobmap.LayerCapability.SpatialSelectable)) {
				this.jTrjKMLBox.hide();
				return;
			}
			
			this.jTrjKMLBox.show();
			this.jTrjKMLButton.show();
			var selp = lyr.localSelectionPool;
			if (selp.isAnySelected()) {
				this.jTrjKMLLeadSentence.text('Selection: ' +selp.count()+ 'IDs')
			} else {
				this.jTrjKMLLeadSentence.text('Selection: none (All objects will be exported)')
			}
		},
		
		onTrajectoryKMLButtonClick: function() {
			var generator = new ExportKMLGenerator(this.targetLayer, this.onKMLGeneratorFinish.bind(this));
			generator.generate();
		},
		
		onKMLGeneratorFinish: function(generator) {
			var url = generator.getResourceURL();
			this.jTrjKMLButton.hide();

			this.jGeneratedKMLLinkElement.attr('href', url).show();
		}
	};
	
	function ExportKMLGenerator(sourceLayer, onFinish) {
		this.sourceLayer = sourceLayer;
		this.onFinish = onFinish;
		this.xmlLines = [];
		this.jobIDList = [];
	}
	
	ExportKMLGenerator.prototype = {
		generate: function() {
			this.xmlLines.length = 0;
			this.jobIDList.length = 0;
			
			// Call listener
			if (this.onFinish) { this.onFinish(this); }
		},
		
		getResourceURL: function() {
			var lines = [];
			ExportKMLGenerator.wrapKMLDocument(lines);

			var b = new Blob(lines);
			return window.URL.createObjectURL(b);
		}
	};
	
	ExportKMLGenerator.wrapKMLDocument = function(lines) {
		lines.unshift(' <Document>\n');
		lines.unshift('<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2" xmlns:kml="http://www.opengis.net/kml/2.2" xmlns:atom="http://www.w3.org/2005/Atom">\n');
		lines.unshift('<?xml version="1.0" encoding="UTF-8"?>\n');
			
		lines.push(' </Document>\n');
		lines.push('</kml>');
		
		return lines;
	};


	mobmap.MMDialogBaseInstallAPIs(ExportSelectionDialog.prototype);
	aGlobal.mobmap.ExportSelectionDialog = ExportSelectionDialog;
})(window);