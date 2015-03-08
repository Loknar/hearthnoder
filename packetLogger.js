var fs = require('fs');
var util = require('util');
var path = require('path');

var moment = require('moment');

// Usage:  result = asciify_buffer(data_buffer)
// Before: data_buffer is a buffer
// After:  result is a string that gives us an idea of what ascii
//         character data is in the buffer
var asciify_buffer = function(data_buffer) {
    var gap = false;
    var start = 0;
    var end = data_buffer.length;
    var array = JSON.parse(JSON.stringify(data_buffer));
    var result = '';
    for(i = start; i < end; i++) {
        if(32 <= array[i] && array[i] < 127) {
            result = result + String.fromCharCode(array[i]);
        }
        else {
            result = result + '.';
        }
    }
    return result;
}

// Usage:  str = zeroPadding(num, n)
// Before: num is number or string, n is number
// After:  str is the num with a prefix of zeros
//         so the length of the str is n
// Example: 
// > zeroPadding(14, 7)
// '0000014'
var zeroPadding = function(num, n) {
    var s = num + '';
    while (s.length < n) s = '0' + s;
    return s;
}

// Usage:  logger = createLogFile(folder, file)
// Before: folder and file are strings
// After:  logger is a WriteStream
// Example:
// logger = createLogFile('Dump','log_timestamp.txt'); // open WriteStream
// logger.write('hello log\n'); // write to logger
// logger.end(); // close WriteStream
var createLogFile = function(folder, name) {
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder);
        fs.chmodSync(folder, '755');
    }
    fs.closeSync(fs.openSync(path.join(folder, name), 'w'));
    fs.chmodSync(path.join(folder, name), '755');
    return fs.createWriteStream(path.join(folder, name), {'flags': 'a'});
}

/*
Usage example:
logPacket(logger, {
    'srcaddr': srcaddr,
    'dstaddr': dstaddr,
    'srcport': srcport,
    'dstport': dstport,
    'packets': packet_data,
    'timestamp': timestamp
});
*/
var logPacket = function(logger, p, verbose) {
    if (typeof verbose === 'undefined') verbose = false;
    var log = '';
    log += util.format('%s, %s\n', p.timestamp_human, p.timestamp);
    log += util.format('%s:%s -> %s:%s\n', p.srcaddr, p.srcport, p.dstaddr, p.dstport);
    log += '--------------------------------------------------------------\n';
    var a = 0;
    var b = 16;
    var line_number = 0;
    while(a < p.packets.length) {
        log += util.format('%s: ', zeroPadding(line_number, 3));
        var buffer_line = p.packets.slice(a,b);
        for(i=0;i<buffer_line.length;i++) {
            log += zeroPadding(buffer_line[i].toString(16), 2);
            if(i != 0 && i%2 != 0) log += ' ';
        }
        if(buffer_line.length < 16) {
            for(k = buffer_line.length;k<16;k++) {
                log += '  '
                if(k%2 != 0) log += ' ';
            }
        }
        log += util.format(' %s\n', asciify_buffer(buffer_line));
        line_number += 1;
        a += 16;
        b += 16;
    }
    log += '--------------------------------------------------------------\n';
    log += '\n';
    if(verbose) console.log(log);
    logger.write(log);
}

module.exports = {
    'createLogFile': createLogFile,
    'logPacket': logPacket
}
