const {refreshMapList, getPlayerSocket, getSocketsByServer} = require('../../helpers/SocketHelpers');

const mapGenerated = (data) => {
    console.log('map generated');
    // data = {
    // 	server_id,
    // 	socket_ids,
    // 	map_data,
    // 	entities,
    // }

    // Send all to client
    for (let i in data.socket_ids) {
        if (data.socket_ids.hasOwnProperty(i)) {
            let socket = getPlayerSocket(data.socket_ids[i]);
            socket.emit('load map data', data);
        }
    }

    // Update clients with map list
    refreshMapList();
};

module.exports = {mapGenerated};