import t, { is, ok, almost } from 'tst'
import encode, { streamEncoder, fmt, channels, norm, merge } from './audio-encode.js'
import decode from 'audio-decode'
// --- test utilities ---

function sine(sampleRate = 44100, freq = 440, duration = 1) {
	let n = sampleRate * duration
	let data = new Float32Array(n)
	for (let i = 0; i < n; i++) data[i] = Math.sin(2 * Math.PI * freq * i / sampleRate)
	return [data]
}

function rms(arr) {
	let sum = 0
	for (let i = 0; i < arr.length; i++) sum += arr[i] * arr[i]
	return Math.sqrt(sum / arr.length)
}

// decode lena wav to get reference audio
let lenaPCM
async function getLena() {
	if (!lenaPCM) {
		let wav = (await import('audio-lena/wav')).default
		lenaPCM = await decode(wav)
	}
	return lenaPCM
}

// --- core helpers ---

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
	is(norm(null).length, 0)
	let buf = new Uint8Array([1, 2, 3])
	is(norm(buf), buf)
	ok(norm(new Int8Array([1, 2])) instanceof Uint8Array)
})

t('merge', () => {
	let a = new Uint8Array([1, 2]), b = new Uint8Array([3, 4])
	is(merge(a, b).length, 4)
	is(merge(a, null), a)
	is(merge(null, b), b)
})

t('streamEncoder', async () => {
	let enc = streamEncoder(
		ch => new Uint8Array([ch[0].length]),
		() => new Uint8Array([0xFF]),
		() => {}
	)
	let r1 = await enc.encode([new Float32Array([1, 2, 3])])
	is(r1[0], 3)
	let r2 = await enc.encode()
	is(r2[0], 0xFF)
	is((await enc.encode()).length, 0)
})

t('fmt', async () => {
	let encoder = fmt(async (opts) => streamEncoder(
		ch => new Uint8Array(ch[0].length * 2),
		() => new Uint8Array([0xFE]),
		() => {}
	))
	is(typeof encoder, 'function')
	is(typeof encoder.stream, 'function')
	let result = await encoder([new Float32Array(100)], { sampleRate: 44100 })
	is(result.length, 201)
})

// --- format round-trip tests with lena ---

t('wav round-trip (lena)', async () => {
	let { channelData, sampleRate } = await getLena()
	let buf = await encode.wav(channelData, { sampleRate })
	ok(buf.length > 44, 'has data')
	let dec = await decode(buf)
	is(dec.sampleRate, sampleRate)
	is(dec.channelData.length, channelData.length)
	almost(rms(dec.channelData[0]), rms(channelData[0]), 0.001, 'rms matches')
})

t('aiff encode (lena)', async () => {
	let { channelData, sampleRate } = await getLena()
	let buf = await encode.aiff(channelData, { sampleRate })
	ok(buf.length > 54, 'has data')
	let dv = new DataView(buf.buffer)
	is(dv.getUint32(0), 0x464F524D, 'FORM')
	is(dv.getUint32(8), 0x41494646, 'AIFF')
	is(dv.getInt16(20, false), 1, 'mono')
})

t('mp3 round-trip (lena)', async () => {
	let { channelData, sampleRate } = await getLena()
	let buf = await encode.mp3(channelData, { sampleRate, channels: 1, bitrate: 128 })
	ok(buf.length > 0)
	let dec = await decode(buf)
	is(dec.sampleRate, sampleRate)
	almost(rms(dec.channelData[0]), rms(channelData[0]), 0.05, 'rms within lossy tolerance')
})

t('ogg round-trip (lena)', async () => {
	let { channelData, sampleRate } = await getLena()
	let buf = await encode.ogg(channelData, { sampleRate, channels: 1, quality: 5 })
	ok(buf.length > 0)
	let dec = await decode(buf)
	is(dec.sampleRate, sampleRate)
	almost(rms(dec.channelData[0]), rms(channelData[0]), 0.05, 'rms within lossy tolerance')
})

t('flac round-trip (lena)', async () => {
	let { channelData, sampleRate } = await getLena()
	let buf = await encode.flac(channelData, { sampleRate })
	ok(buf.length > 0)
	let dec = await decode(buf)
	is(dec.sampleRate, sampleRate)
	is(dec.channelData.length, 1)
	almost(rms(dec.channelData[0]), rms(channelData[0]), 0.001, 'rms near-identical (lossless)')
})

t('opus round-trip (lena)', async () => {
	let { channelData, sampleRate } = await getLena()
	let buf = await encode.opus(channelData, { sampleRate, channels: 1, bitrate: 96 })
	ok(buf.length > 0)
	let dec = await decode(buf)
	is(dec.sampleRate, 48000) // opus always decodes at 48kHz
	almost(rms(dec.channelData[0]), rms(channelData[0]), 0.05, 'rms within lossy tolerance')
})

t('wav streaming', async () => {
	let enc = await encode.wav.stream({ sampleRate: 44100 })
	let c1 = await enc.encode(sine(44100, 440, 0.5))
	let c2 = await enc.encode(sine(44100, 440, 0.5))
	let final = await enc.encode()
	ok(c1.length > 0 || c2.length > 0 || final.length > 0)
})
