import t, { is, ok } from 'tst'
import aiff from './aiff-encode.js'

function sine(rate, freq, dur) {
	let n = rate * dur, d = new Float32Array(n)
	for (let i = 0; i < n; i++) d[i] = Math.sin(2 * Math.PI * freq * i / rate)
	return d
}

t('mono 16-bit', async () => {
	let enc = await aiff({ sampleRate: 44100, bitDepth: 16 })
	enc.encode([sine(44100, 440, 0.1)])
	let buf = enc.flush()
	ok(buf instanceof Uint8Array)
	ok(buf.length > 54, 'has data beyond header')
	let dv = new DataView(buf.buffer)
	is(dv.getUint32(0), 0x464F524D, 'FORM')
	is(dv.getUint32(8), 0x41494646, 'AIFF')
	is(dv.getInt16(20, false), 1, 'mono')
})

t('stereo 24-bit', async () => {
	let enc = await aiff({ sampleRate: 48000, bitDepth: 24 })
	enc.encode([sine(48000, 440, 0.1), sine(48000, 880, 0.1)])
	let buf = enc.flush()
	ok(buf.length > 54)
	let dv = new DataView(buf.buffer)
	is(dv.getInt16(20, false), 2, 'stereo')
})

t('streaming chunks', async () => {
	let enc = await aiff({ sampleRate: 44100 })
	enc.encode([sine(44100, 440, 0.05)])
	enc.encode([sine(44100, 440, 0.05)])
	let full = enc.flush()
	ok(full.length > 54, 'full file has header + data')
})
