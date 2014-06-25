window.nacl264Ready = false;
(function() {
	var container = document.getElementById('nacl-container');
	container.addEventListener('load', function(){
		window.nacl264Ready = true;
		console.log("nacl264Ready");
	}, true);
})();