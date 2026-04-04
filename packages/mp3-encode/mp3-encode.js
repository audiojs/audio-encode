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

	return { encode, flush, free }

	function encode(ch) {
		// returned buffer is owned by encoder — must copy
		let raw = encoder.encode(ch)
		return new Uint8Array(raw)
	}

	function flush() {
		let raw = encoder.finalize()
		return new Uint8Array(raw)
	}

	function free() {
		encoder = null
	}
}
