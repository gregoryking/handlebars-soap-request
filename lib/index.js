'use strict';

var Handlebars = require('handlebars');
var fs = require('fs');
// var xml2json = require('basic-xml2json');
var _ = require('lodash');
var parseString = require('xml2js').parseString;
var stripPrefix = require('xml2js').processors.stripPrefix;

require('./helpers')(Handlebars);

var defaultOptions = {
  request: require('request'),
  errorLogger: require('./defaultErrorLogger'),
  isExpectedFault: function() { return false; }
};

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
  console.log('greg version3');
  var logger = options.errorLogger(options.serviceName || options.url);
	var reqBody = template(options.handlebarsParams || {});
	options.request({
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


    xml2json(xml).then(function(response) {
      cb(null, response);
    }, function(error) {
      console.error("Failed!", error);
      return cb('Service call failed. See the error log for details');
    })
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
	return null;//!xml2json.getChildNode(json.root, 'Body');
}

function isSoapFault(json) {
	return null;//xml2json.getChildNode(json.root, ['Body','Fault']);
}

// Wrap parseString in Promise
function xml2json(xml) {
    return new Promise((resolve, reject) => {
        parseString(  xml,
                      {tagNameProcessors: [stripPrefix]},
                      function (err, json) {
                        if (err)
                            reject(err);
                        else
                            resolve(json);
                    });
    });
}
