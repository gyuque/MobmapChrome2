if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	var kExportToolEnabled = true;
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
		this.selectionBoolButtonNameMap = this.addSelectionBoolButtons('sel');
		this.gateButtonNameMap = this.addGateButtons('gate');
		this.annButtonNameMap = this.addAnnotationButtons('ann');
		this.movButtonNameMap = this.addMovieButtons('mov');
		this.clockButtonNameMap = this.addClockButtons('clk');
		this.resetButtonNameMap = this.addResetButtons('reset');
		if (kExportToolEnabled) {
			this.exportButtonNameMap = this.addExportButtons('export');
		} else {
			this.exportButtonNameMap = null;
		}
		this.allButtonNameMap = this.makeAllButtonNameMap(this.selectionButtonNameMap, this.gateButtonNameMap);
	}
	
	MobmapEditToolBar.prototype = {
		setApp: function(a) {
			this.ownerApp = a;
			if (a) {
				a.eventDispatcher().
				 bind(mobmap.Mobmap2App.CLOCK_VISIBILITY_CHANGE_EVENT, this.onClockVisibilityChange.bind(this)).
				 bind(mobmap.Mobmap2App.SELECTION_BOOL_CHANGE_EVENT,   this.onSelectionBoolOpChange.bind(this));
				
				this.syncWithAppState(a);
			}
		},

		addPresetColumns: function() {
			var list = [
			// Internal name | Label text
				["sel",       "Selection"],
				["gate",      "Gate"     ],
				["ann",       "Location Annotation"],
				["mov",       "Movie"],
				["clk",       "Clock"],
				["export",    "Export"],
				["reset",     "Reset",             true]
			];
			
			for (var i in list) {
				if (!kExportToolEnabled && list[i][0] === 'export') {continue;}
				
				this.addGroupColumn(list[i][0], list[i][1], !!list[i][2]);
			}
		},
		
		addSelectionButtons: function(colName) {
			return this.addButtons(colName, [
					['sel_clear', 0 , 'Clear selection'],
					['sel_rect' , 1 , 'Rectangle selection'],
					['sel_poly' , 10, 'Select a polygon']
				],
				this.observeSelectionButton.bind(this)
			);
		},
		
		addSelectionBoolButtons: function(colName) {
			return this.addButtons(colName, [
					['selb_new', 15, 'NEW'],
					['selb_or' , 16, 'OR'],
					['selb_and', 17, 'AND']
				],
				this.observeSelectionBoolButton.bind(this),
				'mm-sel-bool-button'
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

		addMovieButtons: function(colName) {
			return this.addButtons(colName, [
					['generate_movie', 12]
				],
				this.observeMovieButton.bind(this)
			);
		},

		addResetButtons: function(colName) {
			return this.addButtons(colName, [
					['reset_app', 13]
				],
				this.observeResetButton.bind(this)
			);
		},
		
		addExportButtons: function(colName) {
			return this.addButtons(colName, [
					['export_csv', 8]
				],
				this.observeExportButton.bind(this)
			);
		},
		
		addClockButtons: function(colName) {
			return this.addButtons(colName, [
					['show_clock', 14]
				],
				this.observeClockButton.bind(this)
			);
		},
			
		addButtons: function(colName, buttonList, callback, additinalClassName) {
			var generatedButtonMap = {};
			var targetCol = this.groupColumnMap[colName];
			var ls = buttonList;
			
			for (var i in ls) {
				var buttonData = ls[i];
				var bname    = buttonData[0];
				var sp_index = buttonData[1];
				var title    = buttonData[2] || null;
				
				var btnObj = new mobmap.ToolButton(bname, 25, 18);
				if (additinalClassName) {
					btnObj.addClass(additinalClassName);
				}
				
				if (title) {
					btnObj.setTitle(title);
				}

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
		
		observeSelectionBoolButton: function (btnObj) {
			btnObj.eventDispatcher().
			 click(this.onSelectionBoolButtonClick.bind(this, btnObj));
		},
		
		observeGateButton: function(btnObj) {
			btnObj.eventDispatcher().
			 click(this.onGateButtonClick.bind(this, btnObj));
		},
		
		observeAnnotationButton: function(btnObj) {
			btnObj.eventDispatcher().
			 click(this.onAnnotationButtonClick.bind(this, btnObj));
		},
		
		observeMovieButton: function(btnObj) {
			btnObj.eventDispatcher().
			 click(this.onMovieButtonClick.bind(this, btnObj));
		},
		
		observeResetButton: function(btnObj) {
			btnObj.eventDispatcher().
			 click(this.onResetButtonClick.bind(this, btnObj));
		},
		
		observeExportButton: function(btnObj) {
			btnObj.eventDispatcher().
			 click(this.onExportButtonClick.bind(this, btnObj));
		},
		
		observeClockButton: function(btnObj) {
			btnObj.eventDispatcher().
			 click(this.onClockButtonClick.bind(this, btnObj));
		},
		
		addGroupColumn: function(name, initialText, spacing) {
			var tdHeadCol = document.createElement('th');
			var tdBodyCol = document.createElement('td');
			
			tdHeadCol.setAttribute('class', 'mm-editbarcol-caption');
			tdBodyCol.setAttribute('class', 'mm-editbarcol-body editbarcol-body-'+name);
			
			if (initialText && initialText.length > 0) {
				tdHeadCol.appendChild( document.createTextNode(initialText) );
			}

			this.tableRow.appendChild(tdHeadCol);
			this.tableRow.appendChild(tdBodyCol);
			if (spacing) {
				tdHeadCol.style.paddingLeft = '2em';
			}
			
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

				case 'sel_poly':
				if (!this.deselectSelectionPolygonButton()) {
					this.onSelectionPolygonButtonDown();
				}
				break;
			}
		},
		
		onSelectionBoolButtonClick: function(btnObj, e) {
			if (!this.ownerApp) {
				return;
			}
			
			switch(btnObj.name) {
			case 'selb_new':
				this.ownerApp.setSelectionBooleanOperation(mobmap.SelectionController.BoolOpNew);
				break;
			case 'selb_or':
				this.ownerApp.setSelectionBooleanOperation(mobmap.SelectionController.BoolOpOr);
				break;
			case 'selb_and':
				this.ownerApp.setSelectionBooleanOperation(mobmap.SelectionController.BoolOpAnd);
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
		
		onMovieButtonClick: function(btnObj, e) {
			if (this.ownerApp) {
				this.ownerApp.openMovieWindow();
			}
		},
		
		onResetButtonClick: function(btnObj, e) {
			if (this.ownerApp) {
				this.ownerApp.reset();
			}
		},
		
		onClockButtonClick: function(btnObj) {
			if (this.ownerApp) {
				this.ownerApp.toggleShowClock();
			}
		},
		
		onExportButtonClick: function() {
			if (this.ownerApp) {
				this.ownerApp.showExporterDialog();
			}	
		},
		
		onClockVisibilityChange: function(e, f) {
			this.clockButtonNameMap['show_clock'].setSelectedStyle(f);
		},
		
		onSelectionBoolOpChange: function(e, newValue) {
			var ops = mobmap.SelectionController;
			this.selectionBoolButtonNameMap['selb_new'].setSelectedStyle(newValue === ops.BoolOpNew);
			this.selectionBoolButtonNameMap['selb_or'].setSelectedStyle(newValue === ops.BoolOpOr);
			this.selectionBoolButtonNameMap['selb_and'].setSelectedStyle(newValue === ops.BoolOpAnd);
		},
		
		syncWithAppState: function(app) {
			if (!app) {
				return;
			}

			var s = app.getSelectionController();
			if (s) {
				this.onSelectionBoolOpChange(null, s.boolOp);
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
		
		onSelectionPolygonButtonDown: function() {
			var c = this.getOwnerSelectionController();
			if (c) {
				c.startPolygonPickSelectionSession();
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

		deselectSelectionPolygonButton: function() {
			return this.deselectButtonIfSelectionSessionActive(mobmap.SelectionSessionType.PolygonPick);
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
				case mobmap.SelectionSessionType.Rect:        sel_name = 'sel_rect';  break;
				case mobmap.SelectionSessionType.PolygonPick: sel_name = 'sel_poly';  break;
				case mobmap.SelectionSessionType.LineGate:    sel_name = 'gate_line'; break;
			}
			
			var setButtonNames = ['sel_rect', 'sel_poly', 'gate_line'];
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