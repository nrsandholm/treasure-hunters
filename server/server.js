const WebSocket = require('ws');

const wss = new WebSocket.Server({
  port: 8080,
});

wss.on('connection', function connection(ws) {
  console.log('New connection');

  ws.isAlive = true;

  ws.on('message', function incoming(message) {
    console.log('New message', message);
    ws.isAlive = true;

    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        console.log('Sending to client');
        client.send(message);
      }
    });
  });
});

// Client connection terminated if no activity
const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) {
      console.log('Terminating connection');
      return ws.terminate();
    }

    ws.isAlive = false;
  });
}, 60000);

wss.on('close', function close() {
  clearInterval(interval);
});