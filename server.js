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

app.get('/hello', (req, res) => res.send({ hi: 'there' }));

// set static folder
if (process.env.NODE_ENV !== 'production') {
  const webpackMiddleware = require('webpack-dev-middleware');
  const webpack = require('webpack');
  const webpackConfig = require('./webpack.config.dev');
  app.use(webpackMiddleware(webpack(webpackConfig)));
} else {
  app.use(express.static('dist'));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist/index.html'));
  });
}
// app.use('/', express.static(path.join(__dirname, 'web_src')));



const server = http.Server(app);

// create socket io server
const io = socketIO(server);


// run http server
server.listen(port, () => {
  // start game socket server
  gameSocket(io);
  console.log(`Server start on port ${port}`);
});
