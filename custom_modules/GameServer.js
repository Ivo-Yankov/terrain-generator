var Entity = require('./Entity.js');
var EventHandler = require('./EventHandler.js');
var Grid = require('./HexGrid.js');
var Generator = require('./TerrainGenerator.js');

// args {
//	eventEmitter,
// 	server_id,
// 	seed,
// 	size,
// 	players []
// }

GameServer = function( args ) {
	this.connections = [];
	this.eventEmitter = args.eventEmitter;
	this.entities = {};
	this.server_id = args.server_id;
	this.privateEventEmitter = EventHandler();
	this.seed = args.seed || this.getRandomSeed();
	var self = this;

	Grid.init();
	Grid.generate({size: args.size || 60});

	this.privateEventEmitter.on('map generated', function(map_data) {
		self.map_data = map_data;

		// Add players
		for( player_id in args.players ) {
			if ( args.players.hasOwnProperty(player_id) ) {
				self.addPlayer({
					connection_id: args.players[player_id]
				});
			}
		}

		// TODO:
		// self.GenerateEntities();

		self.eventEmitter.emit('map generated', {
			server_id: self.server_id,
			socket_ids: args.players,
			map_data: map_data,
			entities: self.getEntitiesData(self.server_id)
		});
	});

	Generator({
		grid: Grid,
		seed: this.seed,
		eventEmitter: this.privateEventEmitter
	});

}

GameServer.prototype.getRandomSeed = function() {
	var seed = "";
	var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

	for( var i=0; i < 20; i++ ) {
		seed += possible.charAt(Math.floor(Math.random() * possible.length));
	}

	return seed;
}


GameServer.prototype.addEntity = function( args ) {
	var player_entity = new Entity({
		type: 'player',
		eventEmitter: this.eventEmitter,
		belongs_to: args.belongs_to
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
	this.connections.push(args.connection_id);
	var new_entity = this.addEntity({
		belongs_to: args.connection_id
	});
}

GameServer.prototype.updateEntity = function( args ) {
	this.entities[args.entity_id].update(args);
}


GameServer.prototype.getEntitiesData = function( player_id ) {
	var entities_data = {};

	for (var id in this.entities) {
		if ( this.entities.hasOwnProperty(id) ) {
			entities_data[id] = this.entities[id].getData();
			if (player_id == entities_data[id].belongs_to && entities_data[id].type == 'player') {
				entities_data[id].controllable = true;
			}
		}
	}

	return entities_data;
}

module.exports = GameServer;