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
		this.expandablePanel.setTitle("Mesh coloring");

		this.gradientEditor = new mobmap.GradientEditor( layer.colorRule );
		this.configurePanelContent();
	}
	
	MeshConfigurationPanel.prototype = {
		configurePanelContent: function() {
			var cc = this.expandablePanel.closedContentElement;
			cc.innerHTML = '';
			cc.appendChild( this.gradientEditor.getPreviewElement() );

			var ec = this.expandablePanel.expandedContentElement;
			ec.innerHTML = '';
			ec.appendChild( this.gradientEditor.element );
		},
		
		show: function() { this.expandablePanel.show(); },
		hide: function() { this.expandablePanel.hide(); }
	};

	aGlobal.mobmap.MeshConfigurationPanel = MeshConfigurationPanel;
})(window);
