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

var sp = new SerialPort(portName, {
  baudrate: 57600 //9600
});

var millis = function (d) {
	return parseInt(1000/(d*2)).toString()
}
console.log("millis",20,millis(20))

sp.on("open", function () {
	console.log('open');
	// sp.on('data', function(data) {
	//   console.log('data received: ' + data);
	// });
	// sp.on("close", function () {
	// 	console.log('closed');
	// });
	sp.write(millis(20) + ",1" +"\n", function(err, results) {
	  //console.log('err ' + err);
	  //console.log('results ' + results);
	  sp.close();
	});

});




