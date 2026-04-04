export interface WavEncodeOptions {
	sampleRate: number;
	bitDepth?: 16 | 32;
}

export interface StreamEncoder {
	encode(channels: Float32Array[]): Uint8Array;
	flush(): Uint8Array;
	free(): void;
}

export default function wav(opts: WavEncodeOptions): Promise<StreamEncoder>;
