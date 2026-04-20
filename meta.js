/**
 * Meta writers — re-export from codec packages.
 * @module encode-audio/meta
 *
 * import { wav, mp3, flac } from 'encode-audio/meta'
 * let out = wav(bytes, { meta, markers, regions })
 */

export { writeMeta as wav } from '@audio/encode-wav/meta'
export { writeMeta as mp3 } from '@audio/encode-mp3/meta'
export { writeMeta as flac } from '@audio/encode-flac/meta'
