/**
 * TransformStream for audio encoding
 * @module encode-audio/stream
 *
 * audioSource.pipeThrough(encodeStream('mp3', { sampleRate: 44100, bitrate: 128 }))
 */

import encode from './audio-encode.js'

/**
 * @param {string} format - 'wav', 'mp3', 'ogg', 'opus', 'flac', 'aiff'
 * @param {object} opts - encoder options (sampleRate required)
 * @returns {TransformStream<Float32Array[]|Float32Array, Uint8Array>}
 */
export default function encodeStream(format, opts) {
	if (!encode[format]) throw Error('Unknown format: ' + format)
	let enc
	return new TransformStream({
		async start() { enc = await encode[format](opts) },
		async transform(chunk, ctrl) {
			let buf = await enc(chunk)
			if (buf.length) ctrl.enqueue(buf)
		},
		async flush(ctrl) {
			let buf = await enc()
			if (buf.length) ctrl.enqueue(buf)
		}
	})
}
