if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	function LocalFilePicker() {
		this.inputElement = this.generateFileInput();
		this.jInputElement = $(this.inputElement);
		document.body.appendChild(this.inputElement);
	}
	
	LocalFilePicker.prototype = {
		generateFileInput: function() {
			var input = $H('input');
			input.type = 'file';
			input.style.display = 'none';
			return input;
		},
		
		open: function() {
			this.jInputElement.click();
		}
	};

	// +++ Export +++
	aGlobal.mobmap.LocalFilePicker = LocalFilePicker;
})(window);