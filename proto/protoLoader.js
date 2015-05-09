var path = require('path');

var protobuf = require('protobufjs');


var filelister = require('./filelister');

// load proto definition files
var protoFiles = filelister.getAllFilesSync('proto');
protoFiles = protoFiles.filter(function(i){return path.extname(i)=='.proto'});
for(i=0;i<protoFiles.length;i++) protoFiles[i] = protoFiles[i].replace('proto/', '');
console.log(protoFiles);

var protoRoot = __dirname;
console.log(protoRoot);

var builder = protobuf.protoFromFile({
    'file': protoFiles[0],
    'root': protoRoot
});

for(i=1;i<protoFiles.length;i++) {
    protobuf.protoFromFile({
        'file': protoFiles[i],
        'root': protoRoot
    }, builder);
}

var root = builder.build();

var decoderByID = {};

Object.keys(root).forEach(function(key1) {
	var val1 = root[key1];
	Object.keys(val1).forEach(function(key2) {
		var val2 = val1[key2];
        if(typeof val2['PacketID'] !== 'undefined') {
            if(typeof val2['PacketID']['ID'] === 'number') {
                decoderByID[val2['PacketID']['ID']] = {
                    'name': key1+', '+key2,
                    'decode': val2['decode']
                }
            }
        }
	});
});

module.exports = {
    'root': root,
    'decoderByID': decoderByID
}
