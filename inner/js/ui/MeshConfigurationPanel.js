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
		this.jValRangeSlider = null;
		this.jValRangeDispBox = null;
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
			
			this.buildValueRangeController(ec);
		},
		
		buildValueRangeController: function(container) {
			var box = $H('div', 'mm-gradient-val-range-control-box');
			
			var labelbox = $H('div');
			labelbox.innerHTML = "Val. range:";
			
			var val_range = $H('input', 'mm-gradient-val-range-slider');
			val_range.type = 'range';
			val_range.min = 0;
			val_range.max = mobmap.MMMeshLayer.RangePreset.length - 1;

			this.jValRangeSlider = $(val_range);
			this.jValRangeDispBox = $(labelbox);
			
			box.appendChild(labelbox);
			box.appendChild(val_range);
			container.appendChild(box);
		},
		
		show: function() { this.expandablePanel.show(); },
		hide: function() { this.expandablePanel.hide(); }
	};

	aGlobal.mobmap.MeshConfigurationPanel = MeshConfigurationPanel;
})(window);
