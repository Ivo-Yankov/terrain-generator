var seedrandom = require('seedrandom');

Entity = function ( args ) {

	this.eventEmitter = args.eventEmitter;

	this.id = Date.now() + '' + Math.floor(Math.random()*10000);
	this.type = args.type;
	this.belongs_to = args.belongs_to;
	this.controllable = false;
	this.actions = [];

	this.position = {
		q: 0,
		r: 0,
		s: 0
	};
	return this;
},

Entity.prototype.spawn = function( args ) {
	this.update();
},

Entity.prototype.setPosition = function( pos ) {
	this.position.q = pos.q || 0;
	this.position.r = pos.r || 0;
	this.position.s = pos.s || 0;
},

Entity.prototype.update = function( args ) {
	console.log('updating entity');
	if (args) {
		if (args.position) {
			console.log(args.position);
			this.setPosition(args.position);
		}

		if (args.actions) {

			//TODO maybe this needs to be reversed? look into it more
			this.actions = args.actions;
		}
	}
	
	this.eventEmitter.emit('update entity', this.getData());
},

Entity.prototype.delete = function() {
	this.eventEmitter.emit('delete entity', {entity_data: this.getData(), id: id});
},

Entity.prototype.getData = function( flush ) {
	var actions = this.actions.slice(0);
	console.log('ACTIONS:');
	console.log(actions);

	return {
		id: this.id,
		type: this.type,
		position: this.position,
		belongs_to: this.belongs_to,
		actions: actions
	}
};

Entity.prototype.flushActions = function() {
	this.actions = [];
}

module.exports = Entity;