'use strict';

var Handlebars = require('handlebars');
var fs = require('fs');
var request = require('request');
var xml2json = require('basic-xml2json');
var _ = require('lodash');

var defaultOptions = {
  errorLogger: require('./defaultErrorLogger'),
  isExpectedFault: function() { return false; }
};

Handlebars.registerHelper('cdata', function(str) {
	return (str) ? '<![CDATA[' + str + ']]>' : str;
});

module.exports = function(opts, cb) {
  var options = _.merge({}, defaultOptions, opts);
	loadTemplate(options).then(function(template) {
		soapRequest(options, template, cb);
	}, function(err) {
		cb(err);
	});
};

function loadTemplate(options) {
  return new Promise(function(resolve, reject) {
    loadPartials(options.handlebarsPartials || []).then(function() {
      fs.readFile(options.handlebarsTemplate, 'utf8', function(err, source) {
        if (err) { return reject(err); }
        resolve(Handlebars.compile(source));
      });
    }, function(err) {
      reject(err);
    });
  });
}

function loadPartials(partials) {
	var promises = [];
	_.forEach(partials, function(partial) {
		promises.push(new Promise(function(resolve, reject) {
      fs.readFile(partial.filename, 'utf8', function(err, source) {
        if (err) { return reject(err); }
        resolve(Handlebars.registerPartial(partial.name, source));
      });
    }));
	});
	return Promise.all(promises);
}

function soapRequest(options, template, cb) {
  var logger = options.errorLogger.start(options.serviceName || options.url);
	var reqBody = template(options.handlebarsParams || {});
	request({
		url: options.url,
		method: 'POST',
		headers: getHeaders(options),
		body: reqBody
	}, function(err, res, xml) {
		if (err) {
			logger.onError(reqBody, err);
			return cb(err);
		}
    if (options.xmlResponse) {
      return cb(null, xml);
    }
    var json = xml2json.parse(xml);
    if (isError(options, json)) {
      logger.onError(reqBody, xml);
      return cb('Service call failed. See the error log for details');
    }
    cb(null, json);
	});
}

function getHeaders(options) {
  if (options.requestHeaders) { return options.requestHeaders; }
  if (options.soapAction) {
    return { 'SOAPAction': options.soapAction, 'Content-Type': 'text/xml' };
  }
  return { 'Content-Type': 'application/soap+xml; charset=utf-8' };
}

function isError(options, json) {
	return noSoapBody(json) || (isSoapFault(json) && !options.isExpectedFault(json));
}

function noSoapBody(json) {
	return !xml2json.getChildNode(json.root, 'Body');
}

function isSoapFault(json) {
	return xml2json.getChildNode(json.root, ['Body','Fault']);
}


