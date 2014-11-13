if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	var sharedNextMarkerPanelId = 1;
	
	function MarkerConfigurationPanel(markerGenerator, layer) {
		this.panelId = sharedNextMarkerPanelId++;
		this.boundLayer = layer;
		this.markerPresetList = this.generatePresetMarkerSets();
		
		this.markerGenerator = markerGenerator;
		this.markerGenerator.eventDispatcher().bind(
			mobmap.MarkerGenerator.CHANGE_EVENT,
			this.onMarkerGeneratorConfigurationChange.bind(this)
		);
		
		this.markerGradient = null;
		this.markerGradientEditor = null;
		this.gradientEventElement = null;
		this.setupGradientObjects();

		this.expandablePanel = new mobmap.ExpandablePanel();
		this.element = this.expandablePanel.element;
		this.jElement = $(this.element);
		this.jTailConfContainer = null;
		this.jLabelConfContainer = null;
		this.jGradientConfContainer = null;
		this.expandablePanel.setTitle("Marker");
		
		this.markerSliderElements = {
			jSlider: null,
			jDispBox: null
		};
		
		this.checkShowTyphoonCloud = null;
		this.checkShowSelectedOnly = null;
		this.checkShowLabel = null;
		this.checkInvertLabel = null;
		this.checkTailFade = null;
		this.numinTailSegs = null;
		this.numinTailStep = null;
		this.numinTailWidth = null;
		this.numinLabelLimit = null;
		this.varyingRadios = {};
		this.attrBindComboElement = null;
		this.attrLabelComboElement = null;
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
			this.buildMarkerGradientOptions(ec);
			this.buildMarkerVaryOptions(ec);
			this.buildMarkerAttrBindOptions(ec);
			this.buildMarkerTailOptions(ec);
			this.buildMarkerLabelOptions(ec);
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
			
			var nPreviews = (presetData.chipWidth > 20) ? 5 : 10;
			
			var pw = presetData.chipWidth * nPreviews;
			var ph = presetData.chipHeight;
			var previewCanvas = $H('canvas');
			previewCanvas.width = pw;
			previewCanvas.height = ph;
			this.renderMarkerPresetPreview(previewCanvas.getContext('2d'), index, nPreviews);

			var caption = $H('h4');
			caption.appendChild( $T(presetData.name) );

			li.appendChild(caption);
			li.appendChild(previewCanvas);
			li.setAttribute('data-index', index);
			return li;
		},

		renderMarkerPresetPreview: function(g, presetIndex, count) {
			var n = count;
			var presetData = this.markerPresetList[presetIndex];
			var baseColors = mobmap.MarkerGenerator.generateMarkerBaseColors(presetData, n);
			
			if (presetData.compositionType === kMarkerCompositionAdd) {
				g.fillStyle = "rgba(0,0,0,0.8)";
				g.fillRect(0, 0, 640, 480);
			}
			
			mobmap.MarkerGenerator.renderMarkerSequenceWithCompositeType(presetData.compositionType, g, n, presetData.chipWidth, presetData.chipHeight, baseColors, presetData.useScaling);
		},
		
		onPresetMenuSelect: function(e) {
			var itemElement = e.item;
			var index = parseInt( itemElement.getAttribute('data-index') );

			var newPreset = this.applyMarkerSetPreset(index);
			this.toggleGradientConf(newPreset);
		},
		
		applyMarkerSetPreset: function(presetIndex) {
			var presetData = this.markerPresetList[presetIndex];
			if (!presetData) { return null; }
			
			var mo = this.markerGenerator.options;
			mo.gradientType = presetData.gradientType;
			mo.reverseOrder = presetData.reverseOrder;
			mo.color1 = presetData.color1;
			mo.color2 = presetData.color2;
			mo.compositionType = presetData.compositionType;
			mo.includeBW = presetData.includeBW;

			mo.useScaling = presetData.useScaling;
			mo.enableCrop = !presetData.useScaling;
			
			var changed_size = (mo.chipWidth != presetData.chipWidth) || (mo.chipHeight != presetData.chipHeight);
			mo.chipWidth = presetData.chipWidth;
			mo.chipHeight = presetData.chipHeight;
			
			if (changed_size) {
				this.markerGenerator.configureCanvas();
			}
			this.markerGenerator.forceRebuild();
			
			return presetData;
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
		
		nameWithPanelId: function(name) {
			return name + '-' + this.panelId;
		},
		
		buildMarkerVaryOptions: function(containerElement) {
			var fs = makeFieldSetWithLegend('Varying');
			
			var radio_name = this.nameWithPanelId('MarkerVaryType');
			var rl_none = generateRadioInLabel('None',         radio_name, 'varytypeopt');
			var rl_attr = generateRadioInLabel('By attribute', radio_name, 'varytypeopt');
			var rl_day  = generateRadioInLabel('By day',       radio_name, 'varytypeopt');

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

		buildMarkerGradientOptions: function(containerElement) {
			var optionContainer = makeFieldSetWithLegend('Gradient');
			this.markerGradientEditor = new mobmap.GradientEditor( this.markerGradient, null, 1, true, true);
			optionContainer.appendChild(this.markerGradientEditor.element);
			containerElement.appendChild(optionContainer);

			this.jGradientConfContainer = $(optionContainer);
		},
		
		toggleGradientConf: function(markerPreset)  {
			if (!this.jGradientConfContainer || !markerPreset) { return; }
			
			var visible = false;
			if (markerPreset) {
				if (markerPreset.gradientType === mobmap.MarkerGenerator.BlendGradient) {
					visible = true;
				}
			}
			
			if (visible) {
				this.jGradientConfContainer.show();
			} else {
				this.jGradientConfContainer.hide();
			}
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
			fs.appendChild(mobmap.LayersView.generateOptionHeading('Type'));
			this.addConfigurationRadioSet(fs, this.nameWithPanelId('TailType'), 'tailopt', [
				['None'             , MO.TAIL_NONE       ],
				['Show with marker' , MO.TAIL_WITH_MARKER],
				['Show tail only'   , MO.TAIL_ONLY       ]
			], this.onTailRadioChange.bind(this));

			// Configuration ======================================================
			var tailConfContainer = $H('div', 'mm-tail-conf-container');
			
			//  coloring
			tailConfContainer.appendChild(mobmap.LayersView.generateOptionHeading('Coloring'));
			this.buildMarkerTailColoringOptions(tailConfContainer);
			
			//  fade
			tailConfContainer.appendChild(mobmap.LayersView.generateOptionHeading('Other options'));
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
		
		buildMarkerLabelOptions: function(containerElement) {
			var MO = mobmap.LayerMarkerOptions;
			var fs = makeFieldSetWithLegend('Label');
			this.jLabelConfContainer = $(fs);
// - - - - - - - - - - - - - - - - - - - -
			var pair = generateCheckboxInLabel("Show label", 'MarkerLabelCheck', "marker-label-check");
			$(pair.input).click( this.onLabelCheckChange.bind(this) );
			fs.appendChild(pair.label);
			this.checkShowLabel = pair.input;

			this.attrLabelComboElement = makeComboWithLabel(fs, 'Attribute', 'mm-label-attr-combo');
			$(this.attrLabelComboElement).change( this.onAttrLabelSelChange.bind(this) );
			
			var handler = this.onAttrLabelLimitInputChange.bind(this);
			var lim_pair = generateInputElementInLabel('number', 'Limit', 'label-limit-num-input', 'label-limit-num-input', true);
			this.numinLabelLimit = lim_pair.input;
			fs.appendChild(lim_pair.label);
			$(lim_pair.input).
			 attr('min', 1).
			 attr('max', 9999).
			 attr('value', 500).
			 keyup(handler).blur(handler);

			var pair_iv = generateCheckboxInLabel("Invert color", 'MarkerLabelInvertCheck', "marker-label-invert-check");
			$(pair_iv.input).click( this.onLabelInvertCheckChange.bind(this) );
			fs.appendChild(pair_iv.label);
			this.checkInvertLabel = pair_iv.input;

			containerElement.appendChild(fs);
		},
		
		changeLabelConfContainerClass: function() {
			var b = this.getShowLabelCheckValue();
			if (this.jLabelConfContainer) {
				if (b) {
					this.jLabelConfContainer.addClass('mm-label-conf-enabled');
				} else {
					this.jLabelConfContainer.removeClass('mm-label-conf-enabled');
				}
			}
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

		buildMarkerTailColoringOptions: function(containerElement) {
			var MO = mobmap.LayerMarkerOptions;
			this.addConfigurationRadioSet(containerElement, this.nameWithPanelId('TailColoring'), 'tailclr', [
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

		onAttrLabelSelChange: function() {
			this.sendAttrToShowLabel();
		},
		
		onAttrLabelLimitInputChange: function() {
			this.sendLabelLimit();
			this.syncFromModel();
		},
		
		sendAttrNameToBind: function() {
			var mo = this.boundLayer._markerOptions || null;
			if (mo) {
				var n = this.getAttrNameToBind();
				mo.bindAttributeName(n);
			}
		},
		
		sendAttrToShowLabel: function() {
			var mo = this.boundLayer._markerOptions || null;
			if (mo) {
				var n = null;
				if (this.getShowLabelCheckValue()) {
					n = this.getAttrNameToShowLabel();
				}

				mo.bindLabelAttribute(n);
			}
		},
		
		sendLabelInverted: function() {
			var mo = this.boundLayer._markerOptions || null;
			if (mo) {
				mo.setLabelInverted( this.getInvertLavelCheckValue() );
			}
		},
		
		sendLabelLimit: function() {
			var mo = this.boundLayer._markerOptions || null;
			if (mo) {
				mo.setLabelDisplayLimit( this.getLabelLimitValue() );
			}
		},
		
		getAttrNameToBind: function() {
			return this.getComboboxValue(this.attrBindComboElement);
		},

		getAttrNameToShowLabel: function() {
			return this.getComboboxValue(this.attrLabelComboElement);
		},
		
		getComboboxValue: function(target) {
			if (!target) { return null; }
			return target.value;
		},


		getShowLabelCheckValue: function() {
			return this.checkShowLabel ? this.checkShowLabel.checked : false;
		},
		
		getInvertLavelCheckValue: function() {
			return this.checkInvertLabel ? this.checkInvertLabel.checked : false;
		},

		getLabelLimitValue: function() {
			return this.numinLabelLimit ? (this.numinLabelLimit.value | 0) : 500;
		},

		getSelectedVaryingType: function() {
			return pickIntRadioboxVal(this.jElement, this.nameWithPanelId('MarkerVaryType'));
		},
		
		getSelectedTailType: function() {
			return pickIntRadioboxVal(this.jElement, this.nameWithPanelId('TailType'));
		},

		getSelectedTailColoringType: function() {
			return pickIntRadioboxVal(this.jElement, this.nameWithPanelId('TailColoring'));
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

		onLabelCheckChange: function(e) {
			this.changeLabelConfContainerClass();
			this.sendAttrToShowLabel();
		},
		
		onLabelInvertCheckChange: function(e) {
			this.sendLabelInverted();
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
			checkRadioboxByInt(this.jElement, this.nameWithPanelId('MarkerVaryType'), newVal);
		},
		
		checlTailTypeRadio: function(newVal) {
			checkRadioboxByInt(this.jElement, this.nameWithPanelId('TailType'), newVal);
		},
		
		checkTailColoringRadio: function(newVal) {
			checkRadioboxByInt(this.jElement, this.nameWithPanelId('TailColoring'), newVal);
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
			
			if (this.attrLabelComboElement) {
				this.attrLabelComboElement.innerHTML = '';
			}
		},
		
		addPresetProperties: function() {
			addAttributeComboboxOption(this.attrLabelComboElement, '_id');
		},
		
		addAdditionalPropertyName: function(attrName) {
			addAttributeComboboxOption(this.attrBindComboElement, attrName);
			addAttributeComboboxOption(this.attrLabelComboElement, attrName);
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
				this.syncShowLabelLimit(mo);
				this.syncShowLabelCheck(mo);
				this.syncMarkerGradient(this.markerGenerator.options);
			}
			
			this.syncShowTyphoonCloudCheckValue();
		},
		
		syncShowLabelCheck: function(markerOptions) {
			var b = false;
			if (markerOptions) {
				b = !!(markerOptions.labelAttributeName);
			}
			
			if (this.checkShowLabel) {
				this.checkShowLabel.checked = b;
			}
		},
		
		syncShowLabelLimit: function(markerOptions) {
			if (markerOptions && this.numinLabelLimit) {
				var n = markerOptions.labelDisplayLimit;
				var current = this.getLabelLimitValue();
				if (current !== n) {
					this.numinLabelLimit.value = markerOptions.labelDisplayLimit;
				}
			}
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
			var cLBlue = new RGBColor(12,54,255);
			
			var BW = kMarkerPresetIncludeBW;
			var SC = kMarkerPresetUseScaling;
			
			outList.push( new MarkerSetPreset('Dot marker - hue gradient'         , 0 , kMarkerCompositionNormal, mobmap.MarkerGenerator.HueGradient, false) );
			outList.push( new MarkerSetPreset('Dot marker - BW + hue gradient'    , BW, kMarkerCompositionNormal, mobmap.MarkerGenerator.HueGradient, false) );
			outList.push( new MarkerSetPreset('Dot marker - reversed hue gradient', 0 , kMarkerCompositionNormal, mobmap.MarkerGenerator.HueGradient, true) );
			//outList.push( new MarkerSetPreset('Dot marker - white to blue'        , 0 , kMarkerCompositionNormal, mobmap.MarkerGenerator.BlendGradient, false, cWhite, cBlue) );
			outList.push( new MarkerSetPreset('Dot marker - custom gradient'      , 0 , kMarkerCompositionNormal, mobmap.MarkerGenerator.BlendGradient, false, cBlue, cRed) );

			outList.push( new MarkerSetPreset('Scaling marker'                    , SC, kMarkerCompositionNormal, mobmap.MarkerGenerator.BlendGradient, false, cBlue, cRed) );
			
			var large_m = new MarkerSetPreset('Large scaling marker'              , SC, kMarkerCompositionNormal, mobmap.MarkerGenerator.BlendGradient, false, cBlue, cRed);
			large_m.setChipSize(32, 32);
			outList.push( large_m );

			outList.push( new MarkerSetPreset('Spot marker - hue gradient'         , 0 , kMarkerCompositionAdd, mobmap.MarkerGenerator.HueGradient, false) );
			outList.push( new MarkerSetPreset('Spot marker - BW + hue gradient'    , BW, kMarkerCompositionAdd, mobmap.MarkerGenerator.HueGradient, false) );
			outList.push( new MarkerSetPreset('Spot marker - reversed hue gradient', 0 , kMarkerCompositionAdd, mobmap.MarkerGenerator.HueGradient, true) );
			//outList.push( new MarkerSetPreset('Spot marker - white to blue'        , 0 , kMarkerCompositionAdd, mobmap.MarkerGenerator.BlendGradient, false, cWhite, cBlue) );
			outList.push( new MarkerSetPreset('Spot marker - custom gradient'      , 0 , kMarkerCompositionAdd, mobmap.MarkerGenerator.BlendGradient, false, cBlue, cRed) );
			
			return outList;
		},
		
		setupGradientObjects: function() {
			this.gradientEventElement = $(createEventDummyElement());
			this.markerGradient = new mobmap.MMMeshLayer.ColorRule( this.gradientEventElement );
			this.markerGradient.addStop( new MMGradientStop(0,  255, 90, 255, 1) );
			this.markerGradient.addStop( new MMGradientStop(1,  255, 0,   90, 1) );
			
			this.gradientEventElement.bind(mobmap.MMMeshLayer.COLOR_RULE_CHANGE, this.onMarkerColoringRuleChange.bind(this));
		},
		
		onMarkerColoringRuleChange: function() {
			this.markerGradientEditor.syncFromModel();

			var s0 = this.markerGradient.getAt(0);
			var s1 = this.markerGradient.getAt(1);
			if (!s0 || !s1) {return;}
			
			var mg = this.markerGenerator;
			mg.setBlendStartColor(s0.r, s0.g, s0.b);
			mg.setBlendEndColor(s1.r, s1.g, s1.b);
			mg.forceRebuild();
		},
		
		syncMarkerGradient: function(markerGeneratorOptions) {
			var s0 = this.markerGradient.getAt(0);
			var s1 = this.markerGradient.getAt(1);
			if (!s0 || !s1) {return;}
			
			s0.r = markerGeneratorOptions.blendStart.r;
			s0.g = markerGeneratorOptions.blendStart.g;
			s0.b = markerGeneratorOptions.blendStart.b;
			s1.r = markerGeneratorOptions.blendEnd.r;
			s1.g = markerGeneratorOptions.blendEnd.g;
			s1.b = markerGeneratorOptions.blendEnd.b;

			if (this.markerGradientEditor) {
				this.markerGradientEditor.syncFromModel();
				this.markerGradientEditor.redraw();
			}
			
			this.toggleGradientConf(markerGeneratorOptions);
		}
	};
	
	function MarkerSetPreset(name, flags, cm, gt, ro, c1, c2) {
		this.name = name;
		this.gradientType = gt;
		this.reverseOrder = ro;
		this.color1 = c1 || null;
		this.color2 = c2 || null;
		this.compositionType = cm;
		this.includeBW = false;
		this.useScaling = false;
		
		this.chipWidth = 16;
		this.chipHeight = 16;

		this.blendStart = c1 || null;
		this.blendEnd   = c2 || null;
		
		if (flags === 0) {
			// No flags
		} else if (flags === kMarkerPresetIncludeBW) {
			this.includeBW = true;
		} else if (flags === kMarkerPresetUseScaling) {
			this.useScaling = true;
		} else {
			throw "Bad flags";
		}
	}
	
	MarkerSetPreset.prototype.setChipSize = function(w, h) {
		this.chipWidth = w;
		this.chipHeight = h;
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

	function pickNumberInputValueWithMin(el, min) {
		var val = el.value | 0;
		if (isNaN(val)) { val = 0; }
		if (val < min) { val = min; }
		return val;
	}
	
	function addAttributeComboboxOption(target, attrName) {
		if (!target) {
			return false;
		}
		
		var opt = $H('option');
		opt.appendChild( $T(attrName) );
		opt.value = attrName;
		
		target.appendChild(opt);
		return true;
	}
	
	MarkerConfigurationPanel.makeComboWithLabel = makeComboWithLabel;
	MarkerConfigurationPanel.addAttributeComboboxOption = addAttributeComboboxOption;
	aGlobal.mobmap.MarkerConfigurationPanel = MarkerConfigurationPanel;
})(window);