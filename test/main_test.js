var wav = require("../src/wav.js");

exports.testBasicEightBitWavCreation = function(test){

	var wave = wav.create(1, 44100, wav.BitSize.EIGHT);
	wave.addSample(0);
	wave.addSample(100);
	wave.addSample(200);
	res = wave.toByteArray();

	test.equal(res.length, 47, "wav file data is correct length");

    test.done();
};
