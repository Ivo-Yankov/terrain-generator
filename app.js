var express = require('express');
var fs = require('fs');
var app = require('express')();
var server = require('http').createServer(app);
var io = require('socket.io')(server);

var Cell = require('./custom_modules/ServerCell.js');
var Grid = require('./custom_modules/ServerHexGrid.js');
var Generator = require('./custom_modules/TerrainGenerator.js');
var url = require('url');
// var bodyParser = require('body-parser')

// app.use(bodyParser.urlencoded({ extended: false })); 

app.current_maps = [];

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
});

server.listen(3000);