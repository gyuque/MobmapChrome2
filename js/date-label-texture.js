(function(aGlobal) {
	var kMonNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
	var kWDNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	
	function ThreeDViewDateLabelTexture(size) {
		this.cols = 2;
		this.rows = 4;
		
		this.dateFontSize = 20;
		this.wdFontSize = 12;
		
		this.textureSize = size;
		this.canvas = document.createElement('canvas');
		this.canvas.width = size;
		this.canvas.height = size;
		this.canvas.style.backgroundColor = "#444";
		
		this.g = this.canvas.getContext('2d');
		this.texmap = {};
		
		this.usemarkIndex = 1;
	}
	
	ThreeDViewDateLabelTexture.prototype = {
		allocate: function(dateObj) {
			var k = makeDateKey(dateObj);
			if (this.texmap[k]) {
				// exists
				return this.texmap[k];
			}
			
			var emptyCellIndex = this.findEmptyCell();
			
			if (emptyCellIndex < 0) {
				// try to remove old cell
				this.disposeOldestCell();
				emptyCellIndex = this.findEmptyCell();
			}
			
			// cannot remove existing
			if (emptyCellIndex < 0) {
				return null;
			}
			
			//console.log("New Cell index", emptyCellIndex);
			this.renderCell(this.g, emptyCellIndex, dateObj);
			
			this.texmap[k] = {
				cell: emptyCellIndex,
				lastUsed: this.usemarkIndex++
			};
			
			return this.texmap[k];
		},

		disposeOldestCell: function() {
			var curMin = this.usemarkIndex;
			var oldestKey = null;
			for (var k in this.texmap) {
				var cellInfo = this.texmap[k];
				if (cellInfo.lastUsed < curMin) {
					oldestKey = k - 0;
					curMin = cellInfo.lastUsed;
				}
			}

			if (oldestKey === null) {
				return; // nothing found
			}

			this.clearCell(this.g, this.texmap[oldestKey].cell);
			delete this.texmap[oldestKey];
		},

		findCellByDateObject: function(dateObj, markAsUsed) {
			var k = makeDateKey(dateObj);
			var foundObj = this.texmap[k] || null;
			
			if (foundObj && markAsUsed) {
				foundObj.lastUsed = this.usemarkIndex++;
			}
			
			return foundObj;
		},
		
		findEmptyCell: function() {
			var n = this.cols * this.rows;
			for (var i = 0;i < n;++i) {
				var occupying = this.getKeyByCellIndex(i);
				if (occupying === null) {
					return i;
				}
			}
			
			return -1;
		},
		
		getKeyByCellIndex: function(ci) {
			for (var i in this.texmap) {
				if (this.texmap[i] && this.texmap[i].cell === ci) {
					return i;
				}
			}
			
			return null;
		},
		
		renderCell: function(g, cellIndex, dateObj) {
			var cw = this.calcCellWidth();
			var ch = this.calcCellHeight();
			
			var cx = cellIndex % this.cols;
			var cy = Math.floor(cellIndex / this.cols);
			
			var ox = cx * cw;
			var oy = cy * ch;
			
			this.clearCell(g, cellIndex);
			
			//g.fillStyle = "#468";
			//g.fillRect(ox+1, oy+1, cw-2, ch-2);
			
			var lab = kMonNames[ dateObj.getMonth() ] + ' '+ dateObj.getDate();
			
			g.font = this.makeDateFontName();
			g.fillStyle = "#fff";
			g.fillText(lab, ox+3, oy + this.dateFontSize+2);
			var text_w = g.measureText(lab).width;
			
			var wd = dateObj.getDay();
			g.font = this.makeWDFontName();
			g.fillText(kWDNames[wd], ox+5+text_w, oy + this.wdFontSize+3);
		},
		
		clearCell: function(g, cellIndex) {
			var cw = this.calcCellWidth();
			var ch = this.calcCellHeight();

			var cx = cellIndex % this.cols;
			var cy = Math.floor(cellIndex / this.cols);

			var ox = cx * cw;
			var oy = cy * ch;

			g.clearRect(ox, oy, cw, ch);
		},
		
		makeDateFontName: function() {
			return 'normal normal ' + this.dateFontSize + 'px Arial'; 
		},

		makeWDFontName: function() {
			return 'normal normal ' + this.wdFontSize + 'px Arial'; 
		},
		
		calcCellWidth: function() {
			return Math.floor( this.textureSize / this.cols );
		},
		
		calcCellHeight: function() {
			return Math.floor( this.textureSize / this.rows );
		},
		
		// For texture coordinates
		calcTexUSpan: function() {
			return this.calcCellWidth() / this.textureSize;
		},

		calcTexVSpan: function() {
			return this.calcCellHeight() / this.textureSize;
		},
		
		calcTexUBase: function(cellIndex) {
			var cx = cellIndex % this.cols;
			return cx * this.calcTexUSpan();
		},
		
		calcTexVBase: function(cellIndex) {
			var cy = Math.floor(cellIndex / this.cols);
			return cy * this.calcTexVSpan();
		}
	};
	
	function makeDateKey(dateObj) {
		return (dateObj.getFullYear() * 10000) + (dateObj.getMonth()+1)*100 + dateObj.getDate();
	}
	
	ThreeDViewDateLabelTexture.doSelfTest = function() {
		function dumpTexCoord(texman, dateObj) {
			var texCell = texman.findCellByDateObject(dateObj, true);
			var ci = texCell.cell;
			console.log( texman.calcTexUBase(ci) , texman.calcTexVBase(ci) , texman.calcTexUSpan() , texman.calcTexVSpan());
		}
		
		var tx = new ThreeDViewDateLabelTexture(256);
		document.body.appendChild(tx.canvas);
		
		var today = new Date();
		tx.allocate(today);
		dumpTexCoord(tx, today);

		var nextDay = new Date( (today - 0) + (24*3600*1000) );
		tx.allocate(nextDay);
		dumpTexCoord(tx, nextDay);

		var secondnextDay = new Date( (today - 0) + (48*3600*1000) );
		tx.allocate(secondnextDay);
		dumpTexCoord(tx, secondnextDay);
		
		// remove test
		tx.findCellByDateObject(today, true);
		tx.findCellByDateObject(today, true);
		tx.findCellByDateObject(secondnextDay, true);
		
		tx.disposeOldestCell();
	};
	
	aGlobal.ThreeDViewDateLabelTexture = ThreeDViewDateLabelTexture;
})(window);