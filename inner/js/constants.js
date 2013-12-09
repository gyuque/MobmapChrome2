window.ENABLE_MOBMAP_LAZY_LOAD = true;


var kDarkMapStyle = [
	{
		featureType: "all", elementType: "all",
		stylers: [ { saturation: -99 }, { invert_lightness: true }, { lightness: -59 }, { gamma: 1 } ]
	}
];

var kRequiredAttributes = ['id', 'time', 'x', 'y'];

var kDateRegExp = /([0-9]+)[-\/]([0-9]+)[-\/]([0-9]+)/ ;
var kTimeRegExp = /([0-9]+):([0-9]+)(:([0-9]+))?/ ;
var kDefaultDayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];