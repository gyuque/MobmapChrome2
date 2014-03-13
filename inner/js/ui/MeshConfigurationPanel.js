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
		this.observeValueRangeControllerEvents();
		this.observeModelChangeEvents();
		
		this.syncFromData();
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

		observeValueRangeControllerEvents: function() {
			this.jValRangeSlider.change( this.onValRangeSliderChange.bind(this) );
		},
		
		observeModelChangeEvents: function() {
			this.boundLayer.eventDispatcher().
			 bind(mobmap.MMMeshLayer.RENDER_VALUE_RANGE_CHANGE, this.onRenderValueRangeChange.bind(this) );
		},
		
		onValRangeSliderChange: function () {
			var index = this.getValRangeSliderValue();
			var maxIndex = mobmap.MMMeshLayer.RangePreset.length - 1;
			if (index > maxIndex) { index = maxIndex; }
			
			var presetValue = mobmap.MMMeshLayer.RangePreset[index];
			this.sendNewValueRangeMax(presetValue);
		},
		
		sendNewValueRangeMax: function(vmax) {
			this.boundLayer.setRenderValueRangeMax(vmax);
		},
		
		getValRangeSliderValue: function() {
			return this.jValRangeSlider.val() - 0;
		},
		
		updateValRangeText: function() {
			var r = this.boundLayer.renderValueRange;
			this.jValRangeDispBox.text("Val. range: " + r.min +'-'+ r.max);
		},
		
		updateValRangeSliderPosition: function() {
			var vmax = this.boundLayer.renderValueRange.max;
			var index = mobmap.MMMeshLayer.RangePreset.indexOf(vmax);
			if (index >= 0) {
				var currentIndex = this.getValRangeSliderValue();
				if (currentIndex !== index) {
					this.jValRangeSlider.val(index);
				}
			}
		},

		syncFromData: function() {
			this.updateValRangeText();
			this.updateValRangeSliderPosition();
		},
		
		onRenderValueRangeChange: function() {
			this.syncFromData();
		},

		show: function() { this.expandablePanel.show(); },
		hide: function() { this.expandablePanel.hide(); }
	};

	aGlobal.mobmap.MeshConfigurationPanel = MeshConfigurationPanel;
})(window);
