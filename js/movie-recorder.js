(function(aGlobal) {
	'use strict';
	var gApp = null;
	
	function MovieRecorder(captureVideoElement, triggerElement) {
		this.option = new MovieRecorderOption();
		this.captureVideoElement = captureVideoElement;
		this.previewContainerElement = document.getElementById('preview-container');
		
		this.regionSelector = new RegionSelector(this.captureVideoElement);
		this.previewContainerElement.appendChild(this.regionSelector.element);
		this.jTrigger = $(triggerElement);
		
		this.runStatus = {
			running: false,
			frameIndex: 0,
			nextRequestId: (Math.random() * 0x3fffffff) | 0
		};
		
		this.jTrigger.click(this.onTriggerClick.bind(this));
	}
	
	MovieRecorder.prototype = {
		run: function() {
			this.sendRenderRequest(0);
		},
		
		sendRenderRequest: function(dtime) {
			window.outerRequestMapRender(++this.runStatus.nextRequestId, dtime);
		},
		
		onTriggerClick: function() {
			this.run();
		}
	};


	function MovieRecorderOption() {
		this.mmsecPerFrame = 10;
		this.movieFPS      = 30;
		this.totalFrames   = 240;
	}

	function RegionSelector(sourceVideo) {
		this.sourceVideo = sourceVideo;
		this.element = document.createElement('canvas');
		
		this.dragging = false;
		this.dragPrevPos = {
			x:0, y:0
		};
		
		this.offset = {
			x:0, y:0
		};
		
		this.width = 720;
		this.height = 480;
		this.updateCanvasSize();
		this.redraw();
		
		this.redrawClosure = this.intervalRedraw.bind(this);
		this.intervalRedraw();
		
		this.observeMouse();
	}
	
	RegionSelector.prototype = {
		setSize: function(w, h) {
			this.width = w;
			this.height = h;
		},
		
		updateCanvasSize: function() {
			this.element.width = this.width;
			this.element.height = this.height;
		},
		
		redraw: function() {
			var g = this.element.getContext('2d');
			g.fillStyle = '#000';
			g.fillRect(0, 0, this.width, this.height);
			
			g.drawImage(this.sourceVideo, this.offset.x, this.offset.y);
		},
		
		intervalRedraw: function() {
			this.redraw();
			setTimeout(this.redrawClosure, 500);
		},
		
		observeMouse: function() {
			$(this.element).
			 mousemove(this.onMouseMove.bind(this)).
			 mouseup(this.onMouseUp.bind(this)).
			 mousedown(this.onMouseDown.bind(this));
		},
		
		onMouseDown: function(e) {
			this.dragging = true;
			this.dragPrevPos.x = e.screenX;
			this.dragPrevPos.y = e.screenY;
		},
		
		onMouseUp: function(e) {
			this.dragging = false;
		},
		
		onMouseMove: function(e) {
			if (this.dragging) {
				var dx = e.screenX - this.dragPrevPos.x;
				var dy = e.screenY - this.dragPrevPos.y;
			
				this.dragPrevPos.x = e.screenX;
				this.dragPrevPos.y = e.screenY;
				
				this.moveOffset(dx, dy);
			}
		},
		
		moveOffset: function(dx, dy) {
			this.offset.x += dx;
			this.offset.y += dy;
			this.redraw();
		}
	};
	
	// Launch
	aGlobal.onload = function() {
		chrome.desktopCapture.chooseDesktopMedia(["window"], function(streamId){
			navigator.webkitGetUserMedia({
				audio:false,
				video: {

					mandatory: {
						chromeMediaSource: "desktop",
						chromeMediaSourceId: streamId,
						minWidth          : 720,
						maxWidth          : 2560,
						minHeight         : 480,	
						maxHeight         : 1440
					}

				}
			},
			onCaptureSuccess,
			onCaptureFail
			);
			
			
		});
	};
	
	function onCaptureSuccess(stream) {
		var video = document.createElement('video');

		video.src = URL.createObjectURL(stream);
		video.style.display = "none";
		document.body.appendChild(video);
		video.play();
		
		gApp = new MovieRecorder(video, document.getElementById('record-trigger'));
	}
	
	function onCaptureFail() {
		
	}
})(window);