if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function MarkerConnectionSubPanel(layer) {
		this.boundLayer = layer;
		this.attrBindComboElement = null;
		this.enabledCheckbox = null;
		this.lineGradientEditor = null;
		this.gradientEventElement = null;
		this.lineGradient = null;
		
		this.initGradientObjects();
		this.expandablePanel = new mobmap.ExpandablePanel();
		this.element = this.expandablePanel.element;
		this.jElement = $(this.element);
		this.expandablePanel.setTitle("Connection");
		
		this.configurePanelContent();
		this.syncFromModel();

		this.updateClosedPanelContent();
	}
	
	MarkerConnectionSubPanel.prototype = {
		configurePanelContent: function() {
			var ec = this.expandablePanel.expandedContentElement;
			ec.innerHTML = '';

			var main_toggle = generateCheckboxInLabel("Show connection", 'MarkerConnectionEnabled', "marker-connection-check");
			ec.appendChild(main_toggle.label);
			this.enabledCheckbox = main_toggle.input;
			this.attrBindComboElement = mobmap.MarkerConfigurationPanel.makeComboWithLabel(ec, 'Attribute ', 'mm-bind-attr-combo');

			// observe events
			$(this.enabledCheckbox).click(this.onMainCheckboxClick.bind(this));
			$(this.attrBindComboElement).change(this.onAttributeComboChange.bind(this));

			this.buildGradientEditor(ec);
		},
		
		buildGradientEditor: function(containerElement) {
			this.lineGradientEditor = new mobmap.GradientEditor( this.lineGradient, null, 1, true);
			containerElement.appendChild(this.lineGradientEditor.element);
		},
		
		initGradientObjects: function() {
			this.gradientEventElement = $(createEventDummyElement());
			
			this.lineGradient = new mobmap.MMMeshLayer.ColorRule( this.gradientEventElement );
			this.lineGradient.addStop( new MMGradientStop(0,  255, 90, 255, 1) );
			this.lineGradient.addStop( new MMGradientStop(1,  255, 0,   90, 1) );
			
			this.gradientEventElement.bind(mobmap.MMMeshLayer.COLOR_RULE_CHANGE, this.onLineColoringRuleChange.bind(this));
		},

		updateClosedPanelContent: function() {
			var el = this.expandablePanel.closedContentElement;
			var enabled = false;
			
			var mo = this.getBoundMarkerOptions();
			if (mo) {
				enabled = !!( mo.connectionAttributeName );
			}

			if (enabled) {
				el.innerHTML = 'Using attribute: ';
				el.appendChild( document.createTextNode( mo.connectionAttributeName ) );
			} else {
				el.innerHTML = '(None)';
			}
		},

		clearAdditionalPropertyList: function() {
			if (this.attrBindComboElement) {
				this.attrBindComboElement.innerHTML = '';
			}
		},
		
		addAdditionalPropertyName: function(attrName) {
			mobmap.MarkerConfigurationPanel.addAttributeComboboxOption(this.attrBindComboElement, attrName);
		},

		sendToModel: function() {
			var enabled = this.getMainCheckboxValue();
			var attrName = enabled ? this.getAttributeComboValue() : null;
			
			var mo = this.getBoundMarkerOptions();
			if (mo) {
				mo.bindConnectionAttributeName(attrName);
			}
			
			this.updateClosedPanelContent();
		},
		
		getBoundMarkerOptions: function() {
			if (!this.boundLayer) { return null; }
			return this.boundLayer._markerOptions || null;
		},

		show: function() { this.expandablePanel.show(); },
		hide: function() { this.expandablePanel.hide(); },
		
		getMainCheckboxValue: function() {
			return !!(this.enabledCheckbox.checked);
		},

		setMainCheckboxValue: function(newValue) {
			if (this.getMainCheckboxValue() !== newValue) {
				this.enabledCheckbox.checked = newValue;
			}
		},

		getAttributeComboValue: function() {
			return this.attrBindComboElement.value;
		},
		
		setAttributeComboValue: function(newValue) {
			if (this.getAttributeComboValue() !== newValue) {
				this.attrBindComboElement.value = newValue;
			}
		},
		
		onMainCheckboxClick: function() {
			this.sendToModel();
		},
		
		onAttributeComboChange: function() {
			this.sendToModel();
		},
		
		syncFromModel: function() {
			var mo = this.getBoundMarkerOptions();
			if (mo) {
				var enabled = !!(mo.connectionAttributeName);
				this.setMainCheckboxValue(enabled);
				
				if (enabled) {
					this.setAttributeComboValue(mo.connectionAttributeName);
				}
				
				this.lineGradient.getAt(0).copyColorFrom( mo.gstopConnectionStart );
				this.lineGradient.getAt(1).copyColorFrom( mo.gstopConnectionEnd );
				this.lineGradientEditor.syncFromModel();
				this.lineGradientEditor.redraw();
			}
		},
		
		onLineColoringRuleChange: function() {
			this.lineGradientEditor.syncFromModel();

			var s0 = this.lineGradient.getAt(0);
			var s1 = this.lineGradient.getAt(1);
			var mo = this.getBoundMarkerOptions();
			if (!s0 || !s1 || !mo) {return;}

			mo.setConnectionLineGradient(s0, s1);
		}
	};
	
	aGlobal.mobmap.MarkerConnectionSubPanel = MarkerConnectionSubPanel;
})(window);