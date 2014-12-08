var server       = require('./server');
var utils        = require('./utils');
var childProcess = require('child_process');
var fs           = require('fs');
var path         = require('path');
var colors       = require('colors'); // jshint ignore:line

var browsers = [
    'chrome',
    'firefox',
     'safari',
     'ie6',
     'ie7',
     'ie8',
     'ie9',
     'ie10',
     'ie11',
     'android',
     'ios'
];

var success = true;
var numTestsComplete = 0;

function onAllTestsDone() {
    server.stop();
    process.on('exit', function () {
        console.log('');
        if (success) {
            console.log('COMPLETED SUCCESSFULLY'.green);
        } else {
            console.log('COMPLETED WITH ERRORS'.red);
            process.exit(1);
        }
    });
}

function onTestDone(browserName, code) {
    if (code === 0) {
        console.log(('done: ' + browserName + ' - success').green);
    } else {
        console.log(('done: ' + browserName + ' - errors').red);
        success = false;
    }
    numTestsComplete++;
    if (numTestsComplete === browsers.length) {
        onAllTestsDone();
    }
}

function runTest(browserName) {
    // Log brower being tested.
    console.log('start:', browserName);

    // Run test in child process.
    var childPath = path.join(__dirname, 'test-single-browser.js');
    var childArgs = [browserName, 'multi-run'];
    var childOpts = {silent: true};
    var testProcess = childProcess.fork(childPath, childArgs, childOpts);

    // Write output to log file.
    var logPath = path.join(__dirname, 'logs', browserName + '.txt');
    var testLogStream = fs.createWriteStream(logPath);
    testProcess.stdout.pipe(testLogStream);
    testProcess.stderr.pipe(testLogStream);

    // Fail if any tested browsers failed.
    testProcess.on('close', function(code) {
        onTestDone(browserName, code);
    });
}

function runTests() {
    console.log('');
    console.log('RUNNING TESTS:'.gray);
    console.log('');
    for (var i in browsers) {
        runTest(browsers[i]);
    }
    console.log('');
}

if (require.main === module) {
    var logsDirPath = path.join(__dirname, 'logs');
    utils.makeDirIfNotExistsSync(logsDirPath);
    utils.emptyDirSync(logsDirPath);
    server.start(runTests);
}
