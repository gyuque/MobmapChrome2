if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function MarkerConfigurationPanel(markerGenerator) {
		this.markerGenerator = markerGenerator;
		this.expandablePanel = new mobmap.ExpandablePanel();
		this.element = this.expandablePanel.element;
		this.expandablePanel.setTitle("Marker");
		
		this.varyingRadios = {};
		this.attrBindComboElement = null;
		
		this.configurePanelContent();
	}
	
	MarkerConfigurationPanel.prototype = {
		configurePanelContent: function() {
			var cc = this.expandablePanel.closedContentElement;
			cc.innerHTML = '';
			cc.appendChild( this.markerGenerator.previewCanvas );
			
			var ec = this.expandablePanel.expandedContentElement;
			ec.innerHTML = '';
			ec.appendChild( this.markerGenerator.resultCanvas );
			
			this.buildMarkerVaryOptions(ec);
			this.buildMarkerAttrBindOptions(ec);
		},
		
		buildMarkerVaryOptions: function(containerElement) {
			var fs = makeFieldSetWithLegend('Varying');
			
			var rl_none = generateRadioInLabel('None',         'MarkerVaryType', 'varytypeopt');
			var rl_attr = generateRadioInLabel('By attribute', 'MarkerVaryType', 'varytypeopt');
			var rl_day  = generateRadioInLabel('By day',       'MarkerVaryType', 'varytypeopt');

			this.varyingRadios.none = rl_none;
			this.varyingRadios.attr = rl_attr;
			this.varyingRadios.day = rl_day;

			fs.appendChild( rl_none.label );
			fs.appendChild( rl_attr.label );
			fs.appendChild( rl_day.label );

			// Observe
			var v_handler = this.onVaryingRadioChange.bind(this);
			$(rl_none.input).click(v_handler);
			$(rl_attr.input).click(v_handler);
			$(rl_day.input).click(v_handler);

			containerElement.appendChild(fs);
		},
		
		buildMarkerAttrBindOptions: function(containerElement) {
			var fs = makeFieldSetWithLegend('Vary by attribute');
			
			this.attrBindComboElement = makeComboWithLabel(fs, 'Attribute', 'mm-bind-attr-combo');

			containerElement.appendChild(fs);
		},


		onVaryingRadioChange: function() {
			console.log("vchange");
		},

		show: function() { this.expandablePanel.show(); },
		hide: function() { this.expandablePanel.hide(); },
		
		// Additional properties
		clearAdditionalPropertyList: function() {
			this.attrBindComboElement.innerHTML = '';
		},
		
		addAdditionalPropertyName: function(attrName) {
			var opt = $H('option');
			opt.appendChild( $T(attrName) );
			opt.value = attrName;
			
			this.attrBindComboElement.appendChild(opt);
		}
	};
	
	function makeFieldSetWithLegend(legendText) {
		var fs = $H('fieldset');
		var lg = $H('legend');

		lg.appendChild( document.createTextNode(legendText) );
		fs.appendChild(lg);

		return fs;
	}
	
	function makeComboWithLabel(container, labelText, labelClass) {
		var cb = $H('select');
		var lb = $H('label', labelClass);
		
		lb.appendChild( $T(labelText) );
		lb.appendChild(cb);
		container.appendChild(lb);
		return cb;
	}
	
	aGlobal.mobmap.MarkerConfigurationPanel = MarkerConfigurationPanel;
})(window);