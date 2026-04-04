import t, { is, ok } from 'tst'
import opus from './opus-encode.js'

function sine(rate, freq, dur) {
	let n = rate * dur, d = new Float32Array(n)
	for (let i = 0; i < n; i++) d[i] = Math.sin(2 * Math.PI * freq * i / rate)
	return d
}

t('encode mono', async () => {
	let enc = await opus({ sampleRate: 48000, channels: 1, bitrate: 64 })
	enc.encode([sine(48000, 440, 0.5)])
	let buf = enc.flush()
	ok(buf instanceof Uint8Array)
	ok(buf.length > 0)
	is(buf[0], 0x4F, 'O')
	is(buf[1], 0x67, 'g')
	is(buf[2], 0x67, 'g')
	is(buf[3], 0x53, 'S')
})

t('encode with resampling from 44100', async () => {
	let enc = await opus({ sampleRate: 44100, channels: 1 })
	enc.encode([sine(44100, 440, 0.5)])
	let buf = enc.flush()
	ok(buf.length > 0, 'resampled and encoded')
})

t('stereo', async () => {
	let enc = await opus({ sampleRate: 48000, channels: 2, bitrate: 128 })
	enc.encode([sine(48000, 440, 0.5), sine(48000, 880, 0.5)])
	let buf = enc.flush()
	ok(buf.length > 0)
})

t('streaming chunks', async () => {
	let enc = await opus({ sampleRate: 48000, channels: 1 })
	let c1 = enc.encode([sine(48000, 440, 0.2)])
	let c2 = enc.encode([sine(48000, 440, 0.2)])
	let final = enc.flush()
	ok(c1.length > 0 || c2.length > 0 || final.length > 0, 'produced output')
	enc.free()
})
