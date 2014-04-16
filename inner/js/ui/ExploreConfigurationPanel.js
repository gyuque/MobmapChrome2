if (!window.mobmap) { window.mobmap={}; }
// * * * Explore Layer Configuration * * *

(function(aGlobal) {
	'use strict';

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

		this.selectedTargetId = -1;
		this.configurePanelContent();
		this.sendTrajectoryColor();
		this.sendTrajectoryAddComposition();
	}
	
	ExploreConfigurationPanel.prototype = {
		configurePanelContent: function() {
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
			
			// Composition option
			var pair = generateCheckboxInLabel("Add composition", "mm-trajectory-composition", "mm-trajectory-composition-label");
			fieldSet.appendChild(pair.label);
			this.chkTrajectoryAddComposition = pair.input;
			$(this.chkTrajectoryAddComposition).click(this.onTrajectoryAddCompositionChange.bind(this));
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