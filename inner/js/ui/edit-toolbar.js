if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function MobmapEditToolBar() {
		this.element = document.createElement("table");
		this.tableRow = document.createElement("tr");
		this.element.appendChild(this.tableRow);
		
		this.groupColumnMap = {};
		this.addPresetColumns();
		this.addSelectionButtons('sel');
	}
	
	MobmapEditToolBar.prototype = {
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
				generatedButtonMap[bname] = btnObj; 
			}
		},
		
		addGroupColumn: function(name, initialText) {
			var tdHeadCol = document.createElement('th');
			var tdBodyCol = document.createElement('td');
			
			tdHeadCol.setAttribute('mm-editbarcol-caption');
			tdBodyCol.setAttribute('mm-editbarcol-body');
			tdHeadCol.appendChild( document.createTextNode(initialText) );
			
			this.tableRow.appendChild(tdHeadCol);
			this.tableRow.appendChild(tdBodyCol);
			
			this.groupColumnMap[name] = tdBodyCol;
		}
	};
	
	aGlobal.mobmap.MobmapEditToolBar = MobmapEditToolBar;
})(window);