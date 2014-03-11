if (!window.mobmap) { window.mobmap={}; }
// [][][][] ||||||||||||||||||
// [][][][] MESH CONFIGURATION
// [][][][] ||||||||||||||||||

(function(aGlobal) {
	'use strict';
	
	function MeshConfigurationPanel(layer) {
		this.boundLayer = layer;

		this.expandablePanel = new mobmap.ExpandablePanel();
		this.element = this.expandablePanel.element;
		this.jElement = $(this.element);
		this.expandablePanel.setTitle("Mesh");

		this.gradientEditor = new mobmap.GradientEditor( layer.colorRule );
		this.configurePanelContent();
	}
	
	MeshConfigurationPanel.prototype = {
		configurePanelContent: function() {
			var ec = this.expandablePanel.expandedContentElement;
//			ec.innerHTML = '';
//			ec.appendChild( this.markerGenerator.resultCanvas );
		},
		
		show: function() { this.expandablePanel.show(); },
		hide: function() { this.expandablePanel.hide(); }
	};

	aGlobal.mobmap.MeshConfigurationPanel = MeshConfigurationPanel;
})(window);
