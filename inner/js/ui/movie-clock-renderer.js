if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	function ClockRenderer(w, h) {
		this.width = w;
		this.height = h;
		
		this.hour = 10;
		this.min = 8;
		this.sec = 42;
		
		this.labelText = "2014-02-27";
	}

	ClockRenderer.prototype = {
		render: function(g) {
			g.save();
			g.fillStyle = "rgba(0,0,0,0.5)";
			g.fillRect(0, 0, this.width, this.height);
			
			this.drawBackgroundParts(g);
			this.drawHourHand(g);
			this.drawMinHand(g);
			g.restore();
			
			this.drawTopLabel(g);
			this.drawTimeLabel(g);
		},

		makeTopLabelFromDate: function(d) {
			this.labelText = d.getFullYear() + '-' + pad02(d.getMonth()+1) + '-' + pad02(d.getDate());
		},


		drawTopLabel: function(g) {
			var cx = this.width >> 1;
			var y = 16;

			g.save();
			g.fillStyle = '#fff';
			g.font = 'normal 12px monospace';
			g.textAlign = 'center';
			g.fillText(this.labelText, cx, y);
			g.restore();
		},
		
		drawTimeLabel: function(g) {
			var cx = this.width >> 1;
			var y = this.height - 5;
			g.save();
			g.fillStyle = '#fff';
			g.font = 'normal 15px monospace';
			g.textAlign = 'center';
			g.fillText(makeHHMMSS(this.hour, this.min ,this.sec) , cx, y);
			g.restore();
		},
		
		drawBackgroundParts: function(g) {
			var cx = this.width >> 1;
			var cy = this.height >> 1;
			var R = Math.floor(this.width * 0.45);
			
			g.save();
			g.strokeStyle = '#fff';
			g.lineWidth = 0.5;
			g.beginPath();
			g.arc(cx, cy, R+2, 0, Math.PI*2, false);
			g.stroke();
			
			g.fillStyle = '#fff';
			g.translate(cx, cy);
			for (var i = 0;i < 60;++i) {
				g.save();
				g.rotate( (i / 30.0) * Math.PI );
				if ((i % 5) === 0) {
					g.fillRect(-1, -R, 3, 8);
				} else {
					g.fillRect(0, -R, 1, 4);
				}
				g.restore();
			}
			g.restore();
		},
		
		drawHourHand: function(g) {
			var R = Math.floor(this.width * 0.275);
			var angle = 
			 ((this.hour + this.min / 60.0) / 6.0) * Math.PI;
			
			this.drawHand(g, angle, drawHourHandProc, R);
		},

		drawMinHand: function(g) {
			var R = Math.floor(this.width * 0.42);
			var angle = ( (this.min + this.sec/60) / 30.0) * Math.PI;
			
			this.drawHand(g, angle, drawMinHandProc, R);
		},
		
		drawHand: function(g, angle, drawProc, len) {
			var cx = this.width >> 1;
			var cy = this.height >> 1;
			
			g.save();
			g.fillStyle = '#fff';
			g.translate(cx, cy);
			g.rotate(angle);
			drawProc(g, len);
			g.restore();
		}
	};

	function drawHourHandProc(g, len) {
		g.beginPath();
		g.moveTo(-2, -len);
		g.lineTo( 3, -len);
		g.lineTo( 4, 9);
		g.lineTo(-3, 9);
		g.fill();
	}

	function drawMinHandProc(g, len) {
		g.beginPath();
		g.moveTo(-1, -len);
		g.lineTo( 2, -len);
		g.lineTo( 3, 9);
		g.lineTo(-2, 9);
		g.fill();
	}

	function pad02(n) {
		if (n >= 10) {
			return n.toString();
		} else {
			return '0' + n;
		}
	}
	
	function makeHHMMSS(h, m ,s) {
		return pad02(h) +':'+ pad02(m) +':'+ pad02(s);
	}

	aGlobal.mobmap.ClockRenderer = ClockRenderer;
})(window);