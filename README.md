# audio-encode [![test](https://github.com/audiojs/audio-encode/actions/workflows/test.js.yml/badge.svg)](https://github.com/audiojs/audio-encode/actions/workflows/test.js.yml)

Encode raw audio samples to any format.<br>
JS / WASM – no ffmpeg, no native bindings, works in both node and browser.<br>
Small API, minimal size, near-native performance, stream encoding.

[![npm install encode-audio](https://nodei.co/npm/encode-audio.png?mini=true)](https://npmjs.org/package/encode-audio/)

```js
import encode from 'encode-audio';

const buf = await encode.wav(channelData, { sampleRate: 44100 });
```

#### Supported formats:

| Format | Package | Engine |
|--------|---------|--------|
| WAV | [@audio/wav-encode](https://npmjs.com/package/@audio/wav-encode) | JS |
| MP3 | [@audio/mp3-encode](https://npmjs.com/package/@audio/mp3-encode) | WASM |
| OGG Vorbis | [@audio/ogg-encode](https://npmjs.com/package/@audio/ogg-encode) | WASM |
| Opus | [@audio/opus-encode](https://npmjs.com/package/@audio/opus-encode) | WASM |
| FLAC | [@audio/flac-encode](https://npmjs.com/package/@audio/flac-encode) | WASM |
| AIFF | [@audio/aiff-encode](https://npmjs.com/package/@audio/aiff-encode) | JS |

### Whole-file encode

Specify the format as method name. Input is _Float32Array[]_ (one per channel), a single _Float32Array_ (mono), or an [AudioBuffer](https://npmjs.com/package/audio-buffer).

```js
import encode from 'encode-audio';

const wav  = await encode.wav(channelData, { sampleRate: 44100 });
const aiff = await encode.aiff(channelData, { sampleRate: 44100 });
const mp3  = await encode.mp3(channelData, { sampleRate: 44100, bitrate: 128 });
const ogg  = await encode.ogg(channelData, { sampleRate: 44100, quality: 5 });
const flac = await encode.flac(channelData, { sampleRate: 44100 });
const opus = await encode.opus(channelData, { sampleRate: 48000, bitrate: 96 });
```

### Chunked encoding

Call with just options (no data) to create a streaming encoder:

```js
import encode from 'encode-audio';

const enc = await encode.mp3({ sampleRate: 44100, bitrate: 128 });

const a = await enc(chunk1);  // Uint8Array
const b = await enc(chunk2);
const c = await enc(null);        // end of stream — flush + free

// explicit control: enc.flush(), enc.free()
```

### TransformStream

```js
import encodeStream from 'encode-audio/stream';

audioSource
  .pipeThrough(encodeStream('mp3', { sampleRate: 44100, bitrate: 128 }))
  .pipeTo(destination);
```

### Options

| Option | Description | Applies to |
|--------|-------------|------------|
| `sampleRate` | Output sample rate (required) | all |
| `bitrate` | Target bitrate in kbps | mp3, opus |
| `quality` | Quality 0–10 (VBR) | ogg, mp3 |
| `channels` | Output channel count | all |
| `bitDepth` | Bit depth: 16 or 32 (wav), 16 or 24 (aiff, flac) | wav, aiff, flac |
| `compression` | FLAC compression level 0–8 | flac |
| `application` | `'audio'`, `'voip'`, or `'lowdelay'` | opus |


## See also

* [audio-decode](https://github.com/audiojs/audio-decode) – decode any audio format to raw samples.
* [wasm-media-encoders](https://github.com/arseneyr/wasm-media-encoders) – compact WASM MP3 & Vorbis encoders.
* [AudioEncoder](https://developer.mozilla.org/en-US/docs/Web/API/AudioEncoder) – native WebCodecs encoder API.

## License

[MIT](LICENSE)

<a href="https://github.com/krishnized/license/">ॐ</a>
