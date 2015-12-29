'use strict';

var moment = require('moment-timezone');

var DATETIME_FORMAT = 'YYYY-MM-DDTHH:mm:ss.SSSZ';
var DEFAULT_TZ = 'Australia/Melbourne';

module.exports = function(Handlebars) {
  
  Handlebars.registerHelper('cdata', function(str) {
    return (arguments.length > 1) ? '<![CDATA[' + str + ']]>' : null;
  });
  
  Handlebars.registerHelper('xmldatetime', function(dateTime, customFormat) {
    var fmt = (arguments.length > 2) ? customFormat : DATETIME_FORMAT;
    return (dateTime) ? moment(dateTime).format(fmt) : dateTime;
  });
  
  Handlebars.registerHelper('xmldatetimeoffset', function(dateTime, sourceTzOffset, targetTz, customFormat) {
    var tzOffset = (arguments.length > 2) ? parseInt(sourceTzOffset) : dateTime.getTimezoneOffset();
    var tz = (arguments.length > 3) ? targetTz : DEFAULT_TZ;
    var fmt = (arguments.length > 4) ? customFormat : DATETIME_FORMAT;
		var offsetDateTime = moment(dateTime).tz(tz);
		var diff = (offsetDateTime.utcOffset() * -1) - tzOffset;
		return offsetDateTime.add(diff, 'minutes').format(fmt);
  });
  
};