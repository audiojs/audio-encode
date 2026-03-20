export interface AiffEncodeOptions {
	sampleRate: number;
	bitDepth?: 16 | 24;
}

export interface StreamEncoder {
	encode(channels: Float32Array[]): Uint8Array;
	flush(): Uint8Array;
	free(): void;
}

export default function aiff(opts: AiffEncodeOptions): Promise<StreamEncoder>;
