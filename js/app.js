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
		oscLeft.frequency.value = 0;
		oscRight.frequency.value = 0;
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

var TrackPlayer = function (soundGenerator) {
	var self = this;

	self.freqs = { b: 14.4, a: 11.1, t: 6, d: 2.2, g: 40.4 };
	self.track = [{ freq: "a" , time: 1000 }, { freq: "b" , time: 1000 }, { freq: "t" , time: 1000 }];
	self.position = 0;

	self.loadTrack = function (url, callback) {
		$.getJSON( url, function( data ) {
			console.log("loadTrack", data)

			self.track = data;
			callback();
			//self.play();
		})
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

	self.stop = function() {
		soundGenerator.stop();
		self.position = 0;
	}

	self.finished = function () {
		console.log("finished")
		self.stop();
	}

	self.setTimer = function (time) {
		// console.log("setTimeout")
		
		var timer = setTimeout(function() {
			self.position++;
			self.play();
		},time)
		
	}
	self.getBinauralFreq = function (name) {
		return self.freqs[name];
	}

	self.play = function () {
		if(self.position<self.track.length){

			console.log("play pos", self.position)

			var slot = self.track[self.position];
			var binaural = self.getBinauralFreq(slot.freq);
			
			soundGenerator.setBinaural(binaural);
			self.setTimer(slot.time);
		} else {
			self.finished();
		}
	}

	return self;
};

var TrackEditor = function  (trackPlayer) {
	var self = this;

	self.track = trackPlayer.track;
	
	var margin = {top: 80, right: 80, bottom: 80, left: 80},
	    width = window.innerWidth - margin.left - margin.right,
	    height = 300 - margin.top - margin.bottom;

	var svg = d3.select("#editor").append("svg")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)
	  .append("g")
	    .attr("class", "graph")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	var x = d3.scale.linear().range([0, width]);

	var y = d3.scale.ordinal()
	.domain(d3.keys(trackPlayer.freqs))
	.rangeBands([0, height])

	var xAxis = d3.svg.axis()
	    .scale(x)
	    .ticks(20)
	    .orient("bottom");

	var yAxis = d3.svg.axis().scale(y).orient("right");

	var svgXAxis = svg.append("g")
	      .attr("class", "x axis")
	      .attr("transform", "translate(0," + height + ")")
	      

	var svgYAxis = svg.append("g")
		  .attr("class", "y axis")
		  .attr("transform", "translate(" + (width) + ",0)")
		  .call(yAxis)

	var chart = svg.append("g");

	var svgTime = svg.append("line")
		.attr("class", "position")


	self.init = function () {
		console.log("init editor")
		console.log(trackPlayer.timeTotal())

		self.track = trackPlayer.track;

		x.domain([0,trackPlayer.timeTotal()]);

		svgXAxis.call(xAxis);
		var bars = chart.selectAll(".bar").data(self.track).enter();

		bars.append("rect")
		  .attr("class", "bar1")
		  .attr("x", function(d,i) { return x(trackPlayer.timeAt(i)); })
		  .attr("width", function (d) {
		  	return x(d.time);
		  })
		  .attr("y", function(d) { return y(d.freq); })
		  .attr("height", function (d) {
		  	return y.rangeBand();
		  });


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

$(document).ready(function() {

	var soundGenerator = new SoundGenerator();
	var trackPlayer = new TrackPlayer(soundGenerator);
	var trackEditor = new TrackEditor(trackPlayer);


	trackPlayer.loadTrack("data/orig.json", function(){
		console.log("loaded")
		trackEditor.init();
	});

	// soundGenerator.setFreq()
	//sound.setFreq(220,14.4);

	$("#volume").bind("change",function() {
		soundGenerator.setVolume( parseFloat($(this).val()) );
	})

	$("#play").click(function  () {
		//soundGenerator.setFreq();
		trackPlayer.play()
	})

})
