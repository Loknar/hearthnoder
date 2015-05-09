var fs = require('fs');
var path = require('path');

var getAllFilesSync = function(dir) {
    var results = [];
    var list = fs.readdirSync(dir)
    list.forEach(function(file) {
        file = path.join(dir,file);
        var stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(getAllFilesSync(file));
        }
        else {
            results.push(file)
        }
    });
    return results;
}

module.exports = {
    'getAllFilesSync': getAllFilesSync
}