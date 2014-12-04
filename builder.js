var browserify     = require('browserify');
var stringify      = require('stringify');
var CombinedStream = require('combined-stream');
var ReadableStream = require('stream').Readable;
var fs             = require('fs');

var version = require('./package.json').version;
var licenseComment = [
    '/*!',
    '* Koko JavaScript library v' + version,
    '* (c) OneSpot, Inc. - http://onespot.com/',
    '* License: MIT (http://www.opensource.org/licenses/mit-license.php)',
    '*/'
].join('\n') + '\n';

function build(debug) {
    // Create bundler.
    var bundler = browserify({
        entries: './src/koko.js',
        debug: debug
    });

    // Import HTML files as strings using stringify
    bundler.transform({ global: true }, stringify(['.html']));
    if (!debug) {
        bundler.transform({ global: true }, 'uglifyify')
    }

    // Bundle!
    var path = (debug ? './build/koko.debug.js' : './build/koko.min.js');
    var sourceStream = bundler.bundle();

    // Create license stream.
    var licenseStream = new ReadableStream();
    licenseStream.push(licenseComment);
    licenseStream.push(null); // End of file

    // Output.
    var combinedStream = CombinedStream.create();
    combinedStream.append(licenseStream);
    combinedStream.append(sourceStream);

    var outStream = fs.createWriteStream(path);
    combinedStream.pipe(outStream);
}

if (require.main === module) {
    build(true);
    build(false);
}