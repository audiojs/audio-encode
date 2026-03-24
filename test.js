import t, { is, ok, almost } from 'tst'
import encode from './audio-encode.js'
import encodeStream from './stream.js'
import decode from 'audio-decode'
import AudioBuffer from 'audio-buffer'

function rms(arr) {
	let sum = 0
	for (let i = 0; i < arr.length; i++) sum += arr[i] * arr[i]
	return Math.sqrt(sum / arr.length)
}

function sine(sr = 44100, freq = 440, dur = 1) {
	let n = sr * dur, d = new Float32Array(n)
	for (let i = 0; i < n; i++) d[i] = Math.sin(2 * Math.PI * freq * i / sr)
	return [d]
}

let lenaPCM
async function getLena() {
	if (!lenaPCM) lenaPCM = await decode((await import('audio-lena/wav')).default)
	return lenaPCM
}

// --- format round-trip tests with lena ---

t('wav round-trip', async () => {
	let { channelData, sampleRate } = await getLena()
	let buf = await encode.wav(channelData, { sampleRate })
	ok(buf.length > 44, 'has data')
	let dec = await decode(buf)
	is(dec.sampleRate, sampleRate)
	is(dec.channelData.length, channelData.length)
	almost(rms(dec.channelData[0]), rms(channelData[0]), 0.001, 'rms matches')
})

t('aiff encode', async () => {
	let { channelData, sampleRate } = await getLena()
	let buf = await encode.aiff(channelData, { sampleRate })
	ok(buf.length > 54, 'has data')
	let dv = new DataView(buf.buffer)
	is(dv.getUint32(0), 0x464F524D, 'FORM')
	is(dv.getUint32(8), 0x41494646, 'AIFF')
	is(dv.getInt16(20, false), 1, 'mono')
})

t('mp3 round-trip', async () => {
	let { channelData, sampleRate } = await getLena()
	let buf = await encode.mp3(channelData, { sampleRate, channels: 1, bitrate: 128 })
	ok(buf.length > 0)
	let dec = await decode(buf)
	is(dec.sampleRate, sampleRate)
	almost(rms(dec.channelData[0]), rms(channelData[0]), 0.05, 'rms within lossy tolerance')
})

t('ogg round-trip', async () => {
	let { channelData, sampleRate } = await getLena()
	let buf = await encode.ogg(channelData, { sampleRate, channels: 1, quality: 5 })
	ok(buf.length > 0)
	let dec = await decode(buf)
	is(dec.sampleRate, sampleRate)
	almost(rms(dec.channelData[0]), rms(channelData[0]), 0.05, 'rms within lossy tolerance')
})

t('flac round-trip', async () => {
	let { channelData, sampleRate } = await getLena()
	let buf = await encode.flac(channelData, { sampleRate })
	ok(buf.length > 0)
	let dec = await decode(buf)
	is(dec.sampleRate, sampleRate)
	is(dec.channelData.length, 1)
	almost(rms(dec.channelData[0]), rms(channelData[0]), 0.001, 'rms near-identical (lossless)')
})

t('opus round-trip', async () => {
	let { channelData, sampleRate } = await getLena()
	let buf = await encode.opus(channelData, { sampleRate, channels: 1, bitrate: 96 })
	ok(buf.length > 0)
	let dec = await decode(buf)
	is(dec.sampleRate, 48000)
	almost(rms(dec.channelData[0]), rms(channelData[0]), 0.05, 'rms within lossy tolerance')
})

t('streaming (callable)', async () => {
	let enc = await encode.wav({ sampleRate: 44100 })
	let c1 = await enc(sine(44100, 440, 0.5))
	let c2 = await enc(sine(44100, 440, 0.5))
	let final = await enc()
	ok(c1.length > 0 || c2.length > 0 || final.length > 0)
})

t('streaming (deprecated .stream/.encode)', async () => {
	let enc = await encode.wav.stream({ sampleRate: 44100 })
	let c1 = await enc.encode(sine(44100, 440, 0.5))
	let c2 = await enc.encode(sine(44100, 440, 0.5))
	let final = await enc.encode()
	ok(c1.length > 0 || c2.length > 0 || final.length > 0)
})

t('TransformStream', async () => {
	let chunks = [sine(44100, 440, 0.5), sine(44100, 440, 0.5)]
	let source = new ReadableStream({
		pull(ctrl) { chunks.length ? ctrl.enqueue(chunks.shift()) : ctrl.close() }
	})
	let out = []
	let dest = new WritableStream({ write(chunk) { out.push(chunk) } })
	await source.pipeThrough(encodeStream('wav', { sampleRate: 44100 })).pipeTo(dest)
	ok(out.length > 0, 'produced chunks')
	ok(out.every(c => c instanceof Uint8Array), 'all Uint8Array')
})

t('AudioBuffer input', async () => {
	let ab = new AudioBuffer({ sampleRate: 44100, length: 44100 })
	let ch = ab.getChannelData(0)
	for (let i = 0; i < ch.length; i++) ch[i] = Math.sin(2 * Math.PI * 440 * i / 44100)
	let buf = await encode.wav(ab, { sampleRate: 44100 })
	ok(buf.length > 44, 'encodes AudioBuffer')
	let dec = await decode(buf)
	is(dec.sampleRate, 44100)
	almost(rms(dec.channelData[0]), rms(ch), 0.001, 'rms matches')
})
