var wav_js = require("../src/wav.js");

exports.testBasicEightBitWavCreation = function(test){

	var wav = wav_js.create(1, 44100, wav_js.BitSize.EIGHT);
	wav.addSample(0);
	wav.addSample(100);
	wav.addSample(200);
	res = wav.toByteArray();

	test.equal(res.length, 47, "wav file data is correct length");

    test.done();
};
