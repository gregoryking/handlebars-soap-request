# handlebars-soap-request
SOAP/XML request using a Handlebars template.

This code only exists because I needed to handle a bunch of varied SOAP/XML service responses (some with namespaces, some without, soap11, soap12, etc...) and had to fall back to basics to get it working consistently.

Generate a sample service request using [SoapUI](http://www.soapui.org/) or something similar and then make a [Handlebars](http://handlebarsjs.com/) template from it.

## Example usage

	var soapRequest = require('handlebars-soap-request'); 
	
	var options = {
		handlebarsTemplate: '/path/to/my/template/file',
		handlebarsParams: jsonParams,
		url: 'http://my/service/endpoint'
	};
	
	soapRequest(options, function(err, response) {
		
	});

#### Default behaviour
*	Sends a soap12 request. 

	Specify a soapAction (see options below) to send a soap11 request.

*	Returns a JSON response using the [basic-xml2json](https://www.npmjs.com/package/basic-xml2json) parser to parse the SOAP/XML.

	If you don't want any XML parsing, set options.xmlResponse = true (see options below).
	
*	Registers a "cdata"	Handlebars helper that wraps the text with <![CDATA[ ... ]]>. You can use it something like this:

		<name>{{{cdata name}}}</name>

###### soapRequest:options
*	url

	Mandatory. String. The service endpoint url.
	
*	handlebarsTemplate

	Mandatory. String. The path to the Handlebars template file.
	
*	handlebarsParams

	Optional. Object. The JSON data to be provided to the Handlebars template
	
*	handlebarsPartials

	Optional. Array of { name: 'nameForPartial', filename: 'path/to/partial' }.
	
	Partial template files are loaded and registered under the specified name.
	
*	soapAction

	Optional. String. If specified, a soap11 request will be sent. The SOAPAction header will contain the value specified here.
	
*	requestHeaders

	Optional. Object. If specified, will be used in place of the default soap12 or soap11 headers.
	
*	xmlResponse

	Optional. Boolean. If true, the response will be the unaltered SOAP/XML body from the service.
	
*	errorLogger

	Optional. Function. The default error logging behaviour is to console.log the details. To override this you need to specify your own errorLogger like this:
	
		//The errorLogger function will be called before the service is invoked so that any initial setup can be done
		var myErrorLogger = function(serviceName) {
			var st = Date.now(); //E.g. We may want to remember the current time so we can log the duration of the failed service call
			return {
				//The onError function is only called if an error is returned by the service (including unexpected SOAP Faults). This is where the error logging should happen
				onError: function(soapReq, errorResponse) {
					var duration = Date.now() - st;
				}
			};
		};
	
		var options = {
			handlebarsTemplate: '/path/to/my/template/file',
			handlebarsParams: jsonParams,
			url: 'http://my/service/endpoint',
			errorLogger: myErrorLogger
		};
	
*	serviceName

	Optional. String. If provided, will be passed to the start method of the error logger as the serviceName used to identify the service being invoked. If not provided, the url will be passed to the error logger instead.
	
*	isExpectedFault

	Optional. Function returning a boolean. If you need to recognise certain SOAP Faults as expected behaviour (not errors) then you can provide your own isExpectedFault function. Here is an example:
	
		function isExpectedFault(json) {
			return !!xml2json.getChildNode(json.root, ['Body','Fault','Detail','SomeExpectedException']);
		}
	
		var options = {
			handlebarsTemplate: '/path/to/my/template/file',
			url: 'http://my/service/endpoint',
			isExpectedFault: isExpectedFault
		};
	