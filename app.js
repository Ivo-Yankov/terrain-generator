var express = require('express');
var fs = require('fs');
var app = require('express')();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var EventHandler = require('./custom_modules/EventHandler.js');

var SocketHandler = require('./custom_modules/SocketEventHandler.js');

var dist = 'dist';
var src = 'src';
var PORT = process.env.PORT || 3000;

app.game_servers = {};
 
app.get('/', function (req, res) {
	fs.readFile('./public/index.html', 'utf8', function(err, text) {
		res.send(text);
	});
});

app.use(express.static('public'));

SocketHandler({
	io: io,
	app: app,
	eventEmitter: EventHandler() 
});
 
server.listen(PORT);