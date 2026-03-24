type AudioInput = Float32Array[] | Float32Array | { numberOfChannels: number; getChannelData(i: number): Float32Array };

/**
 * Create a TransformStream that encodes audio chunks to the given format.
 * @param format - 'wav', 'mp3', 'ogg', 'opus', 'flac', 'aiff'
 * @param opts - encoder options (sampleRate required)
 */
export default function encodeStream(
	format: string,
	opts: import('./audio-encode.js').EncodeOptions
): TransformStream<AudioInput, Uint8Array>;
