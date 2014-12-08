var fs = require('fs');
var path = require('path');

function emptyDirSync(dir) {
    if (fs.existsSync(dir)) {
        fs.readdirSync(dir).forEach(function(file) {
            var curPath = path.join(dir, file);
            if(fs.statSync(curPath).isDirectory()) {
                self.emptyDirSync(curPath); // Recurse.
                fs.rmdirSync(curPath); // Delete dir.
            } else {
                fs.unlinkSync(curPath); // Delete file.
            }
        });
    }
}

module.exports = {
    emptyDirSync: emptyDirSync
};
