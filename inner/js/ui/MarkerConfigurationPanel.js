if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function MarkerConfigurationPanel(markerGenerator, layer) {
		this.boundLayer = layer;
		
		this.markerGenerator = markerGenerator;
		this.expandablePanel = new mobmap.ExpandablePanel();
		this.element = this.expandablePanel.element;
		this.jElement = $(this.element);
		this.expandablePanel.setTitle("Marker");
		
		this.varyingRadios = {};
		this.attrBindComboElement = null;
		
		this.configurePanelContent();
		this.syncFromModel();
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

			rl_none.input.value = mobmap.LayerMarkerOptions.MV_NONE;
			rl_attr.input.value = mobmap.LayerMarkerOptions.MV_ATTR;
			rl_day.input.value  = mobmap.LayerMarkerOptions.MV_DAY;

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
			$(this.attrBindComboElement).change( this.onAttrBindSelChange.bind(this) );

			containerElement.appendChild(fs);
		},
		
		onAttrBindSelChange: function() {
			this.sendAttrNameToBind();
		},
		
		sendAttrNameToBind: function() {
			var mo = this.boundLayer._markerOptions || null;
			if (mo) {
				var n = this.getAttrNameToBind();
				mo.bindAttributeName(n);
			}
		},
		
		getAttrNameToBind: function() {
			return this.attrBindComboElement.value;
		},

		

		getSelectedVaryingType: function() {
			var rawVal = this.jElement.find('input[name=MarkerVaryType]:checked').val();
			if (rawVal !== null && rawVal !== undefined) {
				return parseInt(rawVal, 10);
			} else {
				return null;
			}
		},

		onVaryingRadioChange: function(e) {
			var mo = this.boundLayer._markerOptions || null;
			if (mo) {
				var newVal = parseInt(e.target.value, 10);
				mo.setVaryingType(newVal);
			}
			
			this.syncFromModel();
		},
		
		checkVaryingTypeRadio: function(newVal) {
			checkRadioboxByInt(this.jElement, 'MarkerVaryType', newVal);
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
		},
		
		syncFromModel: function() {
			var mo = this.boundLayer._markerOptions || null;
			if (mo) {
				var vtype = mo.varyingType;
				var selected_vtype = this.getSelectedVaryingType();
				if (vtype !== selected_vtype) {
					this.checkVaryingTypeRadio(vtype);
				}
			}
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
	
	function checkRadioboxByInt(originElement, name, i) {
		originElement.find('input[name=' +name+ ']').each(function(elIndex, element) {
			if ( parseInt(element.value, 10) === i ) {
				element.checked = true;
			}
		});
	}
	
	aGlobal.mobmap.MarkerConfigurationPanel = MarkerConfigurationPanel;
})(window);