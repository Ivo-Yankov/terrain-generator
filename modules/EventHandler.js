const events = require('events');

EventHandler = function () {
    let eventEmitter = new events.EventEmitter(this);
    return eventEmitter;
};

module.exports = EventHandler;