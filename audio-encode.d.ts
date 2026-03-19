export interface StreamEncoder {
	/** Encode a chunk of audio. */
	encode(channelData: Float32Array[] | Float32Array): Promise<Uint8Array>;
	/** Flush remaining data, finalize, and free resources. */
	encode(): Promise<Uint8Array>;
	/** Flush without freeing. */
	flush(): Promise<Uint8Array>;
	/** Free resources without flushing. */
	free(): void;
}

export interface EncodeOptions {
	/** Output sample rate (required). */
	sampleRate: number;
	/** Output channel count. */
	channels?: number;
	/** Target bitrate in kbps (lossy). */
	bitrate?: number;
	/** Quality 0-10 (VBR, format-specific). */
	quality?: number;
	[key: string]: any;
}

export interface FormatEncoder {
	(channelData: Float32Array[] | Float32Array, opts: EncodeOptions): Promise<Uint8Array>;
	stream(opts: EncodeOptions): Promise<StreamEncoder>;
}

/** Encoder registry. Formats attached as encode.wav, encode.mp3, etc. */
declare const encode: {
	[format: string]: FormatEncoder;
};

export default encode;

/** Wrap codec callbacks into a StreamEncoder with lifecycle management. */
export function streamEncoder(
	onEncode: (channels: Float32Array[]) => Uint8Array | Promise<Uint8Array>,
	onFlush?: (() => Uint8Array | Promise<Uint8Array>) | null,
	onFree?: (() => void) | null
): StreamEncoder;

/** Wrap a stream factory into whole-file encoder + .stream property. */
export function fmt(
	init: (opts: EncodeOptions) => Promise<StreamEncoder>
): FormatEncoder;

/** Normalize input to Float32Array[]. */
export function channels(data: Float32Array[] | Float32Array | null): Float32Array[];

/** Ensure result is Uint8Array. */
export function norm(r: any): Uint8Array;

/** Concatenate two Uint8Arrays. */
export function merge(a: Uint8Array, b: Uint8Array): Uint8Array;
