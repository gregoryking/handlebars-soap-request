'use strict';

var moment = require('moment-timezone');
var should = require('should');
var soapRequest = require('../lib/index.js');
var fs = require('fs');

describe('Handlebars Soap Request Helpers', function() {
	
	var requestParams;
  var coreOptions;
	
	beforeEach(function(done) {
    coreOptions = {
      handlebarsTemplate: __dirname + '/spec.helpers.cdata.handlebars',
      handlebarsParams: { someText: 'test data' },
			url: 'http://my/service/endpoint',
      request: function(params, requestCallback) {
        requestParams = params;
				requestCallback(null, 'res', '<?xml version="1.0"?><soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body></soap12:Body></soap12:Envelope>');
      }
    };
		done();
	});

	it('should provide a cdata helper', function(done) {
    coreOptions.handlebarsTemplate = __dirname + '/spec.helpers.cdata.handlebars';
    coreOptions.handlebarsParams = { someText: 'test data' };
		soapRequest(coreOptions, function(err, json) {
      if (err) { return done(err); }
			requestParams.body.indexOf('<doc><![CDATA[test data]]></doc>').should.equal(0);
			done();
		});
	});

	it('should provide an xmldatetime helper', function(done) {
    coreOptions.handlebarsTemplate = __dirname + '/spec.helpers.xmldatetime.handlebars';
    coreOptions.handlebarsParams = { someDateTime: new Date() };
		soapRequest(coreOptions, function(err, json) {
      if (err) { return done(err); }
			requestParams.body.indexOf('<doc>' + moment(coreOptions.handlebarsParams.someDateTime).format('YYYY-MM-DDTHH:mm:ss.SSSZ') + '</doc>').should.equal(0);
			done();
		});
	});

	it('should allow a custom datetime format to be provided to the xmldatetime helper', function(done) {
    coreOptions.handlebarsTemplate = __dirname + '/spec.helpers.xmldatetime.custom.handlebars';
    coreOptions.handlebarsParams = { someDateTime: new Date(), myFormat: 'DD/MM/YYYY' };
		soapRequest(coreOptions, function(err, json) {
      if (err) { return done(err); }
			requestParams.body.indexOf('<doc>' + moment(coreOptions.handlebarsParams.someDateTime).format(coreOptions.handlebarsParams.myFormat) + '</doc>').should.equal(0);
			done();
		});
	});
  
  function getDateTimeOffset(dateTime, tzOffset, targetTz, customFormat) {
		var offsetDateTime = moment(dateTime).tz(targetTz);
		var diff = (offsetDateTime.utcOffset() * -1) - tzOffset;
		return offsetDateTime.add(diff, 'minutes').format(customFormat);
  }

	it('should provide an xmldatetimeoffset helper', function(done) {
    coreOptions.handlebarsTemplate = __dirname + '/spec.helpers.xmldatetime.offset.handlebars';
    coreOptions.handlebarsParams = { someDateTime: new Date() };
		soapRequest(coreOptions, function(err, json) {
      if (err) { return done(err); }
			requestParams.body.indexOf('<doc>' + getDateTimeOffset(coreOptions.handlebarsParams.someDateTime, coreOptions.handlebarsParams.someDateTime.getTimezoneOffset(), 'Australia/Melbourne', 'YYYY-MM-DDTHH:mm:ss.SSSZ') + '</doc>').should.equal(0);
			done();
		});
	});

	it('should allow a source timezone offset to be provided to the xmldatetimeoffset helper', function(done) {
    coreOptions.handlebarsTemplate = __dirname + '/spec.helpers.xmldatetime.offset.sourceTz.handlebars';
    coreOptions.handlebarsParams = { someDateTime: new Date(), sourceTzOffset: new Date().getTimezoneOffset()+10 };
		soapRequest(coreOptions, function(err, json) {
      if (err) { return done(err); }
			requestParams.body.indexOf('<doc>' + getDateTimeOffset(coreOptions.handlebarsParams.someDateTime, coreOptions.handlebarsParams.sourceTzOffset, 'Australia/Melbourne', 'YYYY-MM-DDTHH:mm:ss.SSSZ') + '</doc>').should.equal(0);
			done();
		});
	});

	it('should allow a target timezone to be provided to the xmldatetimeoffset helper', function(done) {
    coreOptions.handlebarsTemplate = __dirname + '/spec.helpers.xmldatetime.offset.targetTz.handlebars';
    coreOptions.handlebarsParams = { someDateTime: new Date(), sourceTzOffset: new Date().getTimezoneOffset()+30, targetTz: 'Australia/Brisbane' };
		soapRequest(coreOptions, function(err, json) {
      if (err) { return done(err); }
			requestParams.body.indexOf('<doc>' + getDateTimeOffset(coreOptions.handlebarsParams.someDateTime, coreOptions.handlebarsParams.sourceTzOffset, coreOptions.handlebarsParams.targetTz, 'YYYY-MM-DDTHH:mm:ss.SSSZ') + '</doc>').should.equal(0);
			done();
		});
	});

	it('should allow a custom datetime format to be provided to the xmldatetimeoffset helper', function(done) {
    coreOptions.handlebarsTemplate = __dirname + '/spec.helpers.xmldatetime.offset.custom.handlebars';
    coreOptions.handlebarsParams = { someDateTime: new Date(), myTzOffset: new Date().getTimezoneOffset()-10, myTargetTz: 'Australia/Brisbane', myFormat: 'DD/MM/YYYY HH:mm:ss' };
		soapRequest(coreOptions, function(err, json) {
      if (err) { return done(err); }
			requestParams.body.indexOf('<doc>' + getDateTimeOffset(coreOptions.handlebarsParams.someDateTime, coreOptions.handlebarsParams.myTzOffset, coreOptions.handlebarsParams.myTargetTz, coreOptions.handlebarsParams.myFormat) + '</doc>').should.equal(0);
			done();
		});
	});

});
