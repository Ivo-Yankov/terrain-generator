var Cell = require('./Cell.js');
var Grid = require('./HexGrid.js');
var TerrainGenerator = require('./TerrainGenerator.js');
var seedrandom = require('seedrandom');
var events = require('events');

Entity = function ( args ) {
	this.id = Date.now() + '' + Math.floor(Math.random()*10000);
	this.type = args.type;
	this.io = args.io;
	this.socket = args.socket;
	this.app = args.app;

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
	position.q = pos.q || 0;
	position.r = pos.r || 0;
	position.s = pos.s || 0;
},

Entity.prototype.update = function( args ) {
	if (args && args.position) {
		setPosition(args.position);
	}
	
	this.io.emit('update entity', this.getData());
},

Entity.prototype.delete = function() {
	this.io.emit('delete entity', this.getData());
	delete app.entities[id];
},

Entity.prototype.getData = function() {
	return {
		id: this.id,
		type: this.type,
		position: this.position
	}
};

module.exports = Entity;