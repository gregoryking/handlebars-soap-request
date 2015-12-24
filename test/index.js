'use strict';

var should = require('should');
var rewire = require('rewire');
var soapRequest = rewire('../lib/index.js');
var xml2json = require('basic-xml2json');
var fs = require('fs');

describe('Handlebars Soap Request', function() {
	
	var requestParams;
	var responseErr;
	var responseXml;
  var mocks;
	var revert;
	
	beforeEach(function(done) {
    responseErr = null;
    responseXml = '<?xml version="1.0"?><soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body></soap12:Body></soap12:Envelope>';
    mocks = {
      request: function(params, cb) {
				requestParams = params;
				cb(responseErr, 'res', responseXml);
      }
    };
		revert = soapRequest.__set__(mocks);
		done();
	});

	afterEach(function(done) {
		revert();
		done();
	});

	it('should request the specified url', function(done) {
		var url = 'http://my/service/endpoint';
		soapRequest({
			handlebarsTemplate: __dirname + '/spec.handlebars',
			url: url
		}, function(err, json) {
      if (err) { return done(err); }
			requestParams.url.should.equal(url);
			done();
		});
	});

	it('should create the request body from the handlebars template using the handlebars params', function(done) {
		var params = { test: 'this is a test' };
		soapRequest({
			handlebarsTemplate: __dirname + '/spec.handlebars',
			handlebarsParams: params,
			url: 'http://my/service/endpoint'
		}, function(err, json) {
      if (err) { return done(err); }
			requestParams.body.should.equal(params.test);
			done();
		});
	});

	it('should register partial Handlebars templates', function(done) {
		var params = { 
      name: 'A & A Smash Repairs', 
      postalAddress: { suburb: 'Maroubra', state: 'NSW', postcode: '2035' },
      billingAddress: { suburb: 'Sydney', state: 'NSW', postcode: '2000' }
    };
		soapRequest({
			url: 'http://my/service/endpoint',
			handlebarsTemplate: __dirname + '/spec.soap.handlebars',
      handlebarsPartials: [
        { name: 'address', filename: __dirname + '/spec.address.handlebars' }
      ],
			handlebarsParams: params
		}, function(err, json) {
      if (err) { return done(err); }
      var reqJson = xml2json.parse(requestParams.body);
      xml2json.getContent(reqJson.root, ['Body','name']).should.equal(params.name);
      var addresses = xml2json.getChildNodes(reqJson.root, ['Body','address']);
      addresses.length.should.equal(2);
      xml2json.getContent(addresses[0], 'type').should.equal('postal');
      xml2json.getContent(addresses[0], 'suburb').should.equal(params.postalAddress.suburb);
      xml2json.getContent(addresses[0], 'postcode').should.equal(params.postalAddress.postcode);
      xml2json.getContent(addresses[1], 'type').should.equal('billing');
      xml2json.getContent(addresses[1], 'suburb').should.equal(params.billingAddress.suburb);
      xml2json.getContent(addresses[1], 'postcode').should.equal(params.billingAddress.postcode);
			done();
		});
	});

	it('should use soap12 headers by default', function(done) {
		soapRequest({
			handlebarsTemplate: __dirname + '/spec.handlebars',
			url: 'http://my/service/endpoint'
		}, function(err, json) {
      if (err) { return done(err); }
			requestParams.headers['Content-Type'].should.equal('application/soap+xml; charset=utf-8');
			done();
		});
	});

	it('should allow soap11 headers to be specified', function(done) {
		soapRequest({
			handlebarsTemplate: __dirname + '/spec.handlebars',
			url: 'http://my/service/endpoint',
			soapAction: 'OldStyleService'
		}, function(err, json) {
      if (err) { return done(err); }
			requestParams.headers['SOAPAction'].should.equal('OldStyleService');
			requestParams.headers['Content-Type'].should.equal('text/xml');
			done();
		});
	});

	it('should allow custom headers to be specified', function(done) {
		var customHeader = { 'custom': 'abc' };
		soapRequest({
			handlebarsTemplate: __dirname + '/spec.handlebars',
			url: 'http://my/service/endpoint',
			requestHeaders: customHeader
		}, function(err, json) {
      if (err) { return done(err); }
			requestParams.headers['custom'].should.equal('abc');
			done();
		});
	});

	it('should parse the soap body xml into JSON', function(done) {
		soapRequest({
			handlebarsTemplate: __dirname + '/spec.handlebars',
			url: 'http://my/service/endpoint'
		}, function(err, json) {
      if (err) { return done(err); }
			json.root.name.should.equal('Envelope');
			done();
		});
	});

	it('should return the soap body xml when requested', function(done) {
		soapRequest({
			handlebarsTemplate: __dirname + '/spec.handlebars',
			url: 'http://my/service/endpoint',
      xmlResponse: true
		}, function(err, xml) {
      if (err) { return done(err); }
			xml.should.equal(responseXml);
			done();
		});
	});

	it('should allow an error logger to be specified', function(done) {
    fs.readFile(__dirname + '/spec.soap.fault.xml', 'utf8', function(err, xml) {
      if (err) { return done(err); }
      responseXml = xml;

      var serviceName, requestBody, responseErr;
      var errorLogger = {
        start: function(name) {
          serviceName = name;
          return {
            onError: function(req, res) {
              requestBody = req;
              responseErr = res;
            }
          };
        }
      };
      
      soapRequest({
        handlebarsTemplate: __dirname + '/spec.handlebars',
        url: 'http://my/service/endpoint',
        handlebarsParams: { test: 'Error Test' },
        errorLogger: errorLogger
      }, function(err, json) {
        err.should.equal('Service call failed. See the error log for details');
        serviceName.should.equal('http://my/service/endpoint');
        requestBody.should.equal('Error Test');
        responseErr.should.equal(xml);
        done();
      });
    });
	});

	it('should allow the serviceName to be specified for error logging', function(done) {
    var serviceName;
    var errorLogger = {
      start: function(name) {
        serviceName = name;
        return {
          onError: function() {}
        };
      }
    };
		soapRequest({
			handlebarsTemplate: __dirname + '/spec.handlebars',
			url: 'http://my/service/endpoint',
      serviceName: 'mySpecialName',
      errorLogger: errorLogger
		}, function(err, json) {
      serviceName.should.equal('mySpecialName');
			done();
		});
	});

	it('should callback with any error found', function(done) {
		responseErr = 'failed';
		soapRequest({
			handlebarsTemplate: __dirname + '/spec.handlebars',
      handlebarsParams: { test: 'Trying to fail' },
			url: 'http://my/service/endpoint'
		}, function(err, json) {
			err.should.equal('failed');
			done();
		});
	});

	it('should allow expected SOAP Faults to recognised and not reported as errors', function(done) {
    fs.readFile(__dirname + '/spec.soap.fault.xml', 'utf8', function(err, xml) {
      if (err) { return done(err); }
      responseXml = xml;
      
      function isExpectedFault(json) {
        return xml2json.getChildNode(json.root, ['Body','Fault','Detail','MyServiceException']);
      }
      
      soapRequest({
        handlebarsTemplate: __dirname + '/spec.handlebars',
        url: 'http://my/service/endpoint',
        isExpectedFault: isExpectedFault
      }, function(err, json) {
        should(err).equal(null);
        done();
      });
    });
	});
});
