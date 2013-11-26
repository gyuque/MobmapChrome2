(function(aGlobal) {
	'use strict';

	var testTextureImage = null;
	var gmap = null;
	var gllayer = null;
	var mapContainerElement = null;
	
	
	function doGLMapTest() {
		testTextureImage = new Image();
		testTextureImage.onload = setupScreen;
		
		testTextureImage.src = TEST_IMAGE;
	}
	
	function setupScreen() {
		var box = document.getElementById("map-box");
		mapContainerElement = box;
		
		setupGoogleMaps(box);
	}
	
	function setupGoogleMaps(containerElement) {
		var mapOptions = {
			zoom: 11,
			center: new google.maps.LatLng(35.8, 139.6),
			mapTypeId: google.maps.MapTypeId.ROADMAP
		};

		gmap = new google.maps.Map(containerElement, mapOptions);
		
		// ----------------------------------------------
		
		gllayer = new mobmap.GLMobLayer();
		gllayer.canvasReadyCallback = function() {
			gllayer.setMarkerImage(testTextureImage);
		};
		
		gllayer.setMap(gmap);
	}

	var TEST_IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAAXNSR0IArs4c6QAAAAZiS0dEAP8A/wD/oL2nkwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9wGCggvCSwGskEAAAAZdEVYdENvbW1lbnQAQ3JlYXRlZCB3aXRoIEdJTVBXgQ4XAAADXUlEQVRo3u2ZTY8bRRCGn6oez3jG2ayJVijJBQhSpCgS3PgznJC48Iu4IHHiD3FB4RAJKdKGVdjsxrHny13FwR6ygUsyu7PakH5ulmVPV1d3vTX1Cm+hAMjw0QEwrgjZP2P//4b/84zRZG+vXkERRQR33C6s3i6/ekUUzUAQx7dgmOF+BZsCENAZzCCAgkGEHushXjIGgQwt0IrsgCxHO+w12zXbFttifukMBLSAORRIvg/AO2jRBmuHGMavviTcp/ycxV3KEt0Qn1P/weaYegOjY8hAQdAZzKEiLCBHAh6hI64B1LFuXBJ2J6dA71N+zeEjlp+yyAkd8YR6ySnwjI3jcdRZyvbbzwwKwgKpNARUMbOYESBG6KEfnQFFF2SfUT1i+SV3FlIphdEeeAGc0b+k6/A4Kslhn2EpkAVSaTajPOLWPUQlNm7AFjpki9uImiGQo0fMH7N8yCd35PZDvvqCb26Rr+TU2b6i+5PmNb2Nqki78yND/QmoMl/e+/kX5ktUkTBUp4vX/b0eIILMkBLNCUpxyAP74ftDHijFnKxEc0Te1O73DsAxBwPDI2Y0Z8fffUtzhhke91+N1QTDHe/xDbEjGu05T/XHn855arQN2xrrcB+rB9mwrIh30FnMtH5Be4qZxQgd3kHEbLTmRFjRP6c+YX3gxe/yq/LEaNe+OaE+ZrOij4OujbsDjsj+eIi44eZuPTTENTTQ4RF83B1g+GWAgCixo1lRP2P1Gy+fsPqLtsdsbAYMFOvRGocY/60DNFgHcZyQORjeYsfUu5pzl7Ii1Ngxm50OtFgcm97/KnE2iMMkSrwgO2CWIx2+or+8Ess79EJ2Vb1QQBQNQy8UwbB4Fb3QB9yNvmNgiUQikUgkEolE4iNCPtCFTvtGNgXX5w9MmoHJpxLTEd5MDDSHCipkgZRIsXc6hGGs6zczgN18N4cKqQgHSIWWSI5m+7mB+DD78Jt5BwZ/QCfxB6bOwLT+wNRM7g9cQxVSyNEKOURva1ZQHjFf0pxRv7Bti73Cz2FzoRzduCMkSICAZu6ZxIbujH5tMUKDbaDF+gs2x40LYPAH/Or9gWsIwEFwR4DdzHiLd/hu75tL+gPXr8STOPXX08xN6w+kbvR/+j6QSCQSiUQikUgkPl7+BsHFz4TN8INZAAAAAElFTkSuQmCC";
	aGlobal.doGLMapTest = doGLMapTest;
})(window);