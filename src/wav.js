/*
The MIT License (MIT)

Copyright (c) 2015 Kevin Phillips (kmp1)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
/*jslint passfail: false,
    ass: false,
    bitwise: true,
    continue: false,
    debug: false,
    eqeq: false,
    evil: false,
    forin: false,
    newcap: false,
    nomen: false,
    plusplus: false,
    regexp: false,
    unparam: false,
    sloppy: false,
    stupid: false,
    sub: false,
    todo: true,
    vars: false,
    white: false,
    maxlen: 80 */
var wav = (function () {

    "use strict";

    /**
     * This enumeration lists out the bit sizes permitted
     * by the wave-writer implementation.
     */
    var SampleSize = {
        /** Eight bits per sample */
        EIGHT: 8,
        /** Sixteen bits per sample */
        SIXTEEN: 16
    };

    function toTwosComplement16(value) {

        if (value > 32767) {
            throw "Cannot convert value " + value + " to 16 bit two's " +
                "complement form as it is too large.";
        }

        if (value < -32768) {
            throw "Cannot convert value " + value + " to 16 bit two's " +
                "complement form as it is too small.";
        }

        var low15Bits = value & 0x7fff;

        if (value > 0) {
            // If it is positive, just get the lowest 15 bits since the sign
            // bit is 0
            return low15Bits;
        }

        // If it is negative, set the sign bit to 1 and tack on the low 15 bits
        return 0x8000 | low15Bits;
    }

    function WaveFile(channelCount, sampleRate, bitsPerSample) {

        if (bitsPerSample !== SampleSize.EIGHT &&
                bitsPerSample !== SampleSize.SIXTEEN) {
            throw "Bits per sample size " + bitsPerSample +
                " is not supported.";
        }

        var byteRate, blockAlign, subChunk1Size, data, subChunk2SizeIndex,
            headerSize;

        subChunk1Size = 16;
        blockAlign =  channelCount * (bitsPerSample / 8);
        byteRate = sampleRate * blockAlign;

        // Make sure the data starts with the header
        data = [
            82, 73, 70, 70,             // "RIFF" in ASCII
            0, 0, 0, 0,                 // Chunk Size (set by toByteArray)
            87, 65, 86, 69,             // "WAVE" in ASCII
            102, 109, 116, 32,          // "fmt " in ASCII
            subChunk1Size, 0, 0, 0,     // Sub chunk 1 size (always 16)
            1, 0,                       // Audio format (1 == PCM)
            channelCount & 0xff,        // Number Channels
            (channelCount >> 8) & 0xff,
            sampleRate & 0xff,          // Sample Rate
            (sampleRate >> 8) & 0xff,
            (sampleRate >> 16) & 0xff,
            (sampleRate >> 24) & 0xff,
            byteRate & 0xff,            // Byte Rate
            (byteRate >> 8) & 0xff,
            (byteRate >> 16) & 0xff,
            (byteRate >> 24) & 0xff,
            blockAlign & 0xff,          // Block Align
            (blockAlign >> 8) & 0xff,
            bitsPerSample & 0xff,       // Bits per sample
            (bitsPerSample >> 8) & 0xff
        ];

        headerSize = data.length;

        return {

            /**
             * Gets the frequency of the wave data.
             */
            getFrequency: function () { return sampleRate; },

            /**
             * Gets the number of channels in the wave data.
             */
            getChannelCount: function () { return channelCount; },

            /**
             * Gets the number of bits per sample in the wave data.
             */
            getSampleSize: function () { return bitsPerSample; },

            /**
             * Add a sample to all the channels in the wave data
             * (e.g. if you want the left and right channel in a stereo
             * file to be the same).
             *
             * @param {Number} sample The sample to add
             */
            addSampleToAllChannels: function (sample) {
                var i;
                for (i = 0; i < channelCount; i += 1) {
                    this.addSample(sample);
                }
            },

            /**
             * Add a sample to the wave data.
             *
             * @param {Number} sample The sample to add
             */
            addSample: function (sample) {
                var val;

                // Check to see if we are the first sample
                if (data.length === headerSize) {

                    // Add the "data" ASCII string to the output
                    data.push(100);
                    data.push(97);
                    data.push(116);
                    data.push(97);

                    // We will need the index of the sub chunk 2 size
                    // when we figure it out in the toByteArray function
                    subChunk2SizeIndex = data.length;

                    // And 4 bytes to store the sub-chunk 2 size
                    data.push(0);
                    data.push(0);
                    data.push(0);
                    data.push(0);
                }

                if (bitsPerSample === SampleSize.EIGHT) {

                    if (sample < 0 || sample > 255) {
                        throw "Sample " + sample + " is out of range for 8 " +
                            "bits per sample (should be 0 to 255).";
                    }

                    data.push(sample & 0xff);
                } else {

                    val = toTwosComplement16(sample);
                    data.push(val & 0xff);
                    data.push((val >> 8) & 0xff);
                }
            },

            /**
             * Convert the wave file instance to a byte array.
             *
             * @return The wave file as a byte array.
             */
            toByteArray: function () {

                // Store the 2 sizes before returning the byte array we
                // have been building up...

                var subChunk2Size, chunkSize, chunkSizeIndex = 4;

                subChunk2Size = this.getDataChunkSize();

                chunkSize = 4 + (8 + subChunk1Size) + (8 + subChunk2Size);

                data[chunkSizeIndex] = chunkSize & 0xff;
                data[chunkSizeIndex + 1] = (chunkSize >> 8) & 0xff;
                data[chunkSizeIndex + 2] = (chunkSize >> 16) & 0xff;
                data[chunkSizeIndex + 3] = (chunkSize >> 24) & 0xff;

                if (data.length > subChunk2SizeIndex + 3) {

                    data[subChunk2SizeIndex] = subChunk2Size & 0xff;
                    data[subChunk2SizeIndex + 1] = (subChunk2Size >> 8) & 0xff;
                    data[subChunk2SizeIndex + 2] = (subChunk2Size >> 16) & 0xff;
                    data[subChunk2SizeIndex + 3] = (subChunk2Size >> 24) & 0xff;
                }

                return data;
            },

            /**
             * Gets the size, in bytes, of the data portion of the file.
             *
             * @return The size of the data chunk (in bytes).
             */
            getDataChunkSize: function () {
                // The sub chunk 2 will be the entire wav data minus 4
                // bytes for "data" and 4 bytes for storing the size and
                // the size of the header
                var dataChunk2Size = data.length - headerSize - 8;
                return dataChunk2Size;
            },

            /**
             * Gets the total number of samples in the data.
             *
             * @return The total number of samples in the data (if there are
             * multiple channels this may not be what you expect - see
             * getSampleCountInOneChannel).
             */
            getTotalSampleCount: function () {
                var allSamples = this.getDataChunkSize() / (bitsPerSample / 8);

                return allSamples;
            },

            /**
             * Gets the sample count in a single channel.
             *
             * @return The number of samples in a single channel.
             */
            getSampleCountInOneChannel: function () {
                var sampsInOneChan = this.getTotalSampleCount() / channelCount;

                return sampsInOneChan;
            }
        };
    }

    return {

        SampleSize: SampleSize,

        /**
         * Construct a new wav file instance.  This creates a PCM encoded wave
         * file (so isuncompressed).
         *
         * @param {Number} channelCount The number of channels (1 = mono, 2 =
         * stereo, etc)
         * @param {Number} sampleRate The sample rate (8000, 44100, etc)
         * @param {Number} bitsPerSample The number of bits per sample - see
         * WaveFile.SampleSize
         *
         * @return A new WaveFile instance.
         */
        create: function (channelCount, sampleRate, bitsPerSample) {
            return new WaveFile(channelCount, sampleRate, bitsPerSample);
        }
    };
}());

if (typeof (exports) !== "undefined") {
    exports.create = wav.create;
    exports.SampleSize = wav.SampleSize;
}