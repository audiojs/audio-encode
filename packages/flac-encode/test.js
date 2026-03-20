import t, { is, ok } from 'tst'
import flac from './flac-encode.js'

function sine(rate, freq, dur) {
	let n = rate * dur, d = new Float32Array(n)
	for (let i = 0; i < n; i++) d[i] = Math.sin(2 * Math.PI * freq * i / rate)
	return d
}

function concat(a, b) {
	let out = new Uint8Array(a.length + b.length)
	out.set(a); out.set(b, a.length)
	return out
}

t('encode mono 16-bit', async () => {
	let enc = await flac({ sampleRate: 44100 })
	let encoded = enc.encode([sine(44100, 440, 1)])
	let flushed = enc.flush()
	let buf = concat(encoded, flushed)
	ok(buf instanceof Uint8Array)
	ok(buf.length > 0)
	// fLaC magic is at start of first encode output
	is(buf[0], 0x66, 'f')
	is(buf[1], 0x4C, 'L')
	is(buf[2], 0x61, 'a')
	is(buf[3], 0x43, 'C')
})

t('encode stereo', async () => {
	let enc = await flac({ sampleRate: 44100, channels: 2 })
	let encoded = enc.encode([sine(44100, 440, 1), sine(44100, 880, 1)])
	let flushed = enc.flush()
	let buf = concat(encoded, flushed)
	ok(buf.length > 0)
	is(buf[0], 0x66, 'f')
})

t('compression levels', async () => {
	let data = [sine(44100, 440, 2)]

	let enc0 = await flac({ sampleRate: 44100, compression: 0 })
	let buf0 = concat(enc0.encode(data), enc0.flush())

	let enc8 = await flac({ sampleRate: 44100, compression: 8 })
	let buf8 = concat(enc8.encode(data), enc8.flush())

	ok(buf8.length <= buf0.length, `comp8 ${buf8.length} <= comp0 ${buf0.length}`)
})
