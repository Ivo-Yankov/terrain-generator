const events = require('events');
const GameServer = require('./GameServer.js');
const {refreshMapList, getPlayerSocket, getSocketsByServer} = require('../helpers/SocketHelpers');
const {
    receiveChatMessage,
    closeUserConnection,
    receiveNewServerRequest,
    receiveJoinServerRequest,
    receiveEntityAction
} = require('./EventControllers/External');
const {mapGenerated} = require('./EventControllers/Internal');

SocketEventHandler = function (args) {
    let eventEmitter = args.eventEmitter;

    eventEmitter.on('map generated', mapGenerated);

    io.on('connection', (socket) => {
        console.log('a user has connected');

        refreshMapList();

        socket.on('chat message', receiveChatMessage.bind(socket));

        socket.on('disconnect', closeUserConnection.bind(socket));

        socket.on('create server', receiveNewServerRequest.bind(socket, eventEmitter));

        socket.on('join server', receiveJoinServerRequest.bind(socket));

        socket.on('entity action', receiveEntityAction.bind(socket));
    });
};

module.exports = SocketEventHandler;