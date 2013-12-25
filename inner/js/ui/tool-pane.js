if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	var spritePlayButtons = null;

	function ToolPane(containerElement) {
		// Initialize - - - - - - - -
		this.ownerApp = null;
		this.layoutCell_Toolbar  = null;
		this.layoutCell_Controls = null;
		this.layoutCell_TimeDisp = null;
		this.layoutCell_Timeline = null;
		this.jLayoutCell_Timeline = null;
		this.elementDateDisp = null;
		this.elementTimeDisp = null;
		
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
	}
	
	ToolPane.prototype = {
		setApp: function(a) {
			this.ownerApp = a;
		},

		observeContainerEvents: function(app3PanesView) {
			app3PanesView.eventDispatcher().bind(mobmap.Mobmap3PanesScreen.RESIZE_EVENT,
				this.onContainerResize.bind(this));
		},
		
		setupWidgets: function() {
			var l_tbl = this.buildLayoutTable();
			
			this.layoutCell_Timeline.appendChild( this.timelineBar.element );
			this.layoutCell_Toolbar.appendChild( this.editToolBar.element );
			this.containerElement.appendChild( l_tbl );
			
			this.controlPanel = new TimelineControlPanel(this.layoutCell_Controls);
		},
		
		setupDisplayArea: function() {
			this.timelineBar.setDateDisplayElement(this.elementDateDisp);
			this.timelineBar.setTimeDisplayElement(this.elementTimeDisp);
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
			var spanDate = document.createElement('span');
			spanDate.setAttribute('class', 'mm-timeline-date-disp');
			spanDate.innerHTML = "1970-01-01";
			td1.appendChild(spanDate);
			
			var spanTime = document.createElement('span');
			spanTime.setAttribute('class', 'mm-timeline-time-disp');
			spanTime.innerHTML = "00:00:00";
			td1.appendChild(spanTime);
			
			this.elementDateDisp = spanDate;
			this.elementTimeDisp = spanTime;
			// - - - - - - - - - - - - - - - - - - - - - - - -

			this.layoutCell_Toolbar = tdEditToolBar;
			this.layoutCell_Controls = td0;
			this.layoutCell_TimeDisp = td1;
			this.layoutCell_Timeline = td2;
			this.jLayoutCell_Timeline = $(this.layoutCell_Timeline);

			tr.appendChild(td0);
			tr.appendChild(td1);
			tr.appendChild(td2);
			trToolBar.appendChild(tdEditToolBar);
			tbl.appendChild(trToolBar);
			tbl.appendChild(tr);
			return tbl;
		},
		
		onContainerResize: function(e) {
			var cellWidth = this.jLayoutCell_Timeline.width();
			this.timelineBar.setWidth(cellWidth);
		},
		
		getTimelineBar: function() {
			return this.timelineBar;
		}
	};
	
	function TimelineControlPanel(containerElement) {
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
	}
	
	TimelineControlPanel.prototype = {
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
		
		buildOptionWidgets: function() {
			var rg = document.createElement('input');
			rg.setAttribute('type', 'range');
			
			this.jPlaySpeedRange = $(rg);
			this.optionContainer.appendChild(rg);
		},
		
		onPlayStateToggleChange: function(e, group, selectedButton) {
		}
	};
	
	aGlobal.mobmap.ToolPane = ToolPane;
})(window);