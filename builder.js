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

function build(minify, addSourceMap) {
    // Create bundler.
    var bundler = browserify({
        entries: './src/koko.js',
        debug: addSourceMap,
        standalone: 'koko'
    });

    // Import HTML files as strings using stringify.
    bundler.transform({ global: true }, stringify(['.html']));
    if (minify) {
        bundler.transform({ global: true }, 'uglifyify');
    }

    // Bundle code.
    var postfix = '';
    if (minify) {
        postfix = '.min';
    } else if (addSourceMap) {
        postfix = '.debug';
    }
    var path = './build/koko' + postfix + '.js';
    var sourceStream = bundler.bundle();

    // Create license stream.
    var licenseStream = new ReadableStream();
    licenseStream.push(licenseComment);
    licenseStream.push(null); // End of file

    // Prepend license stream.
    var combinedStream = CombinedStream.create();
    combinedStream.append(licenseStream);
    combinedStream.append(sourceStream);

    // Write to disk!
    var outStream = fs.createWriteStream(path);
    combinedStream.pipe(outStream);
}

if (require.main === module) {
    build(false, false); // Default (non-minified w/out source maps)
    build(false, true);  // Debug (non-minified with source maps)
    build(true, false);  // Production (minified)
}