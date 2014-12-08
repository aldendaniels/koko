var Mocha           = require('mocha');
var fs              = require('fs');
var path            = require('path');
var webdriverio     = require('webdriverio');
var versionNum      = require('../../package.json').version;
var server          = require('./server');

var browsers = {
    chrome: {
        browserName: 'chrome',
        platform: 'Windows 7'
    },
    firefox: {
        browserName: 'firefox',
        platform: 'Windows 7'
    },
    safari: {
        browserName: 'safari',
        platform: 'OS X 10.6'
    },
    ie6: {
        browserName: 'internet explorer',
        platform: 'Windows XP',
        version: '6'
    },
    ie7: {
        browserName: 'internet explorer',
        platform: 'Windows XP',
        version: '7'
    },
    ie8: {
        browserName: 'internet explorer',
        platform: 'Windows XP',
        version: '8'
    },
    ie9: {
        browserName: 'internet explorer',
        platform: 'Windows 7',
        version: '9'
    },
    ie10: {
        browserName: 'internet explorer',
        platform: 'Windows 7',
        version: '10'
    },
    ie11: {
        browserName: 'internet explorer',
        platform: 'Windows 7',
        version: '11'
    },
    android: {
        browserName: 'android',
        platform: 'Linux',
        version: '4.4'

    },
    ios: {
        browserName: 'iphone',
        platform: 'OS X 10.9',
        version: '8.1'
    }
};

var isMultiRun = false;

function runTests(browserName) {
    // Add tests to mocha.
    var mocha = new Mocha({
        timeout: 60000, // 60 seconds
        useColors: !isMultiRun, // No colors in multi run, as this is saved to disk.
        reporter: 'list'
    });
    var testDir = path.join(__dirname, 'tests');
    fs.readdirSync(testDir).forEach(function(file){
        console.log('Adding test file:', file);
        mocha.addFile(path.join(testDir, file));
    });

    // Create selenium client.
    var capabilities = browsers[browserName];
    capabilities.build = versionNum;
    global.client = webdriverio.remote({
        desiredCapabilities: capabilities,
        host: 'ondemand.saucelabs.com',
        port: 80,
        user: process.env.SAUCE_USERNAME,
        key:  process.env.SAUCE_ACCESS_KEY,
        name: 'Koko E2E Tests',
        logLevel: 'silent'
    });

    // Run tests.
    global.client.init(function() {
        mocha.run(function(failures) {
            global.client.end();
            if (!isMultiRun) {
                server.stop();
            }
            process.on('exit', function () {
                process.exit(failures);
            });
        });
    });
}

// Example usage: "node test-single-browser.js chrome"
if (require.main === module) {
    // Get args
    var args = process.argv.slice(2);
    var browserName = args[0];
    isMultiRun = args.length > 1 && args[1] === 'multi-run';

    // Validate.
    if (!(browserName in browsers)) {
        throw new Error('Unrecognized browser "' + browserName + '". Aborting.');
    }
    if (!process.env.SAUCE_USERNAME || !process.env.SAUCE_ACCESS_KEY) {
        throw new Error('Missing SauceLabs credentials');
    }

    // For single runs, server.
    if (isMultiRun) {
        runTests(browserName);
    } else {
        server.start(function() {
            runTests(browserName);
        });
    }
}