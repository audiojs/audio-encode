# audio-encode

Reverse of [audio-decode](../audio-decode) — encode AudioData (`{ channelData, sampleRate }`) into binary format.
Individual packages under `@audio` org (npm: `@audio/*-encode`), united by umbrella `audio-encode`.
**Must work in both browser and Node.**

## Formats

All practical audio formats in use:

### Tier 1 — Essential (high demand, implement first)

| Format | Type | Strategy | Size | Dep |
|--------|------|----------|------|-----|
| **WAV** | Uncompressed PCM | Pure JS (~50 LOC). RIFF header + interleaved PCM. | 0 | none |
| **MP3** | Lossy | `wasm-media-encoders` (libmp3lame). 66 KB gz. Excellent. | tiny | wasm-media-encoders |
| **OGG Vorbis** | Lossy | `wasm-media-encoders` (libvorbis). 158 KB gz. | small | wasm-media-encoders |
| **Opus** | Lossy | libopus WASM. Best quality/bitrate ratio. ~300 KB. Needs Ogg muxer. | medium | libopus WASM (custom build or opusscript) |
| **FLAC** | Lossless | `libflacjs` (libFLAC WASM). ~500 KB. | medium | libflacjs |

### Tier 2 — Important

| Format | Type | Strategy | Size | Dep |
|--------|------|----------|------|-----|
| **AAC/M4A** | Lossy | Hardest format. No clean JS/WASM path. Options: libav.js (ffmpeg AAC, LGPL), or fdk-aac WASM (abandoned, license issues). | large | libav.js or custom fdk-aac WASM |
| **AIFF** | Uncompressed PCM | Pure JS (~80 LOC). IFF/AIFF header + big-endian PCM. | 0 | none |
| **WebM** | Container (Opus/Vorbis) | Opus encoder + WebM/Matroska muxer. | medium | opus encoder + muxer |

### Tier 3 — Niche / Legacy

| Format | Type | Strategy | Notes |
|--------|------|----------|-------|
| **QOA** | Lossy (simple) | Pure JS. qoa-format may have encoder. | Emerging format, very simple codec |
| **ALAC** | Lossless (Apple) | Apple's open-source ALAC → compile to WASM. Or libav.js. | Feasible but no existing WASM build |
| **CAF** | Container (Apple) | Pure JS container writer + codec. | Wraps PCM/AAC/ALAC |
| **AMR** | Lossy (telephony) | opencore-amr WASM. | Very niche |
| **WMA** | Lossy (Microsoft) | ffmpeg only. No open-source encoder lib. | Legacy, low priority |

### Not worth encoding (decode-only)

Formats that exist only for legacy playback and nobody encodes to intentionally:
- None excluded yet — even WMA has some enterprise use cases.

## API Design

Mirror of audio-decode, reversed direction. Same pattern should be applied to audio-decode as well (`decode.mp3.stream()`).

- `channelData` (Float32Array[]) is the payload — passed directly, not wrapped in an object
- `sampleRate` is session config — set once in options, cannot change between chunks
- Format is part of the method name, not an argument

### 1. Whole-file encode

```js
import encode from 'audio-encode'

let buf = await encode.wav(channelData, { sampleRate: 44100 })
let buf = await encode.mp3(channelData, { sampleRate: 44100, bitrate: 128 })
let buf = await encode.flac(channelData, { sampleRate: 44100 })
// → Uint8Array
```

### 2. Streaming encode

```js
import encode from 'audio-encode'

let enc = await encode.mp3.stream({ sampleRate: 44100, bitrate: 128 })
let chunk1 = enc.encode(channelData)   // → Uint8Array
let chunk2 = enc.encode(channelData2)  // → Uint8Array
let final  = enc.encode()              // flush + free → Uint8Array
```

StreamEncoder interface:
- `.encode(channelData)` → Uint8Array (encoded chunk)
- `.encode()` → Uint8Array (flush remaining + finalize + free)
- `.flush()` → Uint8Array (flush without freeing)
- `.free()` → void (discard without flushing)

### Common options

```
sampleRate  — output sample rate (required)
bitrate     — target bitrate in kbps (lossy formats)
quality     — quality level 0-10 (VBR, format-specific mapping)
channels    — output channel count (downmix/upmix)
```

### Individual @audio packages

Not required to exist as separate packages — umbrella wraps whatever underlying encoder lib exposes.
Own @audio packages may be created for consistency where it makes sense, but the API contract lives in the umbrella.
Same as audio-decode: some decoders are external packages, some are @audio, umbrella normalizes all.

