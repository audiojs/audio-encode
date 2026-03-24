/**
 * Audio encoder: whole-file and streaming
 * @module encode-audio
 *
 * let buf = await encode.wav(channelData, { sampleRate: 44100 })
 *
 * let enc = await encode.mp3({ sampleRate: 44100, bitrate: 128 })
 * let chunk = await enc(channelData)
 * let final = await enc() // flush + free
 */

const EMPTY = new Uint8Array(0)

const encode = {}
export default encode

// --- format registration ---

function reg(name, load) {
	encode[name] = fmt(async (opts) => {
		let init = (await load()).default
		let codec = await init(opts)
		return streamEncoder(ch => codec.encode(ch), () => codec.flush(), () => codec.free())
	})
}

reg('wav', () => import('@audio/wav-encode'))
reg('aiff', () => import('@audio/aiff-encode'))
reg('mp3', () => import('@audio/mp3-encode'))
reg('ogg', () => import('@audio/ogg-encode'))
reg('flac', () => import('@audio/flac-encode'))
reg('opus', () => import('@audio/opus-encode'))

/**
 * Wrap a stream factory into whole-file encoder + streaming
 * 1 arg (opts) → streaming encoder function
 * 2 args (data, opts) → whole-file encode
 */
function fmt(init) {
	let fn = async (data, opts) => {
		// 1 arg = streaming: encode.mp3({ sampleRate })
		if (!opts) return init(data)
		// 2 args = whole-file: encode.mp3(channelData, { sampleRate })
		if (!opts.sampleRate) throw Error('sampleRate is required')
		let ch = channels(data)
		if (!ch.length || !ch[0].length) return EMPTY
		let enc = await init(opts)
		try {
			let result = await enc(ch)
			let flushed = await enc()
			return merge(result, flushed)
		} catch (e) { enc.free(); throw e }
	}
	// TODO: remove .stream in next major
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
	// AudioBuffer or AudioBuffer-like ({ numberOfChannels, getChannelData })
	if (data.getChannelData && data.numberOfChannels) {
		let ch = []
		for (let i = 0; i < data.numberOfChannels; i++) ch.push(data.getChannelData(i))
		return ch
	}
	return []
}

/**
 * StreamEncoder — a callable function:
 * enc(channelData) — encode audio, returns Uint8Array
 * enc()            — flush + finalize + free
 * enc.flush()      — flush without freeing
 * enc.free()       — release without flushing
 */
export function streamEncoder(onEncode, onFlush, onFree) {
	let done = false
	let fn = async (data) => {
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
	}
	// TODO: remove .encode in next major
	fn.encode = fn
	fn.flush = async () => {
		if (done) return EMPTY
		return onFlush ? norm(await onFlush()) : EMPTY
	}
	fn.free = () => {
		if (done) return
		done = true
		onFree?.()
	}
	return fn
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
