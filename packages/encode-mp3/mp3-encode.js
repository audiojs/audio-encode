// requires: wasm-media-encoders
import { createMp3Encoder } from 'wasm-media-encoders'

/**
 * MP3 encoder — browser + Node, via wasm-media-encoders
 *
 * @param {Object} opts
 * @param {number} opts.sampleRate - required
 * @param {number} [opts.bitrate=128] - kbps (CBR)
 * @param {number} [opts.quality] - 0-9 VBR quality (0=best, 9=worst). If set, uses VBR mode.
 * @param {number} [opts.channels] - 1 or 2
 * @returns {{ encode, flush, free }}
 *
 * encode(channels: Float32Array[]) → Uint8Array
 * flush() → Uint8Array
 * free() → void
 */
export default async function mp3(opts) {
	let { sampleRate, bitrate = 128, quality, channels } = opts
	if (!channels || channels < 1 || channels > 2) channels = 2

	let encoder = await createMp3Encoder()

	let cfg = { sampleRate, channels }
	if (quality != null) cfg.vbrQuality = quality
	else cfg.bitrate = bitrate

	encoder.configure(cfg)

	// WASM encoder has ~320MB/channel buffer limit.
	// Chunk large inputs in 1152*1024 (~1.18M) sample blocks.
	const CHUNK = 1152 * 1024

	return { encode, flush, free }

	function encode(ch) {
		let n = ch[0].length
		if (n <= CHUNK) {
			let raw = encoder.encode(ch)
			return new Uint8Array(raw)
		}
		let parts = []
		for (let i = 0; i < n; i += CHUNK) {
			let end = Math.min(i + CHUNK, n)
			let slice = ch.map(c => c.subarray(i, end))
			let raw = encoder.encode(slice)
			if (raw.length) parts.push(new Uint8Array(raw))
		}
		let total = 0
		for (let p of parts) total += p.length
		let out = new Uint8Array(total)
		let off = 0
		for (let p of parts) { out.set(p, off); off += p.length }
		return out
	}

	function flush() {
		let raw = encoder.finalize()
		return new Uint8Array(raw)
	}

	function free() {
		encoder = null
	}
}
