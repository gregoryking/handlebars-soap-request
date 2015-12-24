'use strict';

function defaultErrorLogger(serviceName) {
  var st = Date.now();
  return {
    onError: function(req, res) {
      console.log('serviceName: %s, duration: %d returned an error:\nrequest:\n%s\nresponse:\n%s', serviceName, (Date.now() - st), req, res);
    }
  };
}

module.exports = defaultErrorLogger;
