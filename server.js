#!/bin/env node
 //  OpenShift sample Node application
var express = require('express');
var fs = require('fs');
var app = require('express')();
var server = require('http').Server(app);
//open shift only allow websocket in port 8000
var io = require('socket.io')(server);
var gameSocket = require('./server_src/socket.js');

/**
 *  Define the sample application.
 */
var SampleApp = function () {

    //  Scope.
    var self = this;


    /*  ================================================================  */
    /*  Helper functions.                                                 */
    /*  ================================================================  */

    /**
     *  Set up server IP address and port # using env variables/defaults.
     */
    self.setupVariables = function () {
        self.port = process.env.PORT || 8080;
    };


    /**
     *  terminator === the termination handler
     *  Terminate server on receipt of the specified signal.
     *  @param {string} sig  Signal to terminate on.
     */
    self.terminator = function (sig) {
        if (typeof sig === "string") {
            console.log('%s: Received %s - terminating sample app ...',
                Date(Date.now()), sig);
            process.exit(1);
        }
        console.log('%s: Node server stopped.', Date(Date.now()));
    };

    /**
     *  Setup termination handlers (for exit and a list of signals).
     */
    self.setupTerminationHandlers = function () {
        //  Process on exit and signals.
        process.on('exit', function () {
            self.terminator();
        });

        // Removed 'SIGPIPE' from the list - bugz 852598.
        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
         'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function (element, index, array) {
            process.on(element, function () {
                self.terminator(element);
            });
        });
    };


    /**
     *  Initialize the server (express) and create the routes and register
     *  the handlers.
     */
    self.initializeServer = function () {
        app.use('/', express.static(__dirname + '/web_src/'));
    };

    self.initializeSocket = function () {
        gameSocket(io);
    };
    
    /**
     *  Initializes the sample application.
     */
    self.initialize = function () {
        self.setupVariables();
        self.setupTerminationHandlers();
        // Create the express server and routes.
        self.initializeServer();
        self.initializeSocket();
    };


    /**
     *  Start the server (starts up the sample application).
     */
    self.start = function () {
        //  Start the app on the specific interface (and port).
        server.listen(self.port, function () {
            console.log(`Server start on port ${self.port}`);
        });
    };

}; /*  Sample Application.  */



/**
 *  main():  Main code.
 */
var zapp = new SampleApp();
zapp.initialize();
zapp.start();