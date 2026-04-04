// requires: libflacjs
/**
 * FLAC encoder — browser + Node, uses libflacjs (libFLAC compiled to JS/WASM)
 *
 * @param {Object} opts
 * @param {number} opts.sampleRate - required
 * @param {number} [opts.channels] - 1 or 2 (default from input)
 * @param {number} [opts.bitDepth=16] - 16 or 24
 * @param {number} [opts.compression=5] - compression level 0-8
 * @returns {{ encode, flush, free }}
 *
 * encode(channels: Float32Array[]) → Uint8Array
 * flush() → Uint8Array
 * free() → void
 */
export default async function flac(opts) {
	let { sampleRate, channels: nch, bitDepth = 16, compression = 5 } = opts
	let max = bitDepth === 24 ? 8388607 : 32767
	let min = -max - 1
	let buf = [], enc, Flac, inited = false

	// load libflac — works as CJS in ESM context
	let mod = await import('libflacjs/dist/libflac.js')
	Flac = mod.default || mod

	// wait for ready if async variant
	if (!Flac.isReady()) await new Promise(r => Flac.on('ready', r))

	return { encode: feed, flush, free }

	function init(numCh) {
		nch = nch || numCh
		enc = Flac.create_libflac_encoder(sampleRate, nch, bitDepth, compression, 0, false, 0)
		if (!enc) throw Error('FLAC encoder creation failed')
		let status = Flac.init_encoder_stream(enc, write_cb)
		if (status !== 0) throw Error('FLAC encoder init failed: ' + status)
		inited = true
	}

	function write_cb(data) { buf.push(new Uint8Array(data)) }

	function feed(channels) {
		if (!inited) init(channels.length)
		let len = channels[0].length
		let interleaved = new Int32Array(len * nch)
		for (let i = 0; i < len; i++) {
			for (let c = 0; c < nch; c++) {
				let s = Math.round(channels[c][i] * max)
				interleaved[i * nch + c] = s < min ? min : s > max ? max : s
			}
		}
		if (!Flac.FLAC__stream_encoder_process_interleaved(enc, interleaved, len))
			throw Error('FLAC encoding failed')
		return drain()
	}

	function flush() {
		if (!inited) return new Uint8Array(0)
		Flac.FLAC__stream_encoder_finish(enc)
		let out = drain()
		Flac.FLAC__stream_encoder_delete(enc)
		enc = null; inited = false
		return out
	}

	function free() {
		if (enc) {
			try { Flac.FLAC__stream_encoder_finish(enc) } catch (_) {}
			Flac.FLAC__stream_encoder_delete(enc)
		}
		enc = null; buf = null; inited = false
	}

	function drain() {
		if (!buf.length) return new Uint8Array(0)
		let total = 0
		for (let i = 0; i < buf.length; i++) total += buf[i].length
		let out = new Uint8Array(total), off = 0
		for (let i = 0; i < buf.length; i++) { out.set(buf[i], off); off += buf[i].length }
		buf.length = 0
		return out
	}
}
