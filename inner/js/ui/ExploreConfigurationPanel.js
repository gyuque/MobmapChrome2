if (!window.mobmap) { window.mobmap={}; }
// * * * Explore Layer Configuration * * *

(function(aGlobal) {
	'use strict';

	var HIDE_SPEED_COLOR = true;

	function ExploreConfigurationPanel(layer) {
		this.boundLayer = layer;

		this.expandablePanel = new mobmap.ExpandablePanel();
		this.expandablePanel.setTitle("Settings");
		this.element = this.expandablePanel.element;
		this.jElement = $(this.element);
		this.selectElementTargets = null;
		this.jSelectElementTargets = null;
		this.jTrajectoryColorPickerElement = null;
		this.chkTrajectoryAddComposition = null;
		this.chkTrajectoryUseMarkerColor = null; 
		this.trajectoryColoringRadios = [];

		this.selectedTargetId = -1;
		this.configurePanelContent();
		this.sendTrajectoryColor();
		this.sendTrajectoryAddComposition();
		this.syncFromModelColoringType();
		this.coloringModeCheckOldValue = this.getTrajectoryColoringRadioValue();
	}
	
	ExploreConfigurationPanel.prototype = {
		configurePanelContent: function() {
			this.expandablePanel.closedContentElement.innerHTML = 'Open to configure.';

			var ec = this.expandablePanel.expandedContentElement;
			ec.innerHTML = '';
			this.buildExpandedPanelContent(ec);
			this.buildTrajectoryConfigPanel(ec);
			$(ec).find('input[name=explore-type]').click(this.onViewTypeRadioClick.bind(this));
		},
		
		buildExpandedPanelContent: function(containerElement) {
			var lab_sel = $H('label');
			lab_sel.appendChild( $T('Target:') );
			
			var sel = $H('select', 'mm-explore-target-select');
			lab_sel.appendChild(sel);
			containerElement.appendChild(lab_sel);

			this.selectElementTargets = sel;
			this.jSelectElementTargets = $(sel).change( this.onTargetSelectChange.bind(this) );
			this.addNoneTargetOption();
			
			this.addViewTypeRadio(containerElement);
		},
		
		buildTrajectoryConfigPanel: function(containerElement) {
			var fieldSet = makeFieldSetWithLegend("Trajectory options");
			containerElement.appendChild(fieldSet);
			//this.addTrajectoryColoringTypeRadio(fieldSet, "Color by speed", mobmap.MMExploreLayer.TrajectoryColoring.Speed);
			//this.addTrajectoryColoringTypeRadio(fieldSet, "Fixed color", mobmap.MMExploreLayer.TrajectoryColoring.Fixed);

			// Setup color picker
			var pickerElement = $H('input');
			fieldSet.appendChild(pickerElement);
			this.jTrajectoryColorPickerElement = $(pickerElement);
			this.jTrajectoryColorPickerElement.kendoColorPicker({
				opacity: true,
				change: this.onTrajectoryColorPickerChange.bind(this)
			});
			
			this.setTrajectoryPickerColor(64,128,255, 1);
			
			// Use marker color option
			this.addColoringTypeRadio(fieldSet);
			
			// Composition option
			var pair = generateCheckboxInLabel("Add composition", "mm-trajectory-composition", "mm-trajectory-composition-label");
			fieldSet.appendChild(pair.label);
			this.chkTrajectoryAddComposition = pair.input;
			$(this.chkTrajectoryAddComposition).click(this.onTrajectoryAddCompositionChange.bind(this));
		},
		
		addColoringTypeRadio: function(containerElement) {
			var pair_fix = generateRadioInLabel("Fixed color", "mm-trjcolormode-fixed", "mm-trajectory-markercolor-label");
			var pair_mk  = generateRadioInLabel("Marker color", "mm-trjcolormode-fixed", "mm-trajectory-markercolor-label");
			var pair_spd = generateRadioInLabel("Color by speed", "mm-trjcolormode-fixed", "mm-trajectory-markercolor-label");
			
			if (HIDE_SPEED_COLOR) {
				pair_spd.label.style.display = "none";
			}
			
			pair_fix.input.value = 'f';
			pair_mk.input.value  = 'm';
			pair_spd.input.value = 's';
			
			containerElement.appendChild(pair_fix.label);
			containerElement.appendChild(pair_mk.label);
			containerElement.appendChild(pair_spd.label);
			
			this.trajectoryColoringRadios.length = 0;
			this.trajectoryColoringRadios.push(pair_fix.input, pair_mk.input, pair_spd.input);
			$(this.trajectoryColoringRadios).click(this.onTrajectoryColoringRadioClick.bind(this));
		},
		
		onTrajectoryColoringRadioClick: function() {
			var val = this.getTrajectoryColoringRadioValue();
			if (val !== this.coloringModeCheckOldValue) {
				this.coloringModeCheckOldValue = val;
				this.sendTrajectoryColoringType(val);
			}
		},
		
		sendTrajectoryColoringType: function(newValue) {
			var lyr = this.boundLayer;
			switch(newValue) {
				case 'f':
				lyr.setTrajectoryUseMarkerColor( false ,true);
				lyr.setTrajectoryColoringMode( mobmap.MMExploreLayer.TrajectoryColoring.Fixed ,true);
				lyr.fireViewOptionChange();
				break;

				case 'm':
				lyr.setTrajectoryUseMarkerColor( true ,true);
				lyr.setTrajectoryColoringMode( mobmap.MMExploreLayer.TrajectoryColoring.Fixed ,true);
				lyr.fireViewOptionChange();
				break;

				case 's':
				lyr.setTrajectoryUseMarkerColor( false ,true);
				lyr.setTrajectoryColoringMode( mobmap.MMExploreLayer.TrajectoryColoring.Speed ,true);
				lyr.fireViewOptionChange();
				break;
			}
		},
		
		syncFromModelColoringType: function() {
			var lyr = this.boundLayer;
			
			var v = 'f';
			if (lyr.trajectoryUseMarkerColor) {
				v = 'm';
			} else if (lyr.trajectoryColoringMode === mobmap.MMExploreLayer.TrajectoryColoring.Speed) {
				v = 's';
			}
			
			this.setTrajectoryColoringRadioValue(v);
		},
		
		setTrajectoryColoringRadioValue: function(newValue) {
			var ls = this.trajectoryColoringRadios;
			for (var i in ls) {
				var chk = ls[i];
				if (chk.value === newValue) { chk.checked = true; }
			}
		},
		
		getTrajectoryColoringRadioValue: function () {
			var ls = this.trajectoryColoringRadios;
			for (var i in ls) {
				var chk = ls[i];
				if (chk.checked) { return chk.value; }
			}
			
			return null;
		},

		addTrajectoryColoringTypeRadio: function(containerElement, labelText, val) {
			var pair = generateRadioInLabel(labelText, 'trajectory-coloring-type', 'mm-trajectory-coloring-type-label');
			containerElement.appendChild(pair.label);
			pair.input.value = val;
			return pair;
		},
		
		onTrajectoryColorPickerChange: function() {
			this.sendTrajectoryColor();
		},

		getTrajectoryColorPickerObject: function() {
			return this.jTrajectoryColorPickerElement.data("kendoColorPicker");
		},
		
		setTrajectoryPickerColor: function(r, g, b, a) {
			var kc = kendo.Color.fromBytes(r,g,b,a);
			this.getTrajectoryColorPickerObject().color( kc );
		},
		
		sendTrajectoryColor: function() {
			var val = this.getTrajectoryColorPickerObject().value();
			this.boundLayer.setTrajectoryDefaultColor(val);
		},
		
		onTrajectoryAddCompositionChange: function() {
			this.sendTrajectoryAddComposition();
		},

		sendTrajectoryAddComposition: function() {
			this.boundLayer.setTrajectoryAddComposition( this.chkTrajectoryAddComposition.checked );
		},

		addViewTypeRadio: function(containerElement) {
			var outer = $H('div');
			
			var xt_trj = generateRadioInLabel('Trajectory View', 'explore-type', 'mm-explore-type-radio-label');
			var xt_mch = generateRadioInLabel('Marching View', 'explore-type', 'mm-explore-type-radio-label');
			
			outer.appendChild(xt_trj.label);
			outer.appendChild(xt_mch.label);
			
			xt_trj.input.checked = true;
			xt_trj.input.value = mobmap.ExploreMapType.ViewType.Trajectory;
			xt_mch.input.value = mobmap.ExploreMapType.ViewType.Marching;
			
			containerElement.appendChild(outer);
			return outer;
		},
		
		onViewTypeRadioClick: function() {
			this.sendViewTypeValue();
		},
		
		sendViewTypeValue: function() {
			var val = this.pickViewTypeRadioValue();
			this.boundLayer.setOverlayViewType(val);
		},
		
		pickViewTypeRadioValue: function() {
			return parseInt( $('input[name=explore-type]:checked').val() , 10);
		},

		onTargetSelectChange: function() {
			var val = parseInt(this.jSelectElementTargets.val(), 10);
			this.sendViewTypeValue();
			this.boundLayer.setTargetLayerId(val);
		},

		setTargetList: function(targetLayerList) {
			this.clearTargetSelectItems();
			this.addNoneTargetOption();
			
			var len = targetLayerList.length;
			for (var i = 0;i < len;++i) {
				var targetInfo = targetLayerList[i];
		
				var opt = $H('option');
				opt.appendChild( $T(targetInfo.desc) );
				opt.value = targetInfo.id;
				this.selectElementTargets.appendChild(opt);
			}
			
			this.onTargetSelectChange();
		},
		
		addNoneTargetOption: function() {
			var opt = $H('option');
			opt.appendChild( $T('(None)') );
			opt.value = -1;
			
			this.selectElementTargets.appendChild(opt);
		},
		
		clearTargetSelectItems: function() {
			this.selectElementTargets.innerHTML = '';
		},
		
		show: function() { this.expandablePanel.show(); },
		hide: function() { this.expandablePanel.hide(); }
	};
	
	aGlobal.mobmap.ExploreConfigurationPanel = ExploreConfigurationPanel;
})(window);