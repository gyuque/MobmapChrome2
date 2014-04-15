if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function MarkerConfigurationPanel(markerGenerator, layer) {
		this.boundLayer = layer;
		
		this.markerGenerator = markerGenerator;
		this.markerGenerator.eventDispatcher().bind(
			mobmap.MarkerGenerator.CHANGE_EVENT,
			this.onMarkerGeneratorConfigurationChange.bind(this)
		);
		
		this.expandablePanel = new mobmap.ExpandablePanel();
		this.element = this.expandablePanel.element;
		this.jElement = $(this.element);
		this.expandablePanel.setTitle("Marker");
		
		this.markerSliderElements = {
			jSlider: null,
			jDispBox: null
		};
		
		this.checkShowTyphoonCloud = null;
		this.checkShowSelectedOnly = null;
		this.varyingRadios = {};
		this.attrBindComboElement = null;
		
		this.configurePanelContent();
		this.syncFromModel();
	}
	
	MarkerConfigurationPanel.prototype = {
		configurePanelContent: function() {
			if (this.boundLayer.capabilities & mobmap.LayerCapability.TyphoonMarkerRecommended) {
				this.configureTyphoonMarkerPanelContent();
				return;
			}
			
			var cc = this.expandablePanel.closedContentElement;
			cc.innerHTML = '';
			cc.appendChild( this.markerGenerator.previewCanvas );
			
			var ec = this.expandablePanel.expandedContentElement;
			ec.innerHTML = '';
			ec.appendChild( this.markerGenerator.resultCanvas );
			
			this.buildMarkerColumnsSlider(ec);
			this.buildMarkerVaryOptions(ec);
			this.buildMarkerAttrBindOptions(ec);
			this.buildOtherOptions(ec);
		},
		
		configureTyphoonMarkerPanelContent: function() {
			var cc = this.expandablePanel.closedContentElement;
			cc.innerHTML = '';
			
			var t_icon = document.createElement('img');
			t_icon.src = "images/typhoon-data-icon.png";
			t_icon.width = t_icon.height = 16;
			cc.appendChild(t_icon);
			
			// expanded
			var ec = this.expandablePanel.expandedContentElement;
			ec.innerHTML = '';
			
			var t_icon2 = document.createElement('img');
			t_icon2.src = t_icon.src;
			ec.appendChild( t_icon2 );
			
			var cloud_chk = createCheckbox('mm-typhoon-marker-option', 'mm-typhoon-marker-option-cloud');
			var lab = $H('label', 'mm-typhoon-marker-option-label');
			lab.appendChild(cloud_chk);
			lab.appendChild( $T('Cloud animation') );
			ec.appendChild(lab);
			this.checkShowTyphoonCloud = cloud_chk;
			
			$(cloud_chk).click(this.onShowTyphoonCloudCheckClick.bind(this));
		},

		getShowTyphoonCloudCheckValue: function() {
			if (!this.checkShowTyphoonCloud) { return false; }
			return !!(this.checkShowTyphoonCloud.checked);
		},
		
		syncShowTyphoonCloudCheckValue: function() {
			if (!this.checkShowTyphoonCloud) { return; }
			
			var newVal = this.boundLayer.typhoonMarkerOptions.showCloud;
			var curVal = this.getShowTyphoonCloudCheckValue();

			if (newVal != curVal) {
				this.checkShowTyphoonCloud.checked = newVal;
			}
		},
		
		onShowTyphoonCloudCheckClick: function() {
			var lyr = this.boundLayer;
			lyr.setTyphoonMarkerOptionShowCloud(
				this.getShowTyphoonCloudCheckValue()
			);
		},

		buildMarkerColumnsSlider: function(containerElement) {
			var outerBox = $H('div', 'mm-marker-variation-slider-outer');

			var slider = $H('input');
			var disp = $H('div');
			disp.setAttribute('data-current-value', '-1');
			
			slider.type = 'range';
			slider.min = 1;
			slider.max = 50;
			
			// Table style - - - - - -
			outerBox.style.display = "table";
			disp.style.display     = "table-cell";
			slider.style.display   = "table-cell";

			disp.style.minWidth    = "2em";
			disp.style.fontSize    = "13px";
			disp.style.textAlign   = "center";
			disp.style.verticalAlign = "middle";
			// - - - - - - - - - - - -
			
			this.markerSliderElements.jSlider = $(slider);
			this.markerSliderElements.jDispBox = $(disp);
			
			outerBox.appendChild(disp);
			outerBox.appendChild(slider);
			containerElement.appendChild(outerBox);
			
			this.syncMarkerVariationCountDisp();
			this.markerSliderElements.jSlider.change( this.onMarkerVariationSliderChange.bind(this) );
		},
		
		syncMarkerVariationCountDisp: function(val) {
			var n = this.markerGenerator.options.nVariations;
			this.showMarkerVariationSliderPos(n);
			this.showMarkerVariationCount(n);
		},
		
		showMarkerVariationSliderPos: function(val) {
			var oldVal = this.markerSliderElements.jSlider.val();
			
			if (oldVal !== val) {
				this.markerSliderElements.jSlider[0].value = val;
			}
		},
		
		showMarkerVariationCount: function(val) {
			var disp = this.markerSliderElements.jDispBox[0];
			
			var oldVal = parseInt(disp.getAttribute('data-current-value'), 10);
			if (oldVal !== val) {
				this.markerSliderElements.jDispBox.text(val);
				disp.setAttribute('data-current-value', val);
			}
		},
		
		onMarkerVariationSliderChange: function() {
			var v = this.markerSliderElements.jSlider.val();
			this.markerGenerator.setNumOfVariation(v);
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
		
		buildOtherOptions: function(containerElement) {
			var pair_selonly = generateCheckboxInLabel('Show selected only', 'mm-markeroption-selonly', 'mm-markeroption-others');
			containerElement.appendChild(pair_selonly.label);
			this.checkShowSelectedOnly = pair_selonly.input;
			
			$(this.checkShowSelectedOnly).click(this.onShowSelectedOnlyCheckClick.bind(this));
		},
		
		onShowSelectedOnlyCheckClick: function() {
			this.sendSelOnly();
		},
		
		sendSelOnly: function() {
			var mo = this.boundLayer._markerOptions || null;
			var val = this.checkShowSelectedOnly.checked;
			if (mo) {
				mo.setShowSelectedOnly(val);
			}
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
			if (!this.attrBindComboElement) { return null; }
			return this.attrBindComboElement.value;
		},

		

		getSelectedVaryingType: function() {
			return pickIntRadioboxVal(this.jElement, 'MarkerVaryType');
		},

		onVaryingRadioChange: function(e) {
			var mo = this.boundLayer._markerOptions || null;
			if (mo) {
				mo.setVaryingType( this.getSelectedVaryingType() );
			}
			
			this.syncFromModel();
		},
		
		checkVaryingTypeRadio: function(newVal) {
			checkRadioboxByInt(this.jElement, 'MarkerVaryType', newVal);
		},
		
		onMarkerGeneratorConfigurationChange: function() {
			this.syncMarkerVariationCountDisp();
		},

		show: function() { this.expandablePanel.show(); },
		hide: function() { this.expandablePanel.hide(); },
		
		// Additional properties
		clearAdditionalPropertyList: function() {
			if (this.attrBindComboElement) {
				this.attrBindComboElement.innerHTML = '';
			}
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
			
			this.syncShowTyphoonCloudCheckValue();
		}
	};
	
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
	
	function pickIntRadioboxVal(originElement, name) {
		var rawVal = originElement.find('input[name=' +name+ ']:checked').val();
		if (rawVal !== null && rawVal !== undefined) {
			return parseInt(rawVal, 10);
		} else {
			return null;
		}
	}

	
	aGlobal.mobmap.MarkerConfigurationPanel = MarkerConfigurationPanel;
})(window);