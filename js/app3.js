var SoundGenerator = function () {
	var self = this;

	var context;

	if (typeof webkitAudioContext !== "undefined") {
	    context = new webkitAudioContext();
	} else if (typeof AudioContext !== "undefined") {
	    context = new AudioContext();
	} else {
	    throw new Error('AudioContext not supported. :(');
	}

	var leftSine = context.createOscillator();
	var rightSine = context.createOscillator();

	var volumeNode = context.createGain();
	var merger = context.createChannelMerger(2);


	volumeNode.gain.value = 0.8;
	volumeNode.connect(context.destination);

	merger.connect(volumeNode);

	leftSine.connect(merger, 0, 0);
	leftSine.type = 0;
	leftSine.frequency.value = 0;
	leftSine.start(0);

	rightSine.connect(merger, 0, 1 );
	rightSine.type = 0;
	rightSine.frequency.value = 0;
	rightSine.start(0);

	self.base = 200;
	self.binaural = 14.4;
	self.leftSine = leftSine;


	self.setFreq = function() {
		console.log("setting freq to", self.base, self.binaural)

	    rightSine.frequency.value = self.base - self.binaural/2;
	    leftSine.frequency.value = self.base + self.binaural/2;

	    // try {
	    // 	leftSine.noteOn && leftSine.noteOn(0);
	    // 	rightSine.noteOn && rightSine.noteOn(0);
	    // } catch(e){
	    // 	//console.log(e.message)
	    // 	console.log("note Error");
	    // }  
	};

	self.stop = function  () {
		// try {
		// 	leftSine.noteOff && leftSine.noteOff(0);
		// 	rightSine.noteOff && rightSine.noteOff(0);
		// } catch(e){
		// 	//console.log(e.message)
		// }
		rightSine.frequency.value = 0;
		leftSine.frequency.value = 0;
		socket.emit('change', { freq: 0, alt:0 });
	}

	self.setBinaural = function (binaural) {
		self.binaural = binaural;
		self.setFreq();
	}

	self.setBase = function (base) {
		self.base = base;
		self.setFreq();
	}

	self.setVolume = function (vol) {
		console.log("setting sound", vol)
		volumeNode.gain.value = vol;
	}

	return self;

}

var TrackPlayer = function (soundGenerator,socket) {
	var self = this;

	self.socket = socket;
	self.freqs = { b: 14.4, a: 11.1, t: 6, d: 2.2, g: 40.4 };
	self.track = [{ freq: "a" , time: 1000 }, { freq: "b" , time: 1000 }, { freq: "t" , time: 1000 }];
	self.position = 0;
	self.timer = null;

	self.loadTrack = function (url, callback) {
		$.getJSON( url, function( data ) {
			console.log("loadTrack", data)

			self.track = data;
			callback();
			//self.play();
		})
	}

	self.new = function (callback) {
		self.track = [];
		callback();
	}

	self.timeTotal = function  () {
		return self.track.reduce(function(prev, cur){
		  return { time: prev.time + cur.time };
		}).time;

	}

	self.timeAt = function (i) {
		return self.track.slice(0,i+1).reduce(function(prev, cur){
		  return { time: prev.time + cur.time };
		}).time - self.track[i].time;

	}

	self.start = function() {
		if(!self.running) self.play();
	}

	self.stop = function() {
		soundGenerator.stop();
		clearTimeout(self.timer);
		self.position = 0;
		self.running = false;
	}

	self.finished = function () {
		console.log("finished")
		self.stop();
	}

	self.setTimer = function (time) {
		// console.log("setTimeout")
		
		self.timer = setTimeout(function() {
			self.position++;
			self.play();
		},time*1000)
		
	}
	self.getBinauralFreq = function (name) {
		return self.freqs[name];
	}

	self.play = function () {
		if(self.position<self.track.length){
			self.running = true;
			console.log("play pos", self.position)

			var slot = self.track[self.position];
			var binaural = slot.freq;
			
			socket.emit('change', { freq: binaural, alt:0 });

			soundGenerator.setBinaural(binaural);
			self.setTimer(slot.time);
		} else {
			self.finished();
			socket.emit('stop');
		}
	}

	return self;
};

var TrackEditor = function (trackPlayer) {
	var self = this;

	self.track = trackPlayer.track;
	
	var margin = {top: 40, right: 20, bottom: 80, left: 80},
	    width = window.innerWidth-40 - margin.left - margin.right,
	    height = window.innerHeight-20 - margin.top - margin.bottom;

  var x = d3.scale.sqrt()
  	.range([0, width])
  	.domain([2,45])

  var y = d3.scale.linear()
  	.domain([0,60])
  	.range([0,height])

	var zoom = d3.behavior.zoom()
	    .scaleExtent([0, 5])
			.yExtent([0,1000])
	    .y(y)
	    .on("zoom", zoomed)
	    // .on("zoomstart", zoomstart)
	    // .on("zoomend", zoomend)
	    // .size([width,height])

	var svg = d3.select("#editor").append("svg")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)
	  .append("g")
	    .attr("class", "graph")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
	    .call(zoom);

	var formatCount = d3.format(",.0f"),
	    formatTime = d3.time.format("%M:%S"),
	    formatMinutes = function(d) { return formatTime(new Date(2012, 0, 1, 0, 0,d)); };

	var svgMouse = svg
		.append("g")
		.append("rect")
		.attr("width", width)
		.attr("height", height)
		.attr("fill", "#000")
		// .attr("pointer-events", "all")
		.on("mousemove", mousemove)
		.on("click", mouseclick)

	svg.append("clipPath")
	    .attr("id", "clip")
	  .append("rect")
	    .attr("x", 0)
	    .attr("y", 0)
	    .attr("width", width)
	    .attr("height", height);
	

	var xAxis = d3.svg.axis()
	    .scale(x)
	    .tickSize(height,0)
	    .ticks(20)
	    //.tickSubsidite()
	    //.tickValues([14.4,11.1,6,2.2,40.4])
	   	.tickFormat(function(d){ return d+" hz"; })
	    .orient("top");

	var yAxis = d3.svg.axis()
		.scale(y)
		.orient("left")
		.tickSize(-width,0)
		.tickFormat(formatMinutes);
		//.ticks(12)


	var svgXAxis = svg.append("g")
	      .attr("class", "x axis")
	      .attr("transform", "translate(0," + height + ")")
	      .call(xAxis)

	var svgYAxis = svg.append("g")
		  .attr("class", "y axis")
		  .attr("transform", "translate(0,0)")
		  .call(yAxis)



	var data = [
		// { time:10, freq:5	}
		// ,{ time:15, freq:6 }
		// ,{ time:15, freq:2 }
		// ,{ time:15, freq:7 }
		// ,{ time:15, freq:8 }
	];

	trackPlayer.track = data;

	function mousemove(){
		var p = posInvert();
			
		var time = y(p.y)-y(end(data.length))

		if(time > 0){
			template
				.classed("hide", false)
				.attr("x", function(d,i){ 
					return x(p.x);
				})
				.attr("y", function(d,i){ 
					return y(start(data.length));
				})
				.attr("height", function(d,i){
					return time;
				})
		} else {
			template.classed("hide", true);
		}

		}

	function mouseclick(){
			var p = posInvert(this);
			var time = p.y - start(data.length);

			if(time > 0){
				data.push({ time: time,	freq:p.x });
			}

			render();
		}

	var chart = svg.append("g").classed("chart", true).attr("clip-path", "url(#clip)")
	var svgItem = chart.append("g");
	var svgSpace = chart.append("g");
	var svgLine = chart.append("g")
			.append("path")
			.attr("class", "line")

	var line = d3.svg.line()
		.interpolate("cardinal")
    .x(function(d,i) { return x(d.freq); })
    .y(function(d,i) { return y(start(i))+((y(end(i))-y(start(i)))/2); });

	var template = chart.append("rect")
		.classed("template", true)
		.attr("width", 10)
		.attr("height", 10)
		.attr("x", 0)
		.attr("y", 0)

	var posInvert = function(){
		var m = d3.mouse(svgMouse.node());
		return {
			x: d3.round(x.invert(m[0]),1),
			y: d3.round(y.invert(m[1]))
		};
	}

	var start = function(i){
		return d3.sum(data.slice(0,i), function(d){ return d.time; })
	};

	var end = function(i){
		return d3.sum(data.slice(0,i+1), function(d){ return d.time; })
	};

	var lastFreq = function(i){
		//console.log("start",i)
		return i > 0 ? data[i-1].freq : x.domain()[0];
	};

	var spaceDrag = d3.behavior.drag()
	    .on("drag", function(d,i){
	    	var p = posInvert(this);
	    	var time = p.y-start(i);

	  		if(time > 0){
	  			d.time = p.y-start(i);
	  			render();
	  		}	
	    })

  var itemDrag = d3.behavior.drag()
      .on("drag", function(d,i){
      	var p = posInvert(this);
      	d.freq = p.x;
      	render();
      })

	function zoomed(){
		svg.select(".y.axis").call(yAxis);
		render();
		mousemove();
	}

	function zoomstart(){
		template.classed("hide",true);
	}

	function zoomend(){
		template.classed("hide",false);
	}

	var render = function(){
		//console.log("render",data)
		var items = svgItem.selectAll(".item")
			.data(data, function(d,i){ return i; })

		items
			.enter()
				.append("rect")
				.attr("class", "item")
				.attr("x", function(d,i){
					return x(d.freq);
				})
				.attr("y", function(d,i){
						return y(start(i));
				})
				.attr("height", function(d,i){
					return y(end(i))-y(start(i));
				})
				.attr("width", 10)
				.call(itemDrag)
				.on("click", function (d) {
					console.log("delete",d) 

				})

		items
			.attr("x", function(d,i){
				return x(d.freq);
			})
			.attr("y", function(d,i){
					return y(start(i));
			})
			.attr("height", function(d,i){
				return y(end(i))-y(start(i));
			})

		items.exit().remove()


		var space = svgSpace.selectAll(".space")
			.data(data, function(d,i){ return i; })

		space
			.enter()
				.append("rect")
				.attr("class", "space")
				.attr("x", function(d,i){ return x(d.freq)-20;	})
				.attr("width", 40)
				.attr("height", 10)
				.attr("y", function(d,i){
					return y(end(i))-5;
				})
				.call(spaceDrag)
				

		space
			.attr("y", function(d,i){
				return y(end(i))-5;
			})

		space.exit().remove()

		svgLine
      .datum(data)
      .attr("d", line);

				// .attr("d", function(d,i){
				// 	return	"M"+x(lastFreq(i))+","+y(start(i))+
				// 					"L"+x(lastFreq(i))+","+y(start(i)+10)+
				// 					"L"+x(d.freq)+","+y(d.time+10)+
				// 					"L"+x(d.freq)+","+y(d.time)+
				// 					"M"+x(lastFreq(i))+","+y(start(i));
				// })
	}

	render();



	var svgTime = svg.append("line")
		.attr("class", "position")



	self.init = function () {
		console.log("init editor")
		//console.log(trackPlayer.timeTotal())

		data = trackPlayer.track;
		render();

		//x.domain([0,trackPlayer.timeTotal()]);
		//svgXAxis.call(xAxis);
		//var bars = chart.selectAll(".bar").data(self.track).enter();

		// bars.append("rect")
		//   .attr("class", "bar1")
		//   .attr("x", function(d,i) { return x(trackPlayer.timeAt(i)); })
		//   .attr("width", function (d) {
		//   	return x(d.time);
		//   })
		//   .attr("y", function(d) { return y(d.freq); })
		//   .attr("height", function (d) {
		//   	return y.rangeBand();
		//   });


		 // svgTime
		 // 	.datum(0)
		 // 	.attr("x1", function (d) { return x(d); })
		 // 	.attr("y1", 0)
		 // 	.attr("x2", function (d) { return x(d); })
		 // 	.attr("y2", height)
		 // 	.datum(trackPlayer.timeTotal())
		 // 	.transition()
		 // 	.ease("linear")
		 // 	.duration(trackPlayer.timeTotal())
		 // 	.attr("x1", function (d) { return x(d); })
		 // 	.attr("y1", 0)
		 // 	.attr("x2", function (d) { return x(d); })
		 // 	.attr("y2", height)

	}



	return self;
}


//trackPlayer.play();
//trackPlayer.playTrack("data/orig.json")

//updateFreq(252, 14.4);

var socket = io('http://localhost:8080');

$(document).ready(function() {


	var soundGenerator = new SoundGenerator();
	var trackPlayer = new TrackPlayer(soundGenerator,socket);
	var trackEditor = new TrackEditor(trackPlayer);

	// soundGenerator.setFreq()
	//sound.setFreq(220,14.4);

	$("#base").bind("change",function() {
		var base = parseFloat($(this).val());

		$("#basein").val(base);

		soundGenerator.base = base;

		console.log(base)
	}).trigger("change")


	$("#volume").bind("change",function() {
		soundGenerator.setVolume( parseFloat($(this).val()) );
	}).trigger("change")

	$("#play").click(function () {
		trackPlayer.start()
	});

	$("#stop").click(function () {
		trackPlayer.stop()
	})

	$("#new").click(function () {
		trackPlayer.new(function(){
			trackEditor.init();
		})
	})

	$("#load").click(function () {
		$("#tracklist").toggle("slide")
	})

	$("#save").click(function () {
		var name = $("#name").val()+".json";
		console.log("save",name);

		socket.emit('saveTrack', name, trackPlayer.track,function (data) {
			console.log("savedTrack",data)
		});

		loadTracks();
	})


	function loadTracks () {
		socket.emit('listTracks', function(data){
			console.log("listTracks",data);

			d3.select("#tracklist").selectAll(".track").remove();
			
			d3.select("#tracklist").selectAll(".track")
				.data(data)
					.enter()
					.append("div")
					.classed("track",true)
					.text(function(d){
						return d;
					})
					.on("click", function (d) {
						trackPlayer.loadTrack("data/"+d, function(){
							trackEditor.init();
						});
					})
		});
	}


	loadTracks();


})
