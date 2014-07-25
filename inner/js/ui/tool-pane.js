if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	var spritePlayButtons = null;

	function ToolPane(containerElement) {
		// Initialize - - - - - - - -
		this.ownerApp = null;
		this.jLayoutTable = null;
		this.layoutCell_Toolbar  = null;
		this.layoutCell_Controls = null;
		this.layoutCell_TimeDisp = null;
		this.layoutCell_Timeline = null;
		this.jLayoutCell_Controls = null;
		this.jLayoutCell_TimeDisp = null;
		this.jLayoutCell_Timeline = null;
		this.elementDateDisp = null;
		this.elementTimeDisp = null;
		this.elementTimeInput = null;
		
		this.timelineBar = new mobmap.TimelineBar();
		this.editToolBar = new mobmap.MobmapEditToolBar();
		this.controlPanel = null;
		this.containerElement = containerElement;
		this.jContainerElement = $(containerElement);
		// - - - - - - - - - - - - - -
		if (!spritePlayButtons) {
			spritePlayButtons = new mobmap.ToolButtonSpriteManager('images/playbuttons-combined.png');
		}
		
		this.setupWidgets();
		this.setupDisplayArea();
		
		this.specialDisplayTexts = {
			row1: null,
			row2: null,
			messageIndex: 0
		};
	}
	
	ToolPane.prototype = {
		setApp: function(a) {
			this.ownerApp = a;
			this.controlPanel.setApp(a);
			this.editToolBar.setApp(a);
		},
		
		setRangeButtonSelected: function(b) {
			this.controlPanel.setRangeButtonSelected(b);
		},
		
		connectToSelectionController: function(selcon) {
			selcon.addResponder(this.editToolBar);
		},

		observeContainerEvents: function(app3PanesView) {
			app3PanesView.eventDispatcher().bind(mobmap.Mobmap3PanesScreen.RESIZE_EVENT,
				this.onContainerResize.bind(this));
		},
		
		setupWidgets: function() {
			var l_tbl = this.buildLayoutTable();
			this.jLayoutTable = $(l_tbl);
			
			this.layoutCell_Timeline.appendChild( this.timelineBar.element );
			this.layoutCell_Toolbar.appendChild( this.editToolBar.element );
			this.containerElement.appendChild( l_tbl );
			
			this.controlPanel = new TimelineControlPanel(this.layoutCell_Controls);
		},
		
		setupDisplayArea: function() {
			this.timelineBar.setDateDisplayElement(this.elementDateDisp);
			this.timelineBar.setTimeDisplayElement(this.elementTimeDisp);
			this.timelineBar.setTimeInputElement(this.elementTimeInput);
		},
		
		buildLayoutTable: function() {
			var tbl = document.createElement('table');
			tbl.setAttribute('class', 'mm-tool-layout');
			var trToolBar = document.createElement('tr');
			var tr = document.createElement('tr');
			
			var tdEditToolBar = document.createElement('td');
			tdEditToolBar.setAttribute('class', 'mm-tool-layoutcell-edittool');
			tdEditToolBar.colSpan = 3;
			
			var td0 = document.createElement('td');
			var td1 = document.createElement('td');
			var td2 = document.createElement('td');
			td0.setAttribute('class', 'mm-tool-layoutcell-controls');
			td1.setAttribute('class', 'mm-tool-layoutcell-timedisp');

			// Date and Time display text - - - - - - - - - -
			var displayAreaContainer = document.createElement('span');
			displayAreaContainer.setAttribute('class', 'mm-timeline-disp-container');
			td1.appendChild(displayAreaContainer);
			
			this.elementDateDisp = this.generateDateDispElement(displayAreaContainer);
			this.elementTimeDisp = this.generateTimeDispElement(displayAreaContainer);
			this.elementTimeInput = this.generateTimeInputElement(displayAreaContainer);
			// - - - - - - - - - - - - - - - - - - - - - - - -

			this.layoutCell_Toolbar = tdEditToolBar;
			this.layoutCell_Controls = td0;
			this.layoutCell_TimeDisp = td1;
			this.layoutCell_Timeline = td2;
			this.jLayoutCell_Controls = $(this.layoutCell_Controls);
			this.jLayoutCell_TimeDisp = $(this.layoutCell_TimeDisp);
			this.jLayoutCell_Timeline = $(this.layoutCell_Timeline);

			tr.appendChild(td0);
			tr.appendChild(td1);
			tr.appendChild(td2);
			trToolBar.appendChild(tdEditToolBar);
			tbl.appendChild(trToolBar);
			tbl.appendChild(tr);
			return tbl;
		},

		generateDateDispElement: function(containerElement) {
			return this.generateDispAreaElement(containerElement,
				                                'mm-timeline-date-disp',
				                                '1970-01-01');
		},
		
		generateTimeDispElement: function(containerElement) {
			return this.generateDispAreaElement(containerElement,
				                                'mm-timeline-time-disp',
				                                '00:00:00');
		},
		
		generateDispAreaElement: function(containerElement, el_class, initial_str) {
			var el = document.createElement('span');
			el.setAttribute('class', el_class);
			el.innerHTML = initial_str;
			containerElement.appendChild(el);
			
			return el;
		},
		
		generateTimeInputElement: function(containerElement) {
			var el = document.createElement('input');
			el.setAttribute('class', 'mm-timeline-time-input');
			el.value = '00:00:00';
			el.type = 'text';
			el.size = 9;
			containerElement.appendChild(el);
			
			return el;
		},
		
		onContainerResize: function(e) {
			var w1 = this.jLayoutCell_TimeDisp.width();
			var w2 = this.jLayoutCell_Controls.width();
			var remainW = this.jContainerElement.width() - (w1 + w2);

			this.timelineBar.setWidth(remainW);
		},
		
		calcTimelineCellWidth: function() {
			
		},
		
		getTimelineBar: function() {
			return this.timelineBar;
		},
		
		pushStopButton: function() {
			this.controlPanel.pushStopButton();
		},

		// Play speed -----------------------------------
		getPlaySpeedFromChosenIndex: function() {
			var index = this.controlPanel.getPlaySpeedSliderValue();
			return mobmap.PlayController.getPresetPlaySpeed(index);
		},
		
		sendChosenPlaySpeed: function(pc) {
			var spd = this.getPlaySpeedFromChosenIndex();
			pc.setOptionRealSecPerPlaySec(spd);
		},
		
		showPlaySpeedAsSpecialTexts: function() {
			var spd = this.getPlaySpeedFromChosenIndex();
			var disp_text = makePrettySecRange(spd);
			this.setSpecialDisplayTexts(disp_text, " /movie sec.");
		},
		
		setSpecialDisplayTexts: function(str1, str2) {
			var sp = this.specialDisplayTexts;
			var newMessageIndex = sp.messageIndex + 1;

			sp.row1 = str1;
			sp.row2 = str2;
			sp.messageIndex = newMessageIndex;

			this.timelineBar.setSuppressUpdatingText(true);
			this.timelineBar.showSpecialDisplayTexts(str1, str2);
			
			setTimeout( this.clearSpecialDisplayTexts.bind(this, newMessageIndex) , 1000 );
		},
		
		clearSpecialDisplayTexts: function(messageIndex) {
			var sp = this.specialDisplayTexts;
			if (sp.messageIndex === messageIndex) {
				sp.row1 = null;
				sp.row2 = null;
				this.timelineBar.setSuppressUpdatingText(false);
			}
		}
	};
	
	function TimelineControlPanel(containerElement) {
		this.ownerApp = null;
		this.buttonsContainer = null;
		this.optionContainer = null;
		this.jPlaySpeedRange = null;
		this.groupPlayStates = null;
		this.buttons = {};

		this.containerElement = containerElement;
		this.buildInnerContainers();
		this.buildButtons();
		this.buildOptionWidgets();
		
		this.makeButtonGroups();
		this.observeRangeButton();
	}
	
	TimelineControlPanel.prototype = {
		setApp: function(a) {
			this.ownerApp = a;
		},

		pushStopButton: function() {
			this.groupPlayStates.selectByName('stop');
		},

		buildInnerContainers: function() {
			var bc = document.createElement('div');
			bc.setAttribute('class', 'mm-tl-buttons-container');
			this.containerElement.appendChild(bc);
			
			var oc = document.createElement('div');
			oc.setAttribute('class', 'mm-tl-playoption-container');
			this.containerElement.appendChild(oc);
			
			this.buttonsContainer = bc;
			this.optionContainer = oc;
		},
		
		buildButtons: function() {
			var idMap = this.buttons;
			var nextSeparated = false;
			var buttonList = [
				'stop',
				'play',
				'ff',
				null, // -- separate --
				'range'
			];
			
			for (var buttonIndex in buttonList) {
				var buttonName = buttonList[buttonIndex];
				if (buttonName === null) {
					nextSeparated = true;
				} else {
					var btnObj = new mobmap.ToolButton(buttonName, 25, 18);
					btnObj.configureStyleSheet(spritePlayButtons, buttonIndex - 0);
					idMap[buttonName] = btnObj;
				
					this.buttonsContainer.appendChild(btnObj.element);
					if (nextSeparated) {
						btnObj.setSeparated(true);
						nextSeparated = false;
					}
					
					/*
					var handlerName = "onToolButtonClick_" + buttonName;
					var handlerMethod = this[handlerName];
					if (handlerMethod) {
					}
					*/
				}
			}
		},
		
		makeButtonGroups: function() {
			var b = this.buttons;
			this.groupPlayStates = new mobmap.ToolButtonGroup("play-states");
			this.groupPlayStates.addButton(b.stop);
			this.groupPlayStates.addButton(b.play);
			this.groupPlayStates.addButton(b.ff);
			this.groupPlayStates.selectByName('stop');
			
			this.groupPlayStates.eventDispatcher().bind(
				mobmap.ToolButtonGroup.EVENT_SELECT_CHANGED,
				this.onPlayStateToggleChange.bind(this)
			);
		},
		
		observeRangeButton: function() {
			var b = this.buttons['range'];
			b.eventDispatcher().click( this.onRangeButtonClick.bind(this) );
		},
		
		setRangeButtonSelected: function(b) {
			this.buttons['range'].setSelectedStyle(b);
		},
		
		onRangeButtonClick: function() {
			this.callOwnerAPI("onMakeTimeRangeButtonClick");
		},
		
		buildOptionWidgets: function() {
			var rg = document.createElement('input');
			rg.setAttribute('type', 'range');
			rg.min = 0;
			rg.max = 7;
			rg.value = 3;
			
			this.jPlaySpeedRange = $(rg).
				change( this.onPlaySpeedSliderChange.bind(this) ).
				mousedown( this.onPlaySpeedSliderClick.bind(this) );
			this.optionContainer.appendChild(rg);
		},
		
		onPlayStateToggleChange: function(e, group, selectedButton) {
			// Callback name to invoke
			var invoke_name = "onPlayStateButtonPush_" + selectedButton.name;
			
			if (this.ownerApp && this.ownerApp[invoke_name]) {
				this.ownerApp[invoke_name]();
			} else {
				console.log("WARNING: cannot invoke App."+invoke_name );
			}
		},
		
		onPlaySpeedSliderChange: function() {
			this.callOwnerAPI("onPlaySpeedSliderChange");
		},

		onPlaySpeedSliderClick: function() {
			this.callOwnerAPI("onPlaySpeedSliderClick");
		},
		
		callOwnerAPI: function(invoke_name) {
			if (this.ownerApp && this.ownerApp[invoke_name]) {
				this.ownerApp[invoke_name]();
			}
		},
		
		getPlaySpeedSliderValue: function() {
			return this.jPlaySpeedRange.val();
		}
	};
	
	aGlobal.mobmap.ToolPane = ToolPane;
})(window);