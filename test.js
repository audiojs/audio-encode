import t, { is, ok } from 'tst'
import encode, { streamEncoder, fmt, channels, norm, merge } from './audio-encode.js'

// --- test utilities ---

// generate mono sine wave
export function sine(sampleRate = 44100, freq = 440, duration = 1) {
	let n = sampleRate * duration
	let data = new Float32Array(n)
	for (let i = 0; i < n; i++) data[i] = Math.sin(2 * Math.PI * freq * i / sampleRate)
	return [data]
}

// compare channelData within tolerance (for lossy round-trips)
export function similar(a, b, tolerance = 0.01) {
	is(a.length, b.length, 'channel count')
	for (let ch = 0; ch < a.length; ch++) {
		let lenDiff = Math.abs(a[ch].length - b[ch].length)
		ok(lenDiff <= a[ch].length * 0.01, `length ch${ch}: ${a[ch].length} vs ${b[ch].length}`)
		let len = Math.min(a[ch].length, b[ch].length)
		let maxErr = 0
		for (let i = 0; i < len; i++) maxErr = Math.max(maxErr, Math.abs(a[ch][i] - b[ch][i]))
		ok(maxErr <= tolerance, `max error ${maxErr.toFixed(4)} <= ${tolerance}`)
	}
}

// --- core ---

t('channels', () => {
	let mono = new Float32Array([1, 2, 3])
	let stereo = [new Float32Array([1, 2]), new Float32Array([3, 4])]

	is(channels(null).length, 0)
	is(channels(undefined).length, 0)
	is(channels([]).length, 0)
	is(channels(mono).length, 1)
	is(channels(mono)[0], mono)
	is(channels(stereo).length, 2)
})

t('norm', () => {
	let empty = norm(null)
	ok(empty instanceof Uint8Array)
	is(empty.length, 0)

	let buf = new Uint8Array([1, 2, 3])
	is(norm(buf), buf)

	let arr = new Int8Array([1, 2, 3])
	let result = norm(arr)
	ok(result instanceof Uint8Array)
	is(result.length, 3)
})

t('merge', () => {
	let a = new Uint8Array([1, 2])
	let b = new Uint8Array([3, 4])
	let m = merge(a, b)
	is(m.length, 4)
	is(m[0], 1); is(m[2], 3)
	is(merge(a, null), a)
	is(merge(null, b), b)
})

t('streamEncoder', async () => {
	let encoded = [], flushed = false, freed = false

	let enc = streamEncoder(
		ch => { encoded.push(ch); return new Uint8Array([ch[0].length]) },
		() => { flushed = true; return new Uint8Array([0xFF]) },
		() => { freed = true }
	)

	let data = [new Float32Array([1, 2, 3])]
	let r1 = await enc.encode(data)
	is(r1[0], 3)
	is(encoded.length, 1)

	let r2 = await enc.encode() // flush + free
	ok(flushed)
	ok(freed)
	is(r2[0], 0xFF)

	// double flush returns empty
	is((await enc.encode()).length, 0)
})

t('streamEncoder: encode after free throws', async () => {
	let enc = streamEncoder(
		ch => new Uint8Array([1]),
		null,
		() => {}
	)
	await enc.encode() // flush + free
	try {
		await enc.encode([new Float32Array([1])])
		ok(false, 'should throw')
	} catch (e) { ok(/already freed/.test(e.message)) }
})

t('streamEncoder: error frees resources', async () => {
	let freed = false
	let enc = streamEncoder(
		() => { throw Error('codec error') },
		null,
		() => { freed = true }
	)
	try {
		await enc.encode([new Float32Array([1])])
		ok(false, 'should throw')
	} catch (e) { ok(/codec error/.test(e.message)) }
	ok(freed, 'freed on error')
})

t('fmt', async () => {
	let initOpts = null
	let encoder = fmt(async (opts) => {
		initOpts = opts
		return streamEncoder(
			ch => new Uint8Array(ch[0].length * 2),
			() => new Uint8Array([0xFE, 0xED]),
			() => {}
		)
	})

	is(typeof encoder, 'function')
	is(typeof encoder.stream, 'function')

	// sampleRate required
	try {
		await encoder([new Float32Array(10)])
		ok(false, 'should throw')
	} catch (e) { ok(/sampleRate/.test(e.message)) }

	// whole-file encode
	let result = await encoder([new Float32Array(100)], { sampleRate: 44100 })
	ok(result instanceof Uint8Array)
	is(result.length, 200 + 2) // encoded + flushed
	is(initOpts.sampleRate, 44100)

	// empty input returns empty
	is((await encoder([], { sampleRate: 44100 })).length, 0)
})
