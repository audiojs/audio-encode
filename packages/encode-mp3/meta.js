/**
 * ID3v2 metadata writer for MP3 files.
 * @module @audio/encode-mp3/meta
 */

const TE = new TextEncoder()

// ── Constants ───────────────────────────────────────────────────────────

const ID3_MAP_REV = {
  title: 'TIT2', artist: 'TPE1', album: 'TALB', albumartist: 'TPE2',
  composer: 'TCOM', genre: 'TCON', year: 'TDRC', track: 'TRCK',
  disc: 'TPOS', bpm: 'TBPM', key: 'TKEY', copyright: 'TCOP',
  isrc: 'TSRC', publisher: 'TPUB', software: 'TENC',
  comment: 'COMM', lyrics: 'USLT'
}

// ── Binary helpers ──────────────────────────────────────────────────────

function synchsafe(b, o) { return (b[o] << 21) | (b[o + 1] << 14) | (b[o + 2] << 7) | b[o + 3] }
function wSynchsafe(b, o, v) { b[o] = (v >>> 21) & 0x7f; b[o + 1] = (v >>> 14) & 0x7f; b[o + 2] = (v >>> 7) & 0x7f; b[o + 3] = v & 0x7f }

// ── ID3v2 builder ───────────────────────────────────────────────────────

function buildId3Frame(id, body) {
  let out = new Uint8Array(10 + body.length)
  out.set(TE.encode(id), 0)
  wSynchsafe(out, 4, body.length)
  out.set(body, 10)
  return out
}

function buildId3v2(meta) {
  let frames = []
  for (let k in ID3_MAP_REV) {
    let v = meta[k]
    if (v == null || v === '') continue
    let id = ID3_MAP_REV[k]
    let body
    if (id === 'COMM' || id === 'USLT') {
      let txt = TE.encode(String(v))
      body = new Uint8Array(1 + 3 + 1 + txt.length + 1)
      body[0] = 3
      body.set(TE.encode('eng'), 1)
      body[4] = 0
      body.set(txt, 5)
      body[body.length - 1] = 0
    } else {
      let enc = TE.encode(String(v))
      body = new Uint8Array(1 + enc.length)
      body[0] = 3
      body.set(enc, 1)
    }
    frames.push(buildId3Frame(id, body))
  }
  if (meta.pictures) {
    for (let p of meta.pictures) {
      let mime = TE.encode((p.mime || 'image/jpeg') + '\0')
      let desc = TE.encode((p.description || '') + '\0')
      let body = new Uint8Array(1 + mime.length + 1 + desc.length + p.data.length)
      body[0] = 3
      let pos = 1
      body.set(mime, pos); pos += mime.length
      body[pos++] = p.type ?? 3
      body.set(desc, pos); pos += desc.length
      body.set(p.data, pos)
      frames.push(buildId3Frame('APIC', body))
    }
  }

  if (!frames.length) return null
  let totalFrameSize = frames.reduce((n, f) => n + f.length, 0)
  let out = new Uint8Array(10 + totalFrameSize)
  out[0] = 0x49; out[1] = 0x44; out[2] = 0x33
  out[3] = 4; out[4] = 0; out[5] = 0
  wSynchsafe(out, 6, totalFrameSize)
  let pos = 10
  for (let f of frames) { out.set(f, pos); pos += f.length }
  return out
}

function stripMp3Tags(bytes) {
  let start = 0, end = bytes.length
  if (bytes.length >= 10 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    start = 10 + synchsafe(bytes, 6)
  }
  if (bytes.length >= 128 && bytes[end - 128] === 0x54 && bytes[end - 127] === 0x41 && bytes[end - 126] === 0x47) {
    end -= 128
  }
  return bytes.subarray(start, end)
}

/** Splice ID3v2 tag into MP3 bytes. Returns new Uint8Array. */
export function writeMeta(bytes, { meta = {} } = {}) {
  let audio = stripMp3Tags(bytes)
  let tag = buildId3v2(meta)
  if (!tag) return audio
  let out = new Uint8Array(tag.length + audio.length)
  out.set(tag, 0)
  out.set(audio, tag.length)
  return out
}
