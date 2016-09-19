var util = require('util');
var Emitter = require('events').EventEmitter;
var error = require('./error');
var lb = require('./cluster/lb');


var currReq = null;


/** 
 * watcher is the watch class
 * @param {Object} client is the watch service connection client.
 */
var watcher = function (client) {
  
  var self = this;

  self.watchConn = client.connector.watch[lb.getEndPoint()].watch();

  this.create = function (watchRequest) {
    if (typeof watchRequest !== 'object') {
      return;
    }

    currReq = watchRequest;
    self.watchConn.write(watchRequest);
  };

  this.cancel = function (watchId) {
    var cancelRequest = {};

    if (typeof watchId !== 'string') {
      return;
    }

    cancelRequest.watch_id = watchId;

    self.watchConn.write({cancel_request: cancelRequest});
  }

  this.watchConn.on('data', function(response) {
    if (response.created === true) {
      self.emit('created', currReq.create_request, response.watch_id);
      return;
    }

    if (response.canceled === true) {
      self.emit('canceled', response.watch_id);
      return;
    }

    if (response.events.length !== 0) {
      var res = {
        id: response.watch_id,
        events: response.events
      };

      self.emit('events', res);
      return;
    }
  });

  this.watchConn.on('end', function () {
    currReq = null;
  });

  this.watchConn.on('status', function (status) {
    //TODO status processor
  })

  this.close = function (message) {
    self.watchConn.end(message);
  };
};


util.inherits(watcher, Emitter);

/** export the watcher class */
exports.Watcher = watcher;
