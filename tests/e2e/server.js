var colors               = require('colors'); // jshint ignore:line
var sauceConnectLauncher = require('sauce-connect-launcher');
var express              = require('express');
var path                 = require('path');

var server;
var sauceConnectProcess;

function onSauceConnect(err, sauceConnectProcess_, readyCallback) {
    // Handle errors.
    if (err) {
        console.log('SAUCE CONNECT ERROR:', err.message);
        console.log('Aborting.');
        process.exit(1);
    }

    // Save sauce connect process (for cleanup).
    sauceConnectProcess = sauceConnectProcess_;

    // Yay!
    console.log("Sauce Connect ready");

    // Serve static fiels
    var staticDir = path.join(__dirname, 'scenario');
    var app = express();
    app.get(/^[^.]+$/, function(req, res) {
        res.sendFile(path.join(staticDir, 'index.html'));
    });
    app.use(express.static(staticDir));
    var port = 8081;
    server = app.listen(port, readyCallback);
    console.log('Listening on port ' + port);
}

function start(readyCallback) {
    console.log('');
    console.log('CONNECTING TO SAUCELABS:'.gray);
    console.log('');
    var options = {
        port: 4445,
        username: process.env.SAUCE_USERNAME,
        accessKey:  process.env.SAUCE_ACCESS_KEY,
        verbose: true
    };
    sauceConnectLauncher(options, function(err, sauceConnectProcess_) {
        onSauceConnect(err, sauceConnectProcess_, readyCallback);
    });
}

function stop() {
    console.log('');
    console.log('DISCONNECTING FROM SAUCELABS:'.gray);
    console.log('');
    server.close();
    sauceConnectProcess.close(function () {
        console.log("Closed Sauce Connect process");
    });
}

module.exports = {
    start: start,
    stop: stop
};