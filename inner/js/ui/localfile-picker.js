if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	function LocalFilePicker(callback) {
		this.callback = callback || null;
		this.inputElement = this.generateFileInput();
		this.jInputElement = $(this.inputElement);
		document.body.appendChild(this.inputElement);
		
		this.jInputElement.change( this.onFileChange.bind(this) );
	}
	
	LocalFilePicker.prototype = {
		generateFileInput: function() {
			var input = $H('input');
			input.type = 'file';
			input.style.display = 'none';
			return input;
		},
		
		reset: function() {
			this.inputElement.value = null;
		},
		
		open: function() {
			this.jInputElement.click();
		},
		
		onFileChange: function() {
			var fileList = this.inputElement.files;
			var anySelected = (fileList.length > 0);
			
			var targetFile = null;
			if (anySelected) {
				targetFile = fileList[0];
			}
			
			if (this.callback) {
				this.callback(targetFile);
			}
		}
	};

	// +++ Export +++
	aGlobal.mobmap.LocalFilePicker = LocalFilePicker;
})(window);