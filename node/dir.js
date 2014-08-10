var fs=require('fs');

var dir='../data/';
var data={};

fs.readdir(dir,function(err,files){
    if (err) throw err;
    var c=0;
    files.forEach(function(file){
        c++;
        fs.readFile(dir+file,'utf-8',function(err,raw){
            if (err) throw err;
            data[file]= JSON.parse(raw);
            if (0===--c) {
                console.log(data);  //socket.emit('init', {data: data});
            }
        });
    });
});