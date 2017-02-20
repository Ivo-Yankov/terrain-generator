var events = require('events');
var Cell = require('./Cell.js');
var Grid = require('./HexGrid.js');
var Generator = require('./TerrainGenerator.js');
var GameServer = require('./GameServer.js');

SocketEventHandler = function(args) {

	var io = args.io;
	var app = args.app;
	var eventEmitter = args.eventEmitter;

	io.on('connection', function(socket) {
		console.log('a user connected');

		io.emit('refresh map list', Object.keys(app.game_servers));

		socket.on('disconnect', function() {
			console.log('user disconnected');
			if (app.game_servers[socket.id]) {
				delete app.game_servers[socket.id];
				io.emit('refresh map list', Object.keys(app.game_servers));
			}
		});

		socket.on('get map list', function(data) {
			io.emit('refresh map list', Object.keys(app.game_servers));
		});

		socket.on('get map', function(data) {
			socket.emit('load map', app.game_servers[data].map_data);
		});

		socket.on('chat message', function(data) {
			io.emit('chat message', {
				msg: data.msg,
				sender: data.name || socket.id
			});
		});

		socket.on('generate map', function(data) {
			console.log('generating map');
			Grid.init();

			Grid.generate({size: data.size || 60});

			Generator({
				grid: Grid,
				seed: data.seed,
				eventEmitter: eventEmitter
			});
		});

		socket.on('update entity', function(data) {
			console.log('update entity');
			if ( app.game_servers[data.server_id] ) {
				app.game_servers[data.server_id].entities[data.id].update(data);
				console.log(data);
				console.log(app.game_servers[data.server_id].entities[data.id].getData());
			}
		});

		socket.on('load entities', function(data) {

			var entities_data = {};
			var server_id = data.server_id || socket.id;
			
			for (var id in app.game_servers[server_id].entities) {
				if ( app.game_servers[server_id].entities.hasOwnProperty(id) ) {
					entities_data[id] = app.game_servers[server_id].entities[id].getData();
				}
			}
			socket.emit('load entities', entities_data);
		});

		socket.on('player joined', function(data) {
			var server_id = data.server_id || socket.id;
			app.game_servers[server_id].addPlayer({
				server_id: server_id
			});
		});

		eventEmitter.on('generation_complete', function(map_data) {
			app.game_servers[socket.id] = new GameServer({
				map_data: map_data,
				eventEmitter: eventEmitter
			});

			map_data.server_id = socket.id;

			app.game_servers[socket.id].init({
				players: [socket.id]
			});

			io.emit('refresh map list', Object.keys(app.game_servers));

			socket.emit('terrain generated', map_data);
		});

		eventEmitter.on('update entity', function(data) {
			io.emit('update entity', data);
		});

		eventEmitter.on('delete entity', function(data) {
			io.emit('delete entity', data.entity_data);
			delete app.game_servers[socket.id].entities[data.id];
		});
	});


}

module.exports = SocketEventHandler;