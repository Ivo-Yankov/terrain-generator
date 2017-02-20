var events = require('events');

EventHandler = function() {
	var eventEmitter = new events.EventEmitter(this);
	return eventEmitter;
}

module.exports = EventHandler;