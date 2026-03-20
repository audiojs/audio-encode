export interface OggEncodeOptions {
	sampleRate: number;
	quality?: number;
	channels?: number;
}

export interface StreamEncoder {
	encode(channels: Float32Array[]): Uint8Array;
	flush(): Uint8Array;
	free(): void;
}

export default function ogg(opts: OggEncodeOptions): Promise<StreamEncoder>;
