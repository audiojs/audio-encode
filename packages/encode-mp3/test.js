import t, { is, ok } from 'tst'
import mp3 from './mp3-encode.js'

function sine(rate, freq, dur) {
	let n = rate * dur, d = new Float32Array(n)
	for (let i = 0; i < n; i++) d[i] = Math.sin(2 * Math.PI * freq * i / rate)
	return d
}

t('encode mono CBR', async () => {
	let enc = await mp3({ sampleRate: 44100, channels: 1, bitrate: 128 })
	let chunk = enc.encode([sine(44100, 440, 1)])
	ok(chunk instanceof Uint8Array)
	ok(chunk.length > 0, 'has encoded data')
	let final = enc.flush()
	ok(final instanceof Uint8Array)
})

t('encode stereo', async () => {
	let enc = await mp3({ sampleRate: 44100, channels: 2, bitrate: 192 })
	enc.encode([sine(44100, 440, 0.5), sine(44100, 880, 0.5)])
	let final = enc.flush()
	ok(final.length > 0)
})

t('VBR mode', async () => {
	let enc = await mp3({ sampleRate: 44100, channels: 1, quality: 2 })
	enc.encode([sine(44100, 440, 0.5)])
	let buf = enc.flush()
	ok(buf.length > 0)
})

t('large stereo (30min 48kHz)', async () => {
	let sr = 48000, dur = 1800, n = sr * dur
	let ch = new Float32Array(n)
	for (let i = 0; i < n; i++) ch[i] = 0.3 * Math.sin(2 * Math.PI * 440 * i / sr)
	let enc = await mp3({ sampleRate: sr, channels: 2, bitrate: 128 })
	let out = enc.encode([ch, new Float32Array(ch)])
	ok(out.length > 0, 'has encoded data: ' + (out.length / 1e6).toFixed(1) + 'MB')
	let final = enc.flush()
	ok(out.length + final.length > 1e6, 'total > 1MB')
})
