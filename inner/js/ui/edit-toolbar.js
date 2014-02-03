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
		this.addSelectionButtons('sel');
	}
	
	MobmapEditToolBar.prototype = {
		setApp: function(a) {
			this.ownerApp = a;
		},

		addPresetColumns: function() {
			var list = [
			// Internal name | Label text
				["sel",       "Selection"],
				["gate",      "Gate"     ]
			];
			
			for (var i in list) {
				this.addGroupColumn(list[i][0], list[i][1]);
			}
		},
		
		addSelectionButtons: function(colName, buttonList) {
			var generatedButtonMap = {};
			var targetCol = this.groupColumnMap[colName];
			var ls = [
				['sel_clear', 0],
				['sel_rect', 1]
			];
			
			for (var i in ls) {
				var buttonData = ls[i];
				var bname = buttonData[0];
				var sp_index = buttonData[1];
				
				var btnObj = new mobmap.ToolButton(bname, 25, 18);
				btnObj.configureStyleSheet(editbuttonsSpriteManager, sp_index);
				generatedButtonMap[bname] = btnObj;
				
				targetCol.appendChild(btnObj.element);
				this.observeSelectionButton(btnObj);
			}
		},
		
		observeSelectionButton: function (btnObj) {
			btnObj.eventDispatcher().
			 click(this.onSelectionButtonClick.bind(this, btnObj)).
			 mousedown(this.onSelectionButtonMousedown.bind(this, btnObj));
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
			}
		},

		onSelectionButtonMousedown: function(btnObj, e) {
			console.log(e, btnObj);
		},
		
		onSelectionClearButtonClick: function() {
			if (this.ownerApp) {
				this.ownerApp.clearSelection();
			}
		}
	};
	
	aGlobal.mobmap.MobmapEditToolBar = MobmapEditToolBar;
})(window);