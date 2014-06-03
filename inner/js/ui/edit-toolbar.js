if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	var editbuttonsSpriteManager = null;
	
	function MobmapEditToolBar() {
		if (!editbuttonsSpriteManager) {
			editbuttonsSpriteManager = new mobmap.ToolButtonSpriteManager('images/editbuttons-combined.png');
		}

		this.ownerApp = null;

		this.element = document.createElement("table");
		this.tableRow = document.createElement("tr");
		this.element.appendChild(this.tableRow);
		
		this.groupColumnMap = {};
		this.addPresetColumns();
		this.selectionButtonNameMap = this.addSelectionButtons('sel');
		this.gateButtonNameMap = this.addGateButtons('gate');
		this.annButtonNameMap = this.addAnnotationButtons('ann');
		this.allButtonNameMap = this.makeAllButtonNameMap(this.selectionButtonNameMap, this.gateButtonNameMap);
	}
	
	MobmapEditToolBar.prototype = {
		setApp: function(a) {
			this.ownerApp = a;
		},

		addPresetColumns: function() {
			var list = [
			// Internal name | Label text
				["sel",       "Selection"],
				["gate",      "Gate"     ],
				["ann",       "Location Annotation"]
			];
			
			for (var i in list) {
				this.addGroupColumn(list[i][0], list[i][1]);
			}
		},
		
		addSelectionButtons: function(colName) {
			return this.addButtons(colName, [
					['sel_clear', 0],
					['sel_rect', 1]
				],
				this.observeSelectionButton.bind(this)
			);
		},

		addGateButtons: function(colName) {
			return this.addButtons(colName, [
					['gate_line', 5]
				],
				this.observeGateButton.bind(this)
			);
		},
		
		addAnnotationButtons: function(colName) {
			return this.addButtons(colName, [
					['ann_location', 11]
				],
				this.observeAnnotationButton.bind(this)
			);
		},
		
		addButtons: function(colName, buttonList, callback) {
			var generatedButtonMap = {};
			var targetCol = this.groupColumnMap[colName];
			var ls = buttonList;
			
			for (var i in ls) {
				var buttonData = ls[i];
				var bname = buttonData[0];
				var sp_index = buttonData[1];
				
				var btnObj = new mobmap.ToolButton(bname, 25, 18);
				btnObj.configureStyleSheet(editbuttonsSpriteManager, sp_index);
				generatedButtonMap[bname] = btnObj;
				
				targetCol.appendChild(btnObj.element);
				if (callback) {
					callback(btnObj);
				}
			}
			
			return generatedButtonMap;
		},
		
		makeAllButtonNameMap: function(src1, src2, src3) {
			var i;
			var m = {};
			if (src1) { for (i in src1) { m[i]=src1[i]; } }
			if (src2) { for (i in src2) { m[i]=src2[i]; } }
			if (src3) { for (i in src3) { m[i]=src3[i]; } }
			
			return m;
		},
		
		observeSelectionButton: function (btnObj) {
			btnObj.eventDispatcher().
			 click(this.onSelectionButtonClick.bind(this, btnObj));
			 // mousedown(this.onSelectionButtonMousedown.bind(this, btnObj));
		},
		
		observeGateButton: function(btnObj) {
			btnObj.eventDispatcher().
			 click(this.onGateButtonClick.bind(this, btnObj));
		},
		
		observeAnnotationButton: function(btnObj) {
			btnObj.eventDispatcher().
			 click(this.onAnnotationButtonClick.bind(this, btnObj));
		},
		
		addGroupColumn: function(name, initialText) {
			var tdHeadCol = document.createElement('th');
			var tdBodyCol = document.createElement('td');
			
			tdHeadCol.setAttribute('class', 'mm-editbarcol-caption');
			tdBodyCol.setAttribute('class', 'mm-editbarcol-body editbarcol-body-'+name);
			tdHeadCol.appendChild( document.createTextNode(initialText) );
			
			this.tableRow.appendChild(tdHeadCol);
			this.tableRow.appendChild(tdBodyCol);
			
			this.groupColumnMap[name] = tdBodyCol;
		},
		
		// Handling

		onSelectionButtonClick: function(btnObj, e) {
			switch(btnObj.name) {
			case 'sel_clear': this.onSelectionClearButtonClick(); break;
			case 'sel_rect':
				if (!this.deselectSelectionRectButton()) {
					this.onSelectionRectButtonDown();
				}
				break;
			}
		},

		onGateButtonClick: function(btnObj, e) {
			switch(btnObj.name) {
			case 'gate_line':
				if (!this.deselectLineGateButton()) {
					this.onGateButtonDown();
				}
				break;
			}
		},
		
		onAnnotationButtonClick: function(btnObj, e) {
			if (this.ownerApp) {
				var newAnnotation = this.ownerApp.putNewLocationAnnotation();
				this.ownerApp.revealAnnotationView();
				if (newAnnotation) {
					this.ownerApp.toggleAnnotatedLocationPin(newAnnotation);
				}
			}
		},
		
		// ------------------------------------------------
		onSelectionClearButtonClick: function() {
			if (this.ownerApp) {
				this.ownerApp.clearSelection();
			}
		},
		
		onSelectionRectButtonDown: function() {
			var c = this.getOwnerSelectionController();
			if (c) {
				c.startRectSelectionSession();
			}
		},
		
		onGateButtonDown: function() {
			var c = this.getOwnerSelectionController();
			if (c) {
				c.startLineGateSession();
			}
		},

		deselectButtonIfSelectionSessionActive: function(session_type) {
			var c = this.getOwnerSelectionController();
			if (c) { return c.cancelSessionIfType(session_type, true); }
			return false;
		},

		deselectSelectionRectButton: function() {
			return this.deselectButtonIfSelectionSessionActive(mobmap.SelectionSessionType.Rect);
		},

		deselectLineGateButton: function() {
			return this.deselectButtonIfSelectionSessionActive(mobmap.SelectionSessionType.LineGate);
		},

		getOwnerSelectionController: function() {
			if (!this.ownerApp) {return null;}
			return this.ownerApp.getSelectionController() || null;
		},
		
		// Responder methods for controller
		selWillDisposeCurrentSession: function(selController) {
		},
		
		selDidStartNewSession: function(selController) {
			var currentType = mobmap.SelectionSessionType.Unknown;
			var sess = selController.getCurrentSession();
			if (sess) {
				currentType = sess.getType();
			}

			this.updateSelectionButtonsState(currentType);
		},
		
		selDidDisposeSession: function(selController) {
			this.updateSelectionButtonsState(mobmap.SelectionSessionType.Unknown);
		},
		
		updateSelectionButtonsState: function(currentSessionType) {
			var sel_name = null;
			switch(currentSessionType) {
				case mobmap.SelectionSessionType.Rect:      sel_name = 'sel_rect';  break;
				case mobmap.SelectionSessionType.LineGate:  sel_name = 'gate_line'; break;
			}
			
			var setButtonNames = ['sel_rect', 'gate_line'];
			var len = setButtonNames.length;
			for (var i = 0;i < len;++i) {
				var targetName = setButtonNames[i];
				var btn = this.allButtonNameMap[targetName];
				btn.setSelectedStyle(targetName === sel_name);
			}
		}
	};
	
	aGlobal.mobmap.MobmapEditToolBar = MobmapEditToolBar;
})(window);