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
		this.jLabelCheck = null;
		this.jSpacingCheck = null;
		this.expandablePanel.setTitle("Cell appearance");

		this.gradientEditor = new mobmap.GradientEditor( layer.colorRule, this );
		this.configurePanelContent();
		this.observeValueRangeControllerEvents();
		this.observeCellOptionsEvents();
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
			this.buildCellStyleOptions(ec);
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
			 bind(mobmap.MMMeshLayer.RENDER_VALUE_RANGE_CHANGE, this.onRenderValueRangeChange.bind(this) ).
			 bind(mobmap.MMMeshLayer.COLOR_RULE_CHANGE, this.onColoringRuleChange.bind(this) );
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
		
		makeValRangeText: function() {
			var r = this.boundLayer.renderValueRange;
			return r.min +'-'+ r.max
		},
		
		updateValRangeText: function() {
			this.jValRangeDispBox.text( "Val. range: " + this.makeValRangeText() );
			this.gradientEditor.renderSmallPreview();
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
		
		onColoringRuleChange: function() {
			this.gradientEditor.syncFromModel();
		},
		
		getGradientPreivewLabelText: function() {
			return this.makeValRangeText();
		},

		buildCellStyleOptions: function(containerElement) {
			var chk_l = createCheckbox('mm-mesh-style-check', 'mm-mesh-style-labeled');
			var lab_l = $H('label', 'mm-mesh-style-check-label');
			lab_l.appendChild( chk_l );
			lab_l.appendChild( $T('Label') );
			
			containerElement.appendChild(lab_l);
			this.jLabelCheck = $(chk_l);
			
			var chk_s = createCheckbox('mm-mesh-style-check', 'mm-mesh-style-spacing');
			var lab_s = $H('label', 'mm-mesh-style-check-label');
			lab_s.appendChild( chk_s );
			lab_s.appendChild( $T('Spacing') );

			containerElement.appendChild(lab_s);
			this.jSpacingCheck = $(chk_s);
		},

		observeCellOptionsEvents: function() {
			this.jLabelCheck.click( this.onCellLabelCheckClick.bind(this) );
			this.jSpacingCheck.click( this.onCellSpacingCheckClick.bind(this) );
		},
		
		onCellLabelCheckClick: function() {
			this.boundLayer.setCellLabelEnabled( this.getCellLabelCheck() );
		},
		
		getCellLabelCheck: function() {
			return !! this.jLabelCheck[0].checked;
		},
		
		onCellSpacingCheckClick: function() {
			this.boundLayer.setCellSpacing( this.getCellSpacingCheck() ? 1 : 0 );
		},

		getCellSpacingCheck: function() {
			return !! this.jSpacingCheck[0].checked;
		},

		show: function() { this.expandablePanel.show(); },
		hide: function() { this.expandablePanel.hide(); }
	};

	aGlobal.mobmap.MeshConfigurationPanel = MeshConfigurationPanel;
})(window);
