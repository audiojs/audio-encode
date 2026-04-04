export interface Mp3EncodeOptions {
	sampleRate: number;
	bitrate?: number;
	quality?: number;
	channels?: number;
}

export interface StreamEncoder {
	encode(channels: Float32Array[]): Uint8Array;
	flush(): Uint8Array;
	free(): void;
}

export default function mp3(opts: Mp3EncodeOptions): Promise<StreamEncoder>;
