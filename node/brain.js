var app = require('http').createServer(handler)
var io = require('socket.io')(app);
var fs = require('fs');
//ls /dev | grep usb
// int millis = 1000.0/(freq*2);
// string message = ofToString(millis)+','+ofToString(alt)+'\n';
// https://github.com/voodootikigod/node-serialport

var portName = "";
var serialport = require("serialport");
var SerialPort = serialport.SerialPort;

serialport.list(function (err, ports) {
  ports.forEach(function(port) {
    if(port.manufacturer == "Arduino LLC") {
      portName = port.comName;
      console.log("found Arduino on ", portName);
    }
  });
});

portName = "/dev/tty.usbmodem1a21";
// todo: convert the found portname to /dev/...

var dir='../data/';
var sp = new SerialPort(portName, {
  baudrate: 57600 //9600
});

var millis = function (d) {
  return parseInt(1000/(d*2)).toString()
}

console.log("millis",20,millis(20));

app.listen(8080);

function handler (req, res) {
  fs.readFile(__dirname + '/brain.html',
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading html');
    }

    res.writeHead(200);
    res.end(data);
  });
}

sp.on("open", function () {
  console.log('open');

  io.on('connection', function (socket) {
    socket.emit('init', { hello: 'world' });

    // sp.on("close", function () {
    //  console.log('serial closed');
    // });
    

    socket.on('change', function (data) {
       console.log("socket change", data)
       
       sp.write(millis(data.freq) + "," + data.alt +"\n", function(err, results) {
         console.log("serial changed",results)
       });
    });

    socket.on('listTracks', function (fn) {
      fs.readdir(dir,function(err,files){
          if (err) throw err;
          fn(files);
      });
    });

    socket.on('getTrack', function (file,fn) {
      fs.readFile(dir+file,'utf-8',function(err,raw){
        if (err) throw err;
        fn(JSON.parse(raw))
      });
    });

    socket.on('saveTrack', function (name,raw,fn) {
      fs.writeFile(dir+name, JSON.stringify(raw), function(err) {
          if (err) throw err;
          console.log("saveTrack",name,raw)
          fn(name);
      }); 
    });

    socket.on('stop', function () {
       console.log("socket stop")
       //todo stop brainmachine
       sp.write(millis(0) + "," + 0 +"\n", function(err, results) {
         console.log("serial 0",results)
       });
    });

  });



});