## Implementation Order

### Phase 0: Scaffold ✓
* [x] `audio-encode` package.json, types, entry point skeleton
* [x] `streamEncoder()` helper (mirrors `streamDecoder()` from audio-decode)
* [x] `norm()` for encoding results, `merge()` for flushed chunks
* [x] Test harness: round-trip test pattern (encode → decode → compare)

### Phase 1: Pure JS formats (zero deps, prove the API)
* [ ] `@audio/wav-encode` — RIFF/WAV writer. 16-bit int + 32-bit float. Trivial.
* [ ] `@audio/aiff-encode` — IFF/AIFF writer. Big-endian PCM. Trivial.
* [ ] Wire into `audio-encode` umbrella, verify round-trip with audio-decode.

### Phase 2: Lightweight WASM (wasm-media-encoders)
* [ ] `@audio/mp3-encode` — wasm-media-encoders (libmp3lame). 66 KB gz. VBR/CBR, bitrate, quality.
* [ ] `@audio/ogg-encode` — wasm-media-encoders (libvorbis). 158 KB gz. Quality-based VBR.
* [ ] Wire into umbrella. Round-trip tests.

### Phase 3: Medium WASM
* [ ] `@audio/opus-encode` — libopus WASM + Ogg container. Evaluate: opusscript (battle-tested, 3.6M dl/wk for Discord) vs custom libopus 1.5.1 WASM build. Need Ogg muxer on top.
* [ ] `@audio/flac-encode` — libflacjs. Compression levels 0-8. Verify bit-perfect round-trip.
* [ ] Wire into umbrella.

### Phase 4: Hard formats
* [ ] `@audio/aac-encode` — Evaluate: (a) libav.js variant with ffmpeg AAC encoder, (b) compile fdk-aac to WASM ourselves (license: non-free but distributable), (c) browser MediaRecorder fallback.
* [ ] `@audio/webm-encode` — Opus encoding + WebM/Matroska container muxing. Evaluate ebml-muxer or custom muxer.
* [ ] Wire into umbrella.

### Phase 5: Niche formats (as needed)
* [ ] `@audio/qoa-encode` — qoa-format (if encoder exists) or implement from spec (simple).
* [ ] `@audio/alac-encode` — Compile Apple ALAC (Apache 2.0) to WASM, mux into M4A.
* [ ] `@audio/caf-encode` — CAF container writer (PCM payload).
* [ ] `@audio/amr-encode` — opencore-amr WASM.
* [ ] `@audio/wma-encode` — ffmpeg only. Lowest priority.

### Phase 6: Polish
* [ ] README, docs, examples
* [ ] Benchmark: encode speed, output size vs native tools
* [ ] Publish all packages

## Encoder Research Summary

| Format | Best option | Alternative | Pure JS? | WASM size |
|--------|-----------|-------------|----------|-----------|
| WAV | Custom (trivial) | node-wav | Yes | 0 |
| MP3 | wasm-media-encoders | lamejs (pure JS, buggy npm ver) | Partial | 66 KB gz |
| OGG | wasm-media-encoders | — | No | 158 KB gz |
| Opus | opusscript or custom libopus WASM | libav.js variant-opus | No | ~300 KB |
| FLAC | libflacjs | libav.js variant-flac | No | ~500 KB |
| AAC | libav.js (ffmpeg AAC) | fdk-aac WASM (abandoned) | No | ~1.5 MB |
| AIFF | Custom (trivial) | — | Yes | 0 |
| WebM | opus + ebml muxer | libav.js | No | ~300 KB + muxer |
| QOA | qoa-format or custom | — | Yes | 0 |
| ALAC | Apple ALAC → WASM | libav.js | No | ~200 KB est |
| WMA | ffmpeg only | — | No | ~3 MB |

## Notes

- Google recently published efficient MP3 encoder config for better compression — track for future integration into mp3-encode (custom LAME params or alternative approach).
- lamejs has a known `MPEGMode` bug in npm-published version — prefer wasm-media-encoders.
- AAC is the hardest format: fdk-aac (best quality) has non-free license, ffmpeg's native AAC encoder is lower quality. No clean path.
- For Opus: opusscript has 3.6M downloads/week (Discord bots) but only does raw frames — need Ogg container muxing on top.
- libav.js (ffmpeg WASM, 492 stars, actively maintained) is the universal fallback for any format.
- @ffmpeg/ffmpeg (17K stars, 294K dl/wk) is the nuclear option — 31 MB WASM, requires SharedArrayBuffer.
