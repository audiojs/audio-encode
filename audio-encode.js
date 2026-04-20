/**
 * Audio encoder: whole-file and chunked
 * @module encode-audio
 *
 * let buf = await encode.wav(channelData, { sampleRate: 44100 })
 *
 * for await (let bytes of encode.mp3(source, { sampleRate: 44100 })) { ... }
 *
 * let enc = await encode.mp3({ sampleRate: 44100, bitrate: 128 })
 * let chunk = await enc(channelData)
 * let final = await enc() // flush + free
 */

const EMPTY = new Uint8Array(0)

/**
 * Encode audio — delegates to format-specific encoder.
 * encode('wav', channelData, { sampleRate })      → Promise<Uint8Array>
 * encode('wav', source(), { sampleRate })          → AsyncGenerator<Uint8Array>
 * encode('wav', { sampleRate })                    → Promise<StreamEncoder>
 */
function encode(format, data, opts) {
	if (!encode[format]) throw Error('Unknown format: ' + format)
	return encode[format](data, opts)
}
export default encode

function isAudioData(d) {
	return d instanceof Float32Array || Array.isArray(d) || (d?.getChannelData && d?.numberOfChannels)
}

/**
 * Encode a stream of PCM chunks to the given format.
 * @param {AsyncIterable<Float32Array[]|Float32Array>} source
 * @param {string} format
 * @param {object} opts - encoder options (sampleRate required)
 * @returns {AsyncGenerator<Uint8Array>}
 */
async function* encodeChunked(source, format, opts) {
	let enc = await encode[format](opts)
	try {
		for await (let chunk of source) {
			let buf = await enc(chunk)
			if (buf.length) yield buf
		}
		let final = await enc()
		if (final.length) yield final
	} catch (e) { enc.free(); throw e }
}
export { encodeChunked }

// --- format registration ---

// Lazy-loaded meta writers (per-format), keyed by format name. Loaded on first
// use when `meta`/`markers`/`regions` is passed to that format's encoder.
const META_WRITERS = {
	wav: () => import('@audio/encode-wav/meta').then(m => m.writeMeta),
	mp3: () => import('@audio/encode-mp3/meta').then(m => m.writeMeta),
	flac: () => import('@audio/encode-flac/meta').then(m => m.writeMeta),
}

function reg(name, load) {
	encode[name] = fmt(name, async (opts) => {
		let { meta, markers, regions, ...rest } = opts || {}
		let init = (await load()).default
		let codec = await init(rest)
		// No meta requested (or unsupported by format): pass through.
		if (!META_WRITERS[name] || !(meta || markers?.length || regions?.length))
			return streamEncoder(ch => codec.encode(ch), () => codec.flush(), () => codec.free())
		// Meta requested: buffer encoder output, splice via writeMeta on flush.
		let writeMeta = await META_WRITERS[name]()
		let parts = []
		return streamEncoder(
			async ch => { let b = await codec.encode(ch); if (b?.length) parts.push(b); return EMPTY },
			async () => {
				let f = await codec.flush(); if (f?.length) parts.push(f)
				let total = 0; for (let p of parts) total += p.length
				let all = new Uint8Array(total), off = 0
				for (let p of parts) { all.set(p, off); off += p.length }
				return writeMeta(all, { meta: meta || {}, markers: markers || [], regions: regions || [] })
			},
			() => codec.free(),
		)
	})
}

reg('wav', () => import('@audio/encode-wav'))
reg('aiff', () => import('@audio/encode-aiff'))
reg('mp3', () => import('@audio/encode-mp3'))
reg('ogg', () => import('@audio/encode-ogg'))
reg('flac', () => import('@audio/encode-flac'))
reg('opus', () => import('@audio/encode-opus'))

/**
 * Wrap a stream factory into whole-file encoder + streaming
 * 1 arg (opts) → streaming encoder function
 * 2 args (data, opts) → whole-file encode
 */
function fmt(name, init) {
	let fn = (data, opts) => {
		// 1 arg = streaming: encode.mp3({ sampleRate })
		if (!opts) return init(data)
		// 2 args, async iterable = chunked: encode.mp3(source(), { sampleRate })
		if (data && (typeof data[Symbol.asyncIterator] === 'function' || typeof data[Symbol.iterator] === 'function' && !isAudioData(data)))
			return encodeChunked(data, name, opts)
		// 2 args = whole-file: encode.mp3(channelData, { sampleRate })
		return wholeFile(data, opts, init)
	}
	return fn
}

async function wholeFile(data, opts, init) {
	if (!opts.sampleRate) throw Error('sampleRate is required')
	let ch = channels(data)
	if (!ch.length || !ch[0].length) return EMPTY
	let enc = await init({ channels: ch.length, ...opts })
	try {
		let result = await enc(ch)
		let flushed = await enc()
		return merge(result, flushed)
	} catch (e) { enc.free(); throw e }
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
