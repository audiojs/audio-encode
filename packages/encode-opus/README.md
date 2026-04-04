# @audio/opus-encode

Encode PCM audio samples to Ogg Opus format.<br>
WASM (libopus via opusscript) with built-in Ogg muxer — works in both node and browser.

[![npm install @audio/opus-encode](https://nodei.co/npm/@audio/opus-encode.png?mini=true)](https://npmjs.org/package/@audio/opus-encode/)

```js
import opus from '@audio/opus-encode';

const encoder = await opus({ sampleRate: 48000, channels: 1, bitrate: 96 });
const chunk = encoder.encode(channelData); // → Uint8Array (Ogg pages)
const tail = encoder.flush();              // → Uint8Array (remaining + EOS)
// concatenate chunk + tail for complete Ogg Opus file
```

### Options

| Option | Default | Description |
|--------|---------|-------------|
| `sampleRate` | — | Input sample rate (required). Resampled to 48kHz internally. |
| `channels` | `1` | `1` (mono) or `2` (stereo) |
| `bitrate` | `64` | Target bitrate in kbps |
| `application` | `'audio'` | `'audio'`, `'voip'`, or `'lowdelay'` |

Opus always encodes at 48kHz. If the input sample rate differs, Lanczos-3 resampling is applied automatically.

### Streaming

```js
const encoder = await opus({ sampleRate: 44100, channels: 1, bitrate: 128 });
const a = encoder.encode(chunk1); // → Uint8Array (Ogg pages with headers)
const b = encoder.encode(chunk2); // → Uint8Array (Ogg audio pages)
const c = encoder.flush();        // → Uint8Array (final page + EOS)
// complete Ogg Opus = concat(a, b, c)
encoder.free();
```

## License

[MIT](LICENSE)

<a href="https://github.com/krishnized/license/">ॐ</a>
