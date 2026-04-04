import t, { is, ok } from 'tst'
import wav from './wav-encode.js'

function sine(rate, freq, dur) {
	let n = rate * dur, d = new Float32Array(n)
	for (let i = 0; i < n; i++) d[i] = Math.sin(2 * Math.PI * freq * i / rate)
	return d
}

t('mono 16-bit', async () => {
	let enc = await wav({ sampleRate: 44100, bitDepth: 16 })
	enc.encode([sine(44100, 440, 0.1)])
	let buf = enc.flush()
	ok(buf instanceof Uint8Array)
	ok(buf.length > 44, 'has data beyond header')
	let dv = new DataView(buf.buffer)
	is(dv.getUint32(0), 0x52494646, 'RIFF')
	is(dv.getUint32(8), 0x57415645, 'WAVE')
	is(dv.getUint16(20, true), 1, 'PCM format')
	is(dv.getUint16(22, true), 1, 'mono')
	is(dv.getUint32(24, true), 44100, 'sample rate')
	is(dv.getUint16(34, true), 16, 'bit depth')
})

t('stereo 32-bit float', async () => {
	let enc = await wav({ sampleRate: 48000, bitDepth: 32 })
	enc.encode([sine(48000, 440, 0.1), sine(48000, 880, 0.1)])
	let buf = enc.flush()
	let dv = new DataView(buf.buffer)
	is(dv.getUint16(20, true), 3, 'float format')
	is(dv.getUint16(22, true), 2, 'stereo')
	is(dv.getUint32(24, true), 48000, 'sample rate')
	is(dv.getUint16(34, true), 32, 'bit depth')
})

t('streaming chunks', async () => {
	let enc = await wav({ sampleRate: 44100 })
	enc.encode([sine(44100, 440, 0.05)])
	enc.encode([sine(44100, 440, 0.05)])
	let full = enc.flush()
	ok(full.length > 44, 'has header + data')
	let dv = new DataView(full.buffer)
	let samples = 44100 * 0.05 * 2 // two chunks
	is(dv.getUint32(40, true), samples * 2, 'data size')
})
