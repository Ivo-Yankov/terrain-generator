var Entity = require('./Entity.js');

GameServer = function( args ) {
	this.map_data = args.map_data;
	this.eventEmitter = args.eventEmitter;
	this.entities = {};
}

GameServer.prototype.addEntity = function( args ) {
	var belongs_to = args.server_id;
	var player_entity = new Entity({
		type: 'player',
		eventEmitter: this.eventEmitter,
		belongs_to: belongs_to
	});

	this.entities[player_entity.id] = player_entity;

	return player_entity;
}

GameServer.prototype.removeEntity = function( entity_id ) {
	delete this.entities[entity_id];
}

GameServer.prototype.removePlayerEntities = function( player_socket_id ) {
	for(id in this.entities) {
		if (this.entities.hasOwnProperty(id)) {
			delete this.entities[id];
		}
	}
}

GameServer.prototype.getEntities = function( player_socket_id ) {
	if (!player_socket_id) {
		return this.entities;
	}
	else {
		var all_entities = {};
		for(id in this.entities) {
			if (this.entities.hasOwnProperty(id) && this.entities[id].belongs_to == player_socket_id) {
				all_entities[id] = this.entities[id];
			}
		}
		return all_entities;
	}
}

GameServer.prototype.addPlayer = function( args ) {
	console.log('adding player');
	console.log(args);
	var new_entity = this.addEntity({
		server_id: args.server_id
	});
}

GameServer.prototype.init = function( args ) {
	console.log('game server init');
	console.log(args);
	var self = this;
	for( player_id in args.players ) {
		if ( args.players.hasOwnProperty(player_id) ) {
			self.addPlayer(args.players[player_id]);
		}
	}
}

GameServer.prototype.updateEntity = function( args ) {
	this.entities[args.entity_id].update(args);
}

module.exports = GameServer;