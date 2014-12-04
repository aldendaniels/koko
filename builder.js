var browserify = require('browserify');
var stringify  = require('stringify');
var fs         = require('fs');

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
    var inStream = bundler.bundle();
    var outStream = fs.createWriteStream(path);
    inStream.pipe(outStream);
}

if (require.main === module) {
    build(true);
    build(false);
}