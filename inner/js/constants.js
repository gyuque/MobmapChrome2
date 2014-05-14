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
var kDefaultMonthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
var kDefaultShortMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

var AttributeNamePattern = /^[a-zA-Z0-9][-_a-zA-Z0-9]*$/ ;
var AttributeType = {
	STRING:  0,
	FLOAT:   1,
	CFLOAT:  2,
	INTEGER: 3
};

var AnnotationItemType = {
	GATE: 1
};

var GateDirection = {
	Forward      : 1,
	Back         : 2,
	Bidirectional: 3
};

var kMarkerCompositionNormal = 0;
var kMarkerCompositionAdd    = 1;