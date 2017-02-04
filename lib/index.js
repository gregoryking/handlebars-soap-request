'use strict';

var Handlebars = require('handlebars');
var fs = require('fs');
// var xml2json = require('basic-xml2json');
var xml2js = require('xml2js');
var stripPrefix = require('xml2js').processors.stripPrefix;
var _ = require('lodash');

require('./helpers')(Handlebars);

var defaultOptions = {
  request: require('request'),
  errorLogger: require('./defaultErrorLogger'),
  xmlParseSettings: {'explicitArray': false, 'ignoreAttrs': true, 'tagNameProcessors': [stripPrefix], 'valueProcessors': [xml2js.processors.parseNumbers]},
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
    var json;
  //   var json = xml2json.parse(xml);
  //   if (isError(options, json)) {
  //     logger.onError(reqBody, xml);
  //     return cb('Service call failed. See the error log for details');
  //   }
  //   cb(null, json);
  // });
    xml2json(xml, options).then(function(response) {
      // if (!(response.Envelope && response.Envelope.Body)) {
      //   return cb(new Error('Failed to recieve soap message'));
      // }
      // res.jayson = response.Envelope.Body;
      json = response;
      if (isError(options, json)) {
        logger.onError(reqBody, xml);
        return cb('Service call failed. See the error log for details');
      }
      return cb(null, json);
    }, function(error) {
        logger.onError(reqBody, xml);
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
  try {
    if(json.Envelope.Body) return false;
  }
  catch(err) {
    return true;
  }
	// return !json.Envelope.Body !xml2json.getChildNode(json.root, 'Body');
}

function isSoapFault(json) {
  try {
    if(json.Envelope.Body.Fault) return true;
  }
  catch(err) {
    return false;
  }
	// return xml2json.getChildNode(json.root, ['Body','Fault']);
}

// Wrap parseString in Promise
function xml2json(xml, options) {
    return new Promise((resolve, reject) => {
      var parser = new xml2js.Parser(options.xmlParseSettings);
        parser.parseString(  xml,
                      function (err, json) {
                        if (err)
                            reject(err);
                        else
                            resolve(json);
                    });
    });
}
