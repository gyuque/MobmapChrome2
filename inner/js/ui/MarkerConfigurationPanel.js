if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function MarkerConfigurationPanel(markerGenerator, layer) {
		this.boundLayer = layer;
		this.markerPresetList = this.generatePresetMarkerSets();
		
		this.markerGenerator = markerGenerator;
		this.markerGenerator.eventDispatcher().bind(
			mobmap.MarkerGenerator.CHANGE_EVENT,
			this.onMarkerGeneratorConfigurationChange.bind(this)
		);
		
		this.expandablePanel = new mobmap.ExpandablePanel();
		this.element = this.expandablePanel.element;
		this.jElement = $(this.element);
		this.jTailConfContainer = null;
		this.expandablePanel.setTitle("Marker");
		
		this.markerSliderElements = {
			jSlider: null,
			jDispBox: null
		};
		
		this.checkShowTyphoonCloud = null;
		this.checkShowSelectedOnly = null;
		this.checkTailFade = null;
		this.numinTailSegs = null;
		this.numinTailStep = null;
		this.numinTailWidth = null;
		this.varyingRadios = {};
		this.attrBindComboElement = null;
		this.checkEnableIndexMapping = null;
		this.jIndexMappingText = null;
		
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
			ec.appendChild( this.generatePresetMarkerMenu() );
			ec.appendChild( this.markerGenerator.resultCanvas );
			
			this.buildMarkerColumnsSlider(ec);
			this.buildMarkerVaryOptions(ec);
			this.buildMarkerAttrBindOptions(ec);
			this.buildMarkerTailOptions(ec);
			this.buildOtherOptions(ec);
		},
		
		generatePresetMarkerMenu: function() {
			var ul = $H('ul');
			var li = $H('li');
			
			li.innerHTML = 'Marker presets';

			// Add preset items
			var ulPresets = $H('ul');
			var plist = this.markerPresetList;
			li.appendChild(ulPresets);
			for (var i in plist) {
				ulPresets.appendChild( this.generatePresetMenuItem(plist[i], i) );
			}
			
			ul.appendChild(li);
			$(ul).kendoMenu({
				select: this.onPresetMenuSelect.bind(this)
			});
			return ul;
		},
		
		generatePresetMenuItem: function(presetData, index) {
			var li = $H('li', 'mm-marker-preset-menu-item');
						
			var pw = 160;
			var ph = 16;
			var previewCanvas = $H('canvas');
			previewCanvas.width = pw;
			previewCanvas.height = ph;
			this.renderMarkerPresetPreview(previewCanvas.getContext('2d'), index, 10);

			var caption = $H('h4');
			caption.appendChild( $T(presetData.name) );

			li.appendChild(caption);
			li.appendChild(previewCanvas);
			li.setAttribute('data-index', index);
			return li;
		},

		renderMarkerPresetPreview: function(g, presetIndex, count) {
			var n = 10;
			var presetData = this.markerPresetList[presetIndex];
			var baseColors = mobmap.MarkerGenerator.generateMarkerBaseColors(presetData, n);
			
			if (presetData.compositionType === kMarkerCompositionAdd) {
				g.fillStyle = "rgba(0,0,0,0.8)";
				g.fillRect(0, 0, 640, 480);
			}
			
			mobmap.MarkerGenerator.renderMarkerSequenceWithCompositeType(presetData.compositionType, g, n, 16, 16, baseColors);
		},
		
		onPresetMenuSelect: function(e) {
			var itemElement = e.item;
			var index = parseInt( itemElement.getAttribute('data-index') );

			this.applyMarkerSetPreset(index);
		},
		
		applyMarkerSetPreset: function(presetIndex) {
			var presetData = this.markerPresetList[presetIndex];
			
			var mo = this.markerGenerator.options;
			mo.gradientType = presetData.gradientType;
			mo.reverseOrder = presetData.reverseOrder;
			mo.color1 = presetData.color1;
			mo.color2 = presetData.color2;
			mo.compositionType = presetData.compositionType;
			
			this.markerGenerator.forceRebuild();
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
			// fs.appendChild( rl_day.label );

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

			this.buildCustomMarkerMappingForm(fs);
			containerElement.appendChild(fs);
		},
		
		buildCustomMarkerMappingForm: function(containerElement) {
			var tx = $H('textarea', 'mm-marker-mapping-text');
			var pair = generateCheckboxInLabel("Custom mapping", 'MarkerIndexMapping', "marker-index-mapping-check");
			
			containerElement.appendChild(pair.label);
			containerElement.appendChild(tx);

			this.checkEnableIndexMapping = pair.input;
			this.jIndexMappingText = $(tx).val('*:0').change(this.onIndexMappingTextChange.bind(this));
			
			$(pair.input).click(this.onIndexMappingCheckClick.bind(this));
		},
		
		buildMarkerTailOptions: function(containerElement) {
			var MO = mobmap.LayerMarkerOptions;
			var fs = makeFieldSetWithLegend('Tail');

			// Type selection ======================================================
			fs.appendChild(this.generateOptionHeading('Type'));
			this.addConfigurationRadioSet(fs, 'TailType', 'tailopt', [
				['None'             , MO.TAIL_NONE       ],
				['Show with marker' , MO.TAIL_WITH_MARKER],
				['Show tail only'   , MO.TAIL_ONLY       ]
			], this.onTailRadioChange.bind(this));

			// Configuration ======================================================
			var tailConfContainer = $H('div', 'mm-tail-conf-container');
			
			//  coloring
			tailConfContainer.appendChild(this.generateOptionHeading('Coloring'));
			this.buildMarkerTailColoringOptions(tailConfContainer);
			
			//  fade
			tailConfContainer.appendChild(this.generateOptionHeading('Other options'));
			var c_fade = generateCheckboxInLabel('Faded', 'MarkerTailFade', 'tailconf-fade');
			tailConfContainer.appendChild(c_fade.label);
			$(c_fade.input).click(this.onTailFadeCheckChange.bind(this));

			this.checkTailFade = c_fade.input;

			// Tail segments and step configuration
			var n_segs = generateInputElementInLabel('number', 'Segments ', 'tailconf-segs', 'tailconf-segs', true); 
			var n_step = generateInputElementInLabel('number', 'Interval(sec.) ', 'tailconf-step', 'tailconf-step', true);
			var n_width= generateInputElementInLabel('number', 'Line width ', 'tailconf-width', 'tailconf-width', true);
 
			n_segs.input.min = 1;
			n_segs.input.max = 100;
			n_step.input.min = 1;
			n_width.input.min = 1;

			tailConfContainer.appendChild(n_segs.label);
			tailConfContainer.appendChild(n_step.label);
			tailConfContainer.appendChild(n_width.label);

			this.numinTailSegs = n_segs.input;
			this.numinTailStep = n_step.input;
			this.numinTailWidth= n_width.input;

			var handler_segs = this.onTailSegsInputChange.bind(this);
			$(n_segs.input).change(handler_segs).blur(handler_segs);

			var handler_step = this.onTailStepInputChange.bind(this);
			$(n_step.input).change(handler_step).blur(handler_step);

			var handler_width = this.onTailWidthInputChange.bind(this);
			$(n_width.input).change(handler_width).blur(handler_width);

			containerElement.appendChild(fs);
			fs.appendChild(tailConfContainer);
			this.jTailConfContainer = $(tailConfContainer);
		},
		
		addConfigurationRadioSet: function(containerElement, name, labelClass, setData, handler) {
			for (var i in setData) {
				var radio_conf = setData[i];
				
				var labelText  = radio_conf[0];
				var val        = radio_conf[1];
				
				var input_pair = generateRadioInLabel(labelText, name, labelClass);
				input_pair.input.value = val;
				
				containerElement.appendChild(input_pair.label);
				$(input_pair.input).click(handler);
			}
		},
		
		generateOptionHeading: function(text) {
			var h = document.createElement('h5');
			h.setAttribute('class', 'mm-option-heading');
			h.appendChild( document.createTextNode(text) );
			return h;
		},
		
		buildMarkerTailColoringOptions: function(containerElement) {
			var MO = mobmap.LayerMarkerOptions;
			this.addConfigurationRadioSet(containerElement, 'TailColoring', 'tailclr', [
				['Marker color'     , MO.TC_MARKER_COLOR ],
				['Hue by direction' , MO.TC_DIRECTION    ]
			], this.onTailColoringRadioChange.bind(this));
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
		
		getSelectedTailType: function() {
			return pickIntRadioboxVal(this.jElement, 'TailType');
		},

		getSelectedTailColoringType: function() {
			return pickIntRadioboxVal(this.jElement, 'TailColoring');
		},


		getCurrentTailSegs: function() {
			return pickNumberInputValueWithMin(this.numinTailSegs, 1);
		},
		
		getCurrentTailStep: function() {
			return pickNumberInputValueWithMin(this.numinTailStep, 1);
		},
		
		getCurrentTailWidth: function() {
			return pickNumberInputValueWithMin(this.numinTailWidth, 1);
		},

		setTailSegsValue: function(n) {
			if (this.numinTailSegs && n !== this.getCurrentTailSegs()) {
				this.numinTailSegs.value = n;
			}
		},

		setTailStepValue: function(n) {
			if (this.numinTailStep && n !== this.getCurrentTailStep()) {
				this.numinTailStep.value = n;
			}
		},
		
		setTailWidthValue: function(w) {
			if (this.numinTailWidth && w !== this.getCurrentTailWidth()) {
				this.numinTailWidth.value = w;
			}
		},
		
		setTailColoringValue: function(c) {
			var selected = this.getSelectedTailColoringType();
			if (c !== selected) {
				this.checkTailColoringRadio(c);
			}
		},


		onVaryingRadioChange: function(e) {
			var mo = this.boundLayer._markerOptions || null;
			if (mo) {
				mo.setVaryingType( this.getSelectedVaryingType() );
			}
			
			this.syncFromModel();
		},
		
		onTailRadioChange: function(e) {
			var mo = this.boundLayer._markerOptions || null;
			if (mo) {
				mo.setTailType( this.getSelectedTailType() );
			}
			
			this.syncFromModel();
		},
		
		onTailColoringRadioChange: function(e) {
			var mo = this.boundLayer._markerOptions || null;
			if (mo) {
				mo.setTailColoring( this.getSelectedTailColoringType() );
			}
			
		},
		
		onTailSegsInputChange: function(e) {
			var mo = this.boundLayer._markerOptions || null;
			if (mo) {
				mo.setTailSegments( this.getCurrentTailSegs() );
			}
		},

		onTailStepInputChange: function(e) {
			var mo = this.boundLayer._markerOptions || null;
			if (mo) {
				mo.setTailInterval( this.getCurrentTailStep() );
			}
		},

		onTailWidthInputChange: function(e) {
			var mo = this.boundLayer._markerOptions || null;
			if (mo) {
				mo.setTailWidth( this.getCurrentTailWidth() );
			}
		},


		// Index mapping UI
		onIndexMappingCheckClick: function() {
			this.updateMappingTextBoxVisibility();
			this.sendIndexMappingConf();
		},
		
		onIndexMappingTextChange: function() {
			this.sendIndexMappingConf();
		},
		
		sendIndexMappingConf: function() {
			var mo = this.boundLayer._markerOptions || null;
			if (!mo) { return; }

			var enabled = this.getIndexMappingCheckValue();
			var text = this.jIndexMappingText.val();
			
			var changed1 = mo.setIndexMapEnabled(enabled, true);
			var changed2 = mo.updateIndexMap(text, true);
			
			if (changed1 || changed2) {
				mo.fire(true);
			}
		},
		
		getIndexMappingCheckValue: function() {
			var c = this.checkEnableIndexMapping;
			if (!c) { return false; }
			
			return c.checked;
		},
		
		updateMappingTextBoxVisibility: function() {
			this.toggleMappingTextBox( this.getIndexMappingCheckValue() );
		},
		
		toggleMappingTextBox: function(bShow) {
			var j = this.jIndexMappingText;
			if (j) {
				bShow ? j.show() : j.hide();
			}
		},


		checkVaryingTypeRadio: function(newVal) {
			checkRadioboxByInt(this.jElement, 'MarkerVaryType', newVal);
		},
		
		checlTailTypeRadio: function(newVal) {
			checkRadioboxByInt(this.jElement, 'TailType', newVal);
		},
		
		checkTailColoringRadio: function(newVal) {
			checkRadioboxByInt(this.jElement, 'TailColoring', newVal);
		},
		
		onTailFadeCheckChange: function() {
			var mo = this.boundLayer._markerOptions || null;
			if (mo) {
				mo.setTailFade( this.getTailFadeChecked() );
			}
		},
		
		checkFadeCheckbox: function(newVal) {
			if (this.getTailFadeChecked() !== newVal) {
				this.checkTailFade.checked = newVal;
			}
		},
		
		getTailFadeChecked: function() {
			if (!this.checkTailFade) {return false;}
			
			return !!(this.checkTailFade.checked);
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
				
				var ttype = mo.tailType;
				var selected_ttype = this.getSelectedTailType();
				if (ttype !== selected_ttype) {
					this.checlTailTypeRadio(ttype);
				}
				this.changeTailConfVisibility(ttype);
				
				this.checkFadeCheckbox(mo.tailFade);
				this.setTailSegsValue(mo.tailSegments);
				this.setTailStepValue(mo.tailInterval);
				this.setTailWidthValue(mo.tailWidth);
				this.setTailColoringValue(mo.tailColoring);

				this.updateMappingTextBoxVisibility();
			}
			
			this.syncShowTyphoonCloudCheckValue();
		},
		
		changeTailConfVisibility: function(tailType) {
			if (!this.jTailConfContainer) { return; }

			if (tailType === mobmap.LayerMarkerOptions.TAIL_NONE) {
				this.jTailConfContainer.removeClass('enabled');
			} else {
				this.jTailConfContainer.addClass('enabled');
			}
		},
		
		generatePresetMarkerSets: function() {
			var outList = [];
			
			var cWhite = new RGBColor(245,245,245);
			var cBlue  = new RGBColor(0,0,255);
			var cRed   = new RGBColor(255,0,0);
			
			outList.push( new MarkerSetPreset('Dot marker - hue gradient'         , kMarkerCompositionNormal, mobmap.MarkerGenerator.HueGradient, false) );
			outList.push( new MarkerSetPreset('Dot marker - reversed hue gradient', kMarkerCompositionNormal, mobmap.MarkerGenerator.HueGradient, true) );
			outList.push( new MarkerSetPreset('Dot marker - white to blue'        , kMarkerCompositionNormal, mobmap.MarkerGenerator.BlendGradient, false, cWhite, cBlue) );
			outList.push( new MarkerSetPreset('Dot marker - blue to red'          , kMarkerCompositionNormal, mobmap.MarkerGenerator.BlendGradient, false, cBlue, cRed) );

			outList.push( new MarkerSetPreset('Spot marker - hue gradient'         , kMarkerCompositionAdd, mobmap.MarkerGenerator.HueGradient, false) );
			outList.push( new MarkerSetPreset('Spot marker - reversed hue gradient', kMarkerCompositionAdd, mobmap.MarkerGenerator.HueGradient, true) );
			outList.push( new MarkerSetPreset('Spot marker - white to blue'        , kMarkerCompositionAdd, mobmap.MarkerGenerator.BlendGradient, false, cWhite, cBlue) );
			outList.push( new MarkerSetPreset('Spot marker - blue to red'          , kMarkerCompositionAdd, mobmap.MarkerGenerator.BlendGradient, false, cBlue, cRed) );
			
			return outList;
		}
	};
	
	function MarkerSetPreset(name, cm, gt, ro, c1, c2) {
		this.name = name;
		this.gradientType = gt;
		this.reverseOrder = ro;
		this.color1 = c1 || null;
		this.color2 = c2 || null;
		this.compositionType = cm;
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
	
	function pickIntRadioboxVal(originElement, name) {
		var rawVal = originElement.find('input[name=' +name+ ']:checked').val();
		if (rawVal !== null && rawVal !== undefined) {
			return parseInt(rawVal, 10);
		} else {
			return null;
		}
	}

	function pickNumberInputValueWithMin(el, min) {
		var val = el.value | 0;
		if (isNaN(val)) { val = 0; }
		if (val < min) { val = min; }
		return val;
	}
	
	aGlobal.mobmap.MarkerConfigurationPanel = MarkerConfigurationPanel;
})(window);