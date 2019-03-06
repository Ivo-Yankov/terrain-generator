const app = global.app;
const io = global.io;

const refreshMapList = () => {
    io.emit('refresh map list', Object.keys(app.game_servers));
};

const getPlayerSocket = (player_id) => {
    return io.sockets.connected[player_id];
};

const getSocketsByServer = (server_id) => {
    let sockets = [];
    for (let i in io.sockets.connected) {
        if (io.sockets.connected.hasOwnProperty(i) && io.sockets.connected[i].server_id === server_id) {
            sockets.push(io.sockets.connected[i]);
        }
    }
    return sockets;
};

module.exports = {refreshMapList, getPlayerSocket, getSocketsByServer};