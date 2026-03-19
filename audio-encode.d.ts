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
	/** Bit depth: 16|32 for wav, 16|24 for aiff/flac. */
	bitDepth?: number;
	/** FLAC compression level 0-8. */
	compression?: number;
	/** Opus application: 'audio', 'voip', 'lowdelay'. */
	application?: string;
	[key: string]: any;
}

export interface FormatEncoder {
	(channelData: Float32Array[] | Float32Array, opts: EncodeOptions): Promise<Uint8Array>;
	stream(opts: EncodeOptions): Promise<StreamEncoder>;
}

declare const encode: {
	wav: FormatEncoder;
	aiff: FormatEncoder;
	mp3: FormatEncoder;
	ogg: FormatEncoder;
	flac: FormatEncoder;
	opus: FormatEncoder;
	[format: string]: FormatEncoder;
};

export default encode;

/** Wrap codec callbacks into a StreamEncoder with lifecycle management. */
export function streamEncoder(
	onEncode: (channels: Float32Array[]) => Uint8Array | Promise<Uint8Array>,
	onFlush?: (() => Uint8Array | Promise<Uint8Array>) | null,
	onFree?: (() => void) | null
): StreamEncoder;
