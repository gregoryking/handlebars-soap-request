'use strict';

var should = require('should');
var soapRequest = require('../lib/index.js');
var xml2json = require('basic-xml2json');
var fs = require('fs');

describe('Handlebars Soap Request', function() {

	var requestParams;
	var responseErr;
	var responseXml;
  var coreOptions;

	beforeEach(function(done) {
    responseErr = null;
    responseXml = '<?xml version="1.0"?><soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body></soap12:Body></soap12:Envelope>';
    coreOptions = {
      handlebarsTemplate: __dirname + '/spec.handlebars',
			url: 'http://my/service/endpoint',
      request: function(params, requestCallback) {
				requestParams = params;
				requestCallback(responseErr, 'res', responseXml);
      }
    };
		done();
	});

	it('should request the specified url', function(done) {
		soapRequest(coreOptions, function(err, json) {
      if (err) { return done(err); }
			requestParams.url.should.equal(coreOptions.url);
			done();
		});
	});

	it('should create the request body from the handlebars template using the handlebars params', function(done) {
    coreOptions.handlebarsParams = { test: 'this is a test' };
		soapRequest(coreOptions, function(err, json) {
      if (err) { return done(err); }
			requestParams.body.should.equal(coreOptions.handlebarsParams.test);
			done();
		});
	});

	it('should register partial Handlebars templates', function(done) {
    coreOptions.handlebarsTemplate = __dirname + '/spec.soap.handlebars';
		coreOptions.handlebarsParams = {
      name: 'A & A Smash Repairs',
      postalAddress: { suburb: 'Maroubra', state: 'NSW', postcode: '2035' },
      billingAddress: { suburb: 'Sydney', state: 'NSW', postcode: '2000' }
    };
    coreOptions.handlebarsPartials = [
      { name: 'address', filename: __dirname + '/spec.address.handlebars' }
    ];
		soapRequest(coreOptions, function(err, json) {
      if (err) { return done(err); }
      var reqJson = xml2json.parse(requestParams.body);
      xml2json.getContent(reqJson.root, ['Body','name']).should.equal(coreOptions.handlebarsParams.name);
      var addresses = xml2json.getChildNodes(reqJson.root, ['Body','address']);
      addresses.length.should.equal(2);
      xml2json.getContent(addresses[0], 'type').should.equal('postal');
      xml2json.getContent(addresses[0], 'suburb').should.equal(coreOptions.handlebarsParams.postalAddress.suburb);
      xml2json.getContent(addresses[0], 'postcode').should.equal(coreOptions.handlebarsParams.postalAddress.postcode);
      xml2json.getContent(addresses[1], 'type').should.equal('billing');
      xml2json.getContent(addresses[1], 'suburb').should.equal(coreOptions.handlebarsParams.billingAddress.suburb);
      xml2json.getContent(addresses[1], 'postcode').should.equal(coreOptions.handlebarsParams.billingAddress.postcode);
			done();
		});
	});

	it('should use soap12 headers by default', function(done) {
		soapRequest(coreOptions, function(err, json) {
      if (err) { return done(err); }
			requestParams.headers['Content-Type'].should.equal('application/soap+xml; charset=utf-8');
			done();
		});
	});

	it('should allow soap11 headers to be specified', function(done) {
    coreOptions.soapAction = 'OldStyleService';
		soapRequest(coreOptions, function(err, json) {
      if (err) { return done(err); }
			requestParams.headers['SOAPAction'].should.equal(coreOptions.soapAction);
			requestParams.headers['Content-Type'].should.equal('text/xml');
			done();
		});
	});

	it('should allow custom headers to be specified', function(done) {
		coreOptions.requestHeaders = { 'custom': 'abc' };
		soapRequest(coreOptions, function(err, json) {
      if (err) { return done(err); }
			requestParams.headers['custom'].should.equal('abc');
			done();
		});
	});

	it('should parse the soap body xml into JSON', function(done) {
		soapRequest(coreOptions, function(err, json) {
      if (err) { return done(err); }
			json.root.name.should.equal('Envelope');
			done();
		});
	});

	it('should return the soap body xml when requested', function(done) {
    coreOptions.xmlResponse = true;
		soapRequest(coreOptions, function(err, xml) {
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
      coreOptions.errorLogger = function(name) {
        serviceName = name;
        return {
          onError: function(req, res) {
            requestBody = req;
            responseErr = res;
          }
        };
      };
      coreOptions.handlebarsParams = { test: 'Error Test' };

      soapRequest(coreOptions, function(err, json) {
        err.should.equal('Service call failed. See the error log for details');
        serviceName.should.equal(coreOptions.url);
        requestBody.should.equal(coreOptions.handlebarsParams.test);
        responseErr.should.equal(xml);
        done();
      });
    });
	});

	it('should allow the serviceName to be specified for error logging', function(done) {
    var serviceName;
    coreOptions.errorLogger = function(name) {
      serviceName = name;
      return {
        onError: function() {}
      };
    };
    coreOptions.serviceName = 'mySpecialName';
		soapRequest(coreOptions, function(err, json) {
      serviceName.should.equal(coreOptions.serviceName);
			done();
		});
	});

	it('should callback with any error found', function(done) {
		responseErr = 'failed';
		soapRequest(coreOptions, function(err, json) {
			err.should.equal('failed');
			done();
		});
	});

	it('should allow expected SOAP Faults to recognised and not reported as errors', function(done) {
    fs.readFile(__dirname + '/spec.soap.fault.xml', 'utf8', function(err, xml) {
      if (err) { return done(err); }
      responseXml = xml;

      coreOptions.isExpectedFault = function(json) {
        return !!xml2json.getChildNode(json.root, ['Body','Fault','Detail','MyServiceException']);
      };

      soapRequest(coreOptions, function(err, json) {
        should(err).equal(null);
        done();
      });
    });
	});

	it('should allow a stub request implementation to be specified to facilitate local development', function(done) {
    var reqParams;
    coreOptions.request = function(params, requestCallback) {
      reqParams = params;
      requestCallback(null, null, responseXml);
    };
		soapRequest(coreOptions, function(err, json) {
      if (err) { return done(err); }
			reqParams.url.should.equal(coreOptions.url);
      reqParams.method.should.equal('POST');
			done();
		});
	});

});
