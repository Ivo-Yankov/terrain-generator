const Entity = require('./Entity.js');
const EventHandler = require('./EventHandler.js');
const Grid = require('./HexGrid.js');
const Generator = require('./TerrainGenerator.js');
const {randomBetween} = require('../helpers/MathOperations');

// args {
//	eventEmitter,
// 	server_id,
// 	seed,
// 	size,
// 	players []
// }

const defaultEntities = {
    rock: 10,
    coin: 100
};

GameServer = function (args) {
    this.connections = [];
    this.eventEmitter = args.eventEmitter;
    this.entities = {};
    this.size = args.size || 60
    this.server_id = args.server_id;
    this.privateEventEmitter = EventHandler();
    this.seed = args.seed || this.getRandomSeed();
    let self = this;

    Grid.init();
    Grid.generate({size: this.size});

    this.privateEventEmitter.on('map generated', (map_data) => {
        self.map_data = map_data;

        // Add players
        for (player_id in args.players) {
            if (args.players.hasOwnProperty(player_id)) {
                self.addPlayer({
                    connection_id: args.players[player_id]
                });
            }
        }

        // TODO:
        self.GenerateEntities();

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
};

GameServer.prototype.getRandomSeed = () => {
    let seed = "";
    let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (let i = 0; i < 20; i++) {
        seed += possible.charAt(Math.floor(randomBetween(0, possible.length)));
    }

    return seed;
};


GameServer.prototype.addEntity = function (args) {
    let player_entity = new Entity({
        type: args.type,
        eventEmitter: this.eventEmitter,
        belongs_to: args.belongs_to,
        position: args.position
    });

    this.entities[player_entity.id] = player_entity;

    return player_entity;
};

GameServer.prototype.GenerateEntities = function (entities = {}) {
    entities = Object.assign({}, defaultEntities, entities);

    // get possible entity tiles
    let nonWaterCells = this.map_data.grid.filter( cell => cell.type !== 'water');
    for (let type in entities) {
        let count = entities[type] || 0;
        for (let i = 0; i < count; i++) {

            let randCell = Math.floor(randomBetween(0, nonWaterCells.length));
            let randPosition = {
                q: nonWaterCells[randCell].q,
                r: nonWaterCells[randCell].r,
                s: nonWaterCells[randCell].s,
            };

            this.addEntity({
                belongs_to: null,
                type: type,
                position: randPosition
            })
        }
    }
};

GameServer.prototype.removeEntity = function (entity_id) {
    delete this.entities[entity_id];
};

GameServer.prototype.removePlayerEntities = function (player_socket_id) {
    for (let id in this.entities) {
        if (this.entities.hasOwnProperty(id)) {
            delete this.entities[id];
        }
    }
};

GameServer.prototype.getEntities = function (player_socket_id) {
    if (!player_socket_id) {
        return this.entities;
    } else {
        let all_entities = {};
        for (let id in this.entities) {
            if (this.entities.hasOwnProperty(id) && this.entities[id].belongs_to === player_socket_id) {
                all_entities[id] = this.entities[id];
            }
        }
        return all_entities;
    }
};

GameServer.prototype.addPlayer = function (args) {
    this.connections.push(args.connection_id);
    let new_entity = this.addEntity({
        type: 'player',
        belongs_to: args.connection_id
    });
};

GameServer.prototype.updateEntity = function (args) {
    this.entities[args.entity_id].update(args);
};


GameServer.prototype.getEntitiesData = function (player_id) {
    let entities_data = {};

    for (let id in this.entities) {
        if (this.entities.hasOwnProperty(id)) {
            entities_data[id] = this.entities[id].getData();
            if (player_id === entities_data[id].belongs_to && entities_data[id].type === 'player') {
                entities_data[id].controllable = true;
            }
        }
    }

    return entities_data;
};

module.exports = GameServer;