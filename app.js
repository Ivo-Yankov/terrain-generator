var express = require('express');
var fs = require('fs');
var app = require('express')();
var server = require('http').createServer(app);
var io = require('socket.io')(server);

var Cell = require('./custom_modules/Cell.js');
var Grid = require('./custom_modules/HexGrid.js');
var Generator = require('./custom_modules/TerrainGenerator.js');
var Entity = require('./custom_modules/Entity.js');
var url = require('url');

app.current_maps = [];
app.entities = {};

var dist = 'dist';
var src = 'src';
 
app.get('/', function (req, res) {
	fs.readFile('./public/index.html', 'utf8', function(err, text) {
		res.send(text);
	});
});

app.use(express.static('public'));
 
io.on('connection', function(socket) {
	console.log('a user connected');
	var player_entity = new Entity({
		type: 'player',
		app: app,
		socket: socket,
		io: io
	});

	app.entities[player_entity.id] = player_entity;

	io.emit('refresh map list', Object.keys(app.current_maps));

	socket.on('disconnect', function() {
		console.log('user disconnected');
		if (app.current_maps[socket.id]) {
			delete app.current_maps[socket.id];
			io.emit('refresh map list', Object.keys(app.current_maps));
		}
	});

	socket.on('get map list', function(data) {
		io.emit('refresh map list', Object.keys(app.current_maps));
	});

	socket.on('get map', function(data) {
		socket.emit('load map', app.current_maps[data]);
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

		//TODO: maybe it is not a good idea to pass all of those vars
		Generator({
			grid: Grid,
			seed: data.seed,
			socket: socket,
			io: io,
			app: app
		});
	});

	socket.on('update entity', function(data) {
		console.log('update entity');
		console.log(data);
		if ( app.entities[data.id] ) {
			app.entities[data.id].update.call(app.entities[data.id], data.id);
		}
	});

	socket.on('load entities', function(data) {
		console.log('load entity');

		var entities_data = {};
		for (var id in app.entities) {
			// console.log(id);
			if ( app.entities.hasOwnProperty(id) ) {
				 entities_data[id] = app.entities[id].getData();
			}
		}		
		// console.log(entities_data);

		socket.emit('load entities', entities_data);
	});
});

server.listen(3000);