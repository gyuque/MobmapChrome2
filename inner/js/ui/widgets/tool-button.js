if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	var seqId = 0;
	
	function ToolButton(buttonName, w, h) {
		++seqId;
		
		this.name = buttonName;
		this.elementId = 'mm-toolbutton-' +seqId+ '-' + buttonName;
		this.width = w || 25;
		this.height = h || 18;
		this.element = createSpacerButton(this.width, this.height);
		this.element.id = this.elementId;
		this.j = $(this.element);
	}

	ToolButton.prototype.eventDispatcher = function() {
		return this.j;
	};

	ToolButton.prototype.addClass = function(c) {
		this.j.addClass(c);
	};

	ToolButton.prototype.configureStyleSheet = function(spriteManager, col) {
		spriteManager.addButton(this.elementId, col);
	};
	
	ToolButton.prototype.setSeparated = function(b) {
		var cls = 'toolbutton-separated';
		if (b) {
			this.j.addClass(cls);
		} else {
			this.j.removeClass(cls);
		}
	};
	
	ToolButton.prototype.addClass = function(c) {
		this.j.addClass(c);
	};

	ToolButton.prototype.setTitle = function(t) {
		this.j.attr('title', t);
	};
	
	ToolButton.prototype.setSelectedStyle = function(b) {
		var cls = "selected";
		if (b) {
			this.j.addClass(cls);
		} else {
			this.j.removeClass(cls);
		}
	};
	
	function createSpacerButton(w, h) {
		var img = $H('img', 'mm-tool-button');
		img.width = w;
		img.height = h;
		img.src = SpacerData;
		
		return img;
	}
	
	var SpacerData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAECAYAAACzzX7wAAAABmJLR'+
	                 '0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3QsFBiwBaMFD+AAAAB1p'+
	                 'VFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAAAFUlEQVQI12P8//8/Az7AxEA'+
	                 'AUK4AAIcdAwVSsWMgAAAAAElFTkSuQmCC';
	
	ToolButton.getSharedSpacerData = function() { return SpacerData; }
	
	// Sprites -----------------------------------------------
	function ToolButtonSpriteManager(spriteImageURL) {
		this.buttonWidth = 25;
		this.buttonHeight = 18;
		this.backgroundProperty = 'background: url("' +spriteImageURL+ '") $OXpx $OYpx;';

		this.styleElement = $H('style');
		this.styleElement.type = "text/css";
		this.buttonMap = {};
		document.body.appendChild(this.styleElement);
	};
	
	ToolButtonSpriteManager.prototype.addButton = function(buttonId, colIndex) {
		this.deleteButton(buttonId);
		
		var dat = {
			id: buttonId,
			col: colIndex
		};
		
		this.buttonMap[buttonId] = dat;
		this.updateStyleSheet();
	};
	
	ToolButtonSpriteManager.prototype.deleteButton = function(buttonId) {
		delete this.buttonMap[buttonId];
	};

	ToolButtonSpriteManager.prototype.updateStyleSheet = function() {
		this.styleElement.innerHTML = '';
		
		var s = [];
		for (var i in this.buttonMap) {
			// Add normal, pushed, hover styles
			var btn_dat = this.buttonMap[i];
			var col = btn_dat.col;
			var ox  = -col * this.buttonWidth;
			var oy1 = -this.buttonHeight;
			var oy2 = -this.buttonHeight * 2;
			
			var selector = '#' + i;
			s.push( selector        +' {' + this.makeBackgroundProperty(ox, 0) + '}' );
			// s.push( selector  +':hover {' + this.makeBackgroundProperty(ox, oy1) + '}' );
			s.push( selector +':active,'+selector+'.selected {' + this.makeBackgroundProperty(ox, oy2) + '}' );
		}
		
		this.styleElement.appendChild( $T(s.join("\n")) );
	};
	
	ToolButtonSpriteManager.prototype.makeBackgroundProperty = function(ox, oy) {
		return this.backgroundProperty.replace('$OX', ox).replace('$OY', oy);
	};
	
	// -------- Group --------
	function ToolButtonGroup(groupName) {
		this.name = groupName;
		this.buttonIdMap = {};
		this.currentSelectedButton = null;
		
		this.jEventDispatcherElement = $(document.createElement('span'));
	}
	
	ToolButtonGroup.EVENT_SELECT_CHANGED = "tool-button-group-select-changed";
	
	ToolButtonGroup.prototype = {
		eventDispatcher: function() {
			return this.jEventDispatcherElement;
		},
		
		bulkAddFromList: function(buttonList, idmap) {
			var len = buttonList.length;
			for (var i = 0;i < len;++i) {
				var btnData = buttonList[i];
				if (btnData.group === this.name) {
					var buttonInstance = idmap[btnData.buttonName];
					if (buttonInstance) {
						this.addButton(buttonInstance, btnData.buttonName);
					}
				}
			}
		},
		
		addButton: function(buttonInstance, buttonName) {
			if (!buttonName) {
				buttonName = buttonInstance.name;
			}
			
			this.buttonIdMap[buttonName] = buttonInstance;
			buttonInstance.eventDispatcher().mousedown(
				this.onButtonClick.bind(this, buttonInstance)
			);
		},
		
		onButtonClick: function(senderButton, e) {
			this.selectButton(senderButton);
		},
		
		selectButton: function(btn) {
			if (this.currentSelectedButton === btn) {
				return;
			}
			
			// Toggle style
			var old = this.currentSelectedButton;
			if (old) {
				old.setSelectedStyle(false);
			}
			
			this.currentSelectedButton = btn;
			if (btn) {
				btn.setSelectedStyle(true);
			}
			
			this.eventDispatcher().trigger(ToolButtonGroup.EVENT_SELECT_CHANGED, [this, btn]);
		},
		
		selectByName: function(name) {
			var btn = this.buttonIdMap[name];
			if (btn) {
				this.selectButton(btn);
			}
		}
	};
	
	// +++ Export +++
	aGlobal.mobmap.ToolButton = ToolButton;
	aGlobal.mobmap.ToolButtonGroup = ToolButtonGroup;
	aGlobal.mobmap.ToolButtonSpriteManager = ToolButtonSpriteManager;
})(window);