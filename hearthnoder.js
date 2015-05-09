var fs = require("fs");
var util = require('util');
var path = require('path');

var protobuf = require('protobufjs');
var moment = require('moment');

var Cap = require('cap').Cap;
var decoders = require('cap').decoders;
var PROTOCOL = decoders.PROTOCOL;

var c = new Cap();
var device = "en1"; // Cap.findDevice('localhost'),
var filter = '(tcp or udp) and ((dst port 1119 or dst port 3724) or (src port 1119 or src port 3724))';
var bufSize = 10 * 1024 * 1024;
var buffer = new Buffer(65535);
var linkType = c.open(device, filter, bufSize, buffer);
c.setMinBytes && c.setMinBytes(0);

var protoReader = require('./proto/protoLoader');

var blacklist = [
    '12.129.242.24',   // iir.blizzard.com
    '12.129.236.214',  // test.patch.battle.net
    '12.129.206.133',  // us.patch.battle.net
    '213.248.127.133', // eu.patch.battle.net
    '12.129.206.130',  // us.logon.battle.net
    '213.248.127.130', // eu.logon.battle.net
    '12.130.244.193',  // us.actual.battle.net
    '80.239.208.193',  // eu.actual.battle.net
    '87.248.207.183',  // eu.depot.battle.net
    '12.129.222.51',   // us.tracker.worldofwarcraft.com
    '195.12.234.51',   // eu.tracker.worldofwarcraft.com
    '67.215.65.132',   // tracker.worldofwarcraft.com
]

// Usage:  result = ip_blacklisted(ip,blacklist)
// Before: ip is a string holding ip address, blacklist is a list of strings
//         holding ip addresses
// After:  result is true if ip is in blacklist
var ip_blacklisted = function(ip, blacklist) {
    return blacklist.indexOf(ip) != -1;
}

console.log('Listening to tcp traffic on '+device+'.');
console.log('Press ctrl+c to quit.')

var timestamp_instance = moment().format('YYYY-MM-DDTHH-mm-ss');

var packetLogger = require('./packetLogger');
var logger = packetLogger.createLogFile('Dump', util.format('log_%s.txt', timestamp_instance));

c.on('packet', function(nbytes, trunc) {
    if(linkType === 'ETHERNET') {
        var ret = decoders.Ethernet(buffer);
        if(ret.info.type === PROTOCOL.ETHERNET.IPV4) {
            //console.log('Decoding IPv4 ...');
            ret = decoders.IPV4(buffer, ret.offset);
            var srcaddr = ret.info.srcaddr;
            var dstaddr = ret.info.dstaddr;

            // ignoring packets from blacklisted ip addresses
            if(!ip_blacklisted(srcaddr, blacklist) && !ip_blacklisted(dstaddr, blacklist)) {
                if(ret.info.protocol === PROTOCOL.IP.TCP) {
                    //console.log('Decoding TCP ...');
                    ret = decoders.TCP(buffer, ret.offset);
    
                    // number of bytes in the package containing actual data
                    var datalen = nbytes - ret.offset;
    
                    var srcport = ret.info.srcport;
                    var dstport = ret.info.dstport;
    
                    // ignoring packets with zero data
                    if(datalen > 0) {
                        // cut the data we want out of our oversized master buffer
                        var packet_data = buffer.slice(ret.offset, ret.offset + datalen);
                        
                        // print packet info to terminal, set to false to disable
                        var verbose = true;

                        var packet_timestamp = new Date().getTime();
                        var packet_data_object = {
                            'srcaddr': srcaddr,
                            'dstaddr': dstaddr,
                            'srcport': srcport,
                            'dstport': dstport,
                            'packets': packet_data,
                            'timestamp': packet_timestamp,
                            'timestamp_human': moment(packet_timestamp).format('YYYY-MM-DD HH:mm:ss')
                        }
                        packetLogger.logPacket(logger, packet_data_object, verbose);

                        var temp_logger = packetLogger.createLogFile(path.join('Dump', util.format('log_%s', timestamp_instance)), util.format('packet_%s.json', packet_timestamp));
                        temp_logger.write(JSON.stringify(packet_data_object));
                        temp_logger.end();
                    }
                } 
                else if(ret.info.protocol === PROTOCOL.IP.UDP) {
                    console.log('Detected UDP package ...');
                    ret = decoders.UDP(buffer, ret.offset);
                    console.log(' from port: ' + ret.info.srcport + ' to port: ' + ret.info.dstport);
                } 
                else {
                    console.log('Unsupported IPv4 protocol: ' + PROTOCOL.IP[ret.info.protocol]);
                }
            }
        } 
        else {
            console.log('Unsupported Ethernet type: ' + PROTOCOL.ETHERNET[ret.info.type]);
        }
    }
});

// register exit handlers in case we want to do some cleanup sometime
function exitHandler(options, err) {
    if (options.cleanup) {
        logger.end();
        console.log('\nShutting down.');
    }
    if (err) console.log(err.stack);
    if (options.exit) process.exit();
}

// do something when app is closing
process.on('exit',exitHandler.bind(null,{cleanup:true}));

// catch ctrl+c event
process.on('SIGINT',exitHandler.bind(null,{exit:true}));

// catch uncaught exceptions
process.on('uncaughtException',exitHandler.bind(null,{exit:true}));
