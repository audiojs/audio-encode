/**
 * Chunked encoder — re-exports encodeChunked from main module.
 * @module encode-audio/stream
 *
 * for await (let bytes of encode.mp3(pcmSource, { sampleRate: 44100 })) { ... }
 */
export { encodeChunked as default, encodeChunked } from './audio-encode.js'
