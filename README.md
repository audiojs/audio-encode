# audio-encode [![test](https://github.com/audiojs/audio-encode/actions/workflows/test.js.yml/badge.svg)](https://github.com/audiojs/audio-encode/actions/workflows/test.js.yml)

Encode raw audio samples to any format.<br>
JS / WASM – no ffmpeg, no native bindings, works in both node and browser.<br>
Small API, minimal size, near-native performance, stream encoding.

[![npm install audio-encode](https://nodei.co/npm/audio-encode.png?mini=true)](https://npmjs.org/package/audio-encode/)

```js
import encode from 'audio-encode';

const buf = await encode.wav(channelData, { sampleRate: 44100 });
```

#### Supported formats:

| Format | Package | Engine |
|--------|---------|--------|
| WAV | built-in | JS |
| MP3 | [wasm-media-encoders](https://github.com/nicodemus26/wasm-media-encoders) | WASM |
| OGG Vorbis | [wasm-media-encoders](https://github.com/nicodemus26/wasm-media-encoders) | WASM |
| Opus | TBD | WASM |
| FLAC | [libflac.js](https://github.com/nicodemus26/libflac.js) | WASM |
| AAC / M4A | TBD | WASM |
| AIFF | built-in | JS |
| WebM | TBD | WASM |

### Whole-file encode

Specify the format as method name. Input is _Float32Array[]_ (one per channel) or a single _Float32Array_ (mono).

```js
import encode from 'audio-encode';

const wav = await encode.wav(channelData, { sampleRate: 44100 });
const mp3 = await encode.mp3(channelData, { sampleRate: 44100, bitrate: 128 });
const ogg = await encode.ogg(channelData, { sampleRate: 44100, quality: 5 });
```

### Stream encoding

For chunk-by-chunk encoding, use `.stream()`:

```js
import encode from 'audio-encode';

const encoder = await encode.mp3.stream({ sampleRate: 44100, bitrate: 128 });

const a = await encoder.encode(chunk1);  // Uint8Array
const b = await encoder.encode(chunk2);
const c = await encoder.encode();        // end of stream — flush + free

// explicit methods
// encoder.flush(), encoder.free()
```

### Options

| Option | Description | Applies to |
|--------|-------------|------------|
| `sampleRate` | Output sample rate (required) | all |
| `bitrate` | Target bitrate in kbps | mp3, aac, opus |
| `quality` | Quality 0–10 (VBR) | ogg, mp3 |
| `channels` | Output channel count | all |

### Custom encoders

The `encode` registry is extensible:

```js
import encode from 'audio-encode';
encode.myformat = Object.assign(
  async (data, opts) => { /* ... */ },
  { stream: async (opts) => ({ encode: chunk => ..., free() {} }) }
);
```

## See also

* [audio-decode](https://github.com/audiojs/audio-decode) – decode any audio format to raw samples.
* [wasm-media-encoders](https://github.com/nicodemus26/wasm-media-encoders) – compact WASM MP3 & Vorbis encoders.
* [AudioEncoder](https://developer.mozilla.org/en-US/docs/Web/API/AudioEncoder) – native WebCodecs encoder API.
* [ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) – full encoding/decoding library.

## License

[MIT](LICENSE)

<a href="https://github.com/krishnized/license/">ॐ</a>
