if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	function FastProjectionGrid(size) {
		this.size = size;
		this.vertices = new Array((size+1)*(size+1));
		
		this.latSpan = 1;
		this.lngSpan = 1;
		
		this.latCell = 1.0;
		this.lngCell = 1.0;
		
		this.offsetX = this.offsetY = 0;
	}

	FastProjectionGrid.prototype = {
		setOffset: function(ox, oy) {
			this.offsetX = ox;
			this.offsetY = oy;
		},
		
		update: function(pj, latMin, lngMin,  latMax, lngMax) {
			var LL = google.maps.LatLng;
			var size = this.size;
			var ty, tx;

			var dlat = latMax - latMin;
			var dlng = lngMax - lngMin;
			var lat, lng;
			
			var vi = 0;
			var vls = this.vertices;
			
			for (var y = 0;y <= size;y++) {
				ty = y / size;
				lat = latMin + ty * dlat;
					
				for (var x = 0;x <= size;x++) { // 0 < x < size+1
					tx = x / size;
					
					lng = lngMin + tx * dlng;
					var spos = pj.fromLatLngToDivPixel(new LL(lat, lng));
					vls[vi++] = new FastProjectionGrid.Vertex(lat, lng, spos);
				}
			}
			
			if (dlng > -0.00000001 && dlng < 0.00000001) {dlng = 1}
			if (dlat > -0.00000001 && dlat < 0.00000001) {dlat = 1}
			this.lngSpan = dlng;
			this.latSpan = dlat;

			this.lngCell = dlng / size;
			this.latCell = dlat / size;
		},
		
		calc: function(a) {
			var vls = this.vertices;
			var originCell = vls[0];
			var sz = this.size;
			var sz1 = sz+1;
			
			var olat = a.lat - originCell.lat;
			var olng = a.lng - originCell.lng;

			var cx = Math.floor((olng * sz)/this.lngSpan);
			var cy = Math.floor((olat * sz)/this.latSpan);
			
			var vx1 =  cx;
			if (vx1 >= sz) { vx1 = sz-1; }
			else if (vx1 < 0) { vx1 = 0; }
	//		var vx2 = (cx == sz) ? cx : (cx+1);
			var vx2 = vx1 + 1;

			var vy1 =  cy;
			if (vy1 >= sz) { vy1 = sz-1; }
			else if (vy1 < 0) { vy1 = 0; }
	//		var vy2 = (cy == sz) ? cy : (cy+1);
			var vy2 = vy1 + 1;
			
			var v0 = vls[vy1 * sz1 + vx1];
			var v1 = vls[vy1 * sz1 + vx2];
			var v2 = vls[vy2 * sz1 + vx1];
			
			var tx = (a.lng - v0.lng) / this.lngCell;
			var ty = (a.lat - v0.lat) / this.latCell;
			var _tx = 1.0 - tx;
			var _ty = 1.0 - ty;
			
			a.screenX = v0.sx * _tx  +  v1.sx * tx + this.offsetX;
			a.screenY = v0.sy * _ty  +  v2.sy * ty + this.offsetY;
		},
		
		exportConfiguration: function() {
			return {
				vertices: this.vertices,
				size: this.size,
				latSpan: this.latSpan,
				lngSpan: this.lngSpan,
				latCell: this.latCell,
				lngCell: this.lngCell
			};
		},
		
		importConfiguration: function(src) {
			this.size = src.size;
			this.vertices = src.vertices;

			this.latSpan = src.latSpan;
			this.lngSpan = src.lngSpan;

			this.latCell = src.latCell;
			this.lngCell = src.lngCell;
		},
		
		relocateOrigin: function() {
			var ls = this.vertices;
			if (ls.length < 1) {
				return;
			}
			
			var oi = (this.size+1) * this.size;
			var o = ls[oi];
			for (var i = 0;i < ls.length;++i) {
				if (i === oi) { continue; }
				
				var v = ls[i];
				v.sx -= o.sx;
				v.sy -= o.sy;
			}
			
			o.sx = 0;
			o.sy = 0;
		},
		
		getEntireScreenWidth: function() {
			var ls = this.vertices;
			var n = this.size;
			if (!ls[n]) {
				return 0;
			}
			
			return ls[n].sx - ls[0].sx;
		},
		
		getEntireScreenHeight: function() {
			var ls = this.vertices;
			var n = this.size;
			return ls[0].sy - ls[(n+1)*n].sy;
		},
		
		invertCalc: function(inoutVec2) {
			var sx = inoutVec2[0];
			var sy = inoutVec2[1];
			var scrW = this.getEntireScreenWidth();
			if (scrW < 1.0) {
				// not ready
				return false;
			}
			
			sx = (sx*0.5) + 0.5;
			sy = (sy*0.5) + 0.5;
			sx *= scrW;
			sy *= this.getEntireScreenHeight();
			
			var ls = this.vertices;
			var len = ls.length;
			var loop_len = (this.size+1) * this.size;
			for (var i = 0;i < loop_len;++i) {
				if (!ls[i]) {break;}

				var x1 = ls[i].sx;
				var x2 = ls[i+1].sx;
				var y1 = ls[i+this.size+1].sy;
				var y2 = ls[i].sy;
				
				if (sx >= x1 && sy >= y1 && sx <= x2 && sy <= y2) {
					var xlen = x2-x1;
					var ylen = y2-y1;
					var nx = (sx-x1) / xlen;
					var ny = (sy-y1) / ylen;

					var lat1 = ls[i].lat;
					var lng1 = ls[i].lng;
					
					inoutVec2[0] = lng1 + this.lngCell * nx;
					inoutVec2[1] = lat1 + this.latCell * (1.0 - ny);

					return true;
				}
			}
			
			return false;
		}
	};

	FastProjectionGrid.Vertex = function(lat, lng, spos) {
		this.lat = lat;
		this.lng = lng;
		this.sx = spos.x;
		this.sy = spos.y;
	};
	
	aGlobal.mobmap.FastProjectionGrid = FastProjectionGrid;
})(window);