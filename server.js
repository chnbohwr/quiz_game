#!/bin/env node

const path = require('path');
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

// require game main file.
const gameSocket = require('./server_src/socket.js');

// get port from env setting
const port = process.env.PORT || 8080;

// create express app
const app = express();
const server = http.Server(app);

// create socket io server
const io = socketIO(server);

// set static folder
app.use('/', express.static(path.join(__dirname, 'web_src')));

// run http server
server.listen(port, () => {
  // start game socket server
  gameSocket(io);
  console.log(`Server start on port ${port}`);
});
