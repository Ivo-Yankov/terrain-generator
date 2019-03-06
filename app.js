const express = require('express');
const fs = require('fs');
const app = require('express')();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const EventHandler = require('./modules/EventHandler.js');

global.app = app;
global.io = io;

const SocketHandler = require('./modules/SocketEventHandler.js');
const PORT = process.env.PORT || 3000;

app.game_servers = {};
 
app.get('/', (req, res) => {
	fs.readFile('./public/index.html', 'utf8', function(err, text) {
		res.send(text);
	});
});

app.use(express.static('public'));

SocketHandler({
	eventEmitter: EventHandler()
});
 
server.listen(PORT);