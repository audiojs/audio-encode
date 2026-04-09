type AudioInput = Float32Array[] | Float32Array | { numberOfChannels: number; getChannelData(i: number): Float32Array };

export interface EncodeOptions {
	/** Output sample rate (required). */
	sampleRate: number;
	/** Output channel count. */
	channels?: number;
	/** Target bitrate in kbps (lossy). */
	bitrate?: number;
	/** Quality 0-10 (VBR, format-specific). */
	quality?: number;
	/** Bit depth: 16|32 for wav, 16|24 for aiff/flac. */
	bitDepth?: number;
	/** FLAC compression level 0-8. */
	compression?: number;
	/** Opus application: 'audio', 'voip', 'lowdelay'. */
	application?: string;
	[key: string]: any;
}

export interface StreamEncoder {
	/** Encode a chunk of audio. */
	(channelData: AudioInput): Promise<Uint8Array>;
	/** Flush remaining data, finalize, and free resources. */
	(): Promise<Uint8Array>;
	/** Flush without freeing. */
	flush(): Promise<Uint8Array>;
	/** Free resources without flushing. */
	free(): void;
}

export interface FormatEncoder {
	/** Whole-file encode. */
	(channelData: AudioInput, opts: EncodeOptions): Promise<Uint8Array>;
	/** Chunked encode from async iterable. */
	(source: AsyncIterable<AudioInput>, opts: EncodeOptions): AsyncGenerator<Uint8Array>;
	/** Create streaming encoder. */
	(opts: EncodeOptions): Promise<StreamEncoder>;
}

declare const encode: {
	/** Whole-file encode. */
	(format: string, channelData: AudioInput, opts: EncodeOptions): Promise<Uint8Array>;
	/** Chunked encode from async iterable. */
	(format: string, source: AsyncIterable<AudioInput>, opts: EncodeOptions): AsyncGenerator<Uint8Array>;
	/** Create streaming encoder. */
	(format: string, opts: EncodeOptions): Promise<StreamEncoder>;

	wav: FormatEncoder;
	aiff: FormatEncoder;
	mp3: FormatEncoder;
	ogg: FormatEncoder;
	flac: FormatEncoder;
	opus: FormatEncoder;
	[format: string]: FormatEncoder;
};

export default encode;

/** Chunked encode from async iterable. */
export function encodeChunked(
	source: AsyncIterable<AudioInput>,
	format: string,
	opts: EncodeOptions
): AsyncGenerator<Uint8Array>;

/** Wrap codec callbacks into a StreamEncoder with lifecycle management. */
export function streamEncoder(
	onEncode: (channels: Float32Array[]) => Uint8Array | Promise<Uint8Array>,
	onFlush?: (() => Uint8Array | Promise<Uint8Array>) | null,
	onFree?: (() => void) | null
): StreamEncoder;
