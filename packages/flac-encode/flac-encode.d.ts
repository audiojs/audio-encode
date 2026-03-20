export interface FlacEncodeOptions {
	sampleRate: number;
	channels?: number;
	bitDepth?: 16 | 24;
	compression?: number;
}

export interface StreamEncoder {
	encode(channels: Float32Array[]): Uint8Array;
	flush(): Uint8Array;
	free(): void;
}

export default function flac(opts: FlacEncodeOptions): Promise<StreamEncoder>;
