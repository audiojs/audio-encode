/**
 * Audio encoder: whole-file and streaming
 * @module audio-encode
 *
 * let buf = await encode.wav(channelData, { sampleRate: 44100 })
 *
 * let enc = await encode.mp3.stream({ sampleRate: 44100, bitrate: 128 })
 * let chunk = enc.encode(channelData)
 * let final = enc.encode() // flush + free
 */

const EMPTY = new Uint8Array(0)

const encode = {}
export default encode

// --- format registration ---

// encode.wav = fmt(async (opts) => streamEncoder(...))
// encode.mp3 = fmt(async (opts) => streamEncoder(...))

/**
 * Wrap a stream factory into whole-file encoder + .stream
 * @param {function} init - async (opts) => StreamEncoder
 */
function fmt(init) {
	let fn = async (data, opts = {}) => {
		if (!opts.sampleRate) throw Error('sampleRate is required')
		let ch = channels(data)
		if (!ch.length || !ch[0].length) return EMPTY
		let enc = await init(opts)
		try {
			let result = await enc.encode(ch)
			let flushed = await enc.encode()
			return merge(result, flushed)
		} catch (e) { enc.free(); throw e }
	}
	fn.stream = init
	return fn
}

// normalize input to Float32Array[]
function channels(data) {
	if (!data) return []
	if (Array.isArray(data)) {
		if (data[0] instanceof Float32Array) return data
		return []
	}
	if (data instanceof Float32Array) return [data]
	return []
}

/**
 * StreamEncoder:
 * .encode(channelData) — encode audio, returns Uint8Array
 * .encode()            — flush + finalize + free
 * .flush()             — flush without freeing
 * .free()              — release without flushing
 */
export function streamEncoder(onEncode, onFlush, onFree) {
	let done = false
	return {
		async encode(data) {
			if (data) {
				if (done) throw Error('Encoder already freed')
				let ch = channels(data)
				try { return norm(await onEncode(ch)) }
				catch (e) { done = true; onFree?.(); throw e }
			}
			// no args = end of stream
			if (done) return EMPTY
			done = true
			try {
				let result = onFlush ? norm(await onFlush()) : EMPTY
				onFree?.()
				return result
			} catch (e) { onFree?.(); throw e }
		},
		async flush() {
			if (done) return EMPTY
			return onFlush ? norm(await onFlush()) : EMPTY
		},
		free() {
			if (done) return
			done = true
			onFree?.()
		}
	}
}

// ensure Uint8Array
function norm(r) {
	if (!r?.length) return EMPTY
	if (r instanceof Uint8Array) return r
	if (r.buffer) return new Uint8Array(r.buffer, r.byteOffset, r.byteLength)
	return new Uint8Array(r)
}

// concat two Uint8Arrays
function merge(a, b) {
	if (!b?.length) return a || EMPTY
	if (!a?.length) return b || EMPTY
	let out = new Uint8Array(a.length + b.length)
	out.set(a)
	out.set(b, a.length)
	return out
}

export { fmt, channels, norm, merge }
