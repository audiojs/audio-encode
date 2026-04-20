/**
 * FLAC metadata writer — Vorbis comments, pictures.
 * @module @audio/encode-flac/meta
 */

const TE = new TextEncoder()

// ── Constants ───────────────────────────────────────────────────────────

const STREAMINFO = 0, VORBIS_COMMENT = 4, PICTURE = 6, PADDING = 1

const VORBIS_MAP_REV = {
  title: 'TITLE', artist: 'ARTIST', album: 'ALBUM', albumartist: 'ALBUMARTIST',
  composer: 'COMPOSER', genre: 'GENRE', year: 'DATE', track: 'TRACKNUMBER',
  disc: 'DISCNUMBER', bpm: 'BPM', key: 'KEY', comment: 'COMMENT',
  copyright: 'COPYRIGHT', isrc: 'ISRC', publisher: 'PUBLISHER', software: 'ENCODER',
  lyrics: 'LYRICS'
}

// ── Binary helpers ──────────────────────────────────────────────────────

function u24be(b, o) { return (b[o] << 16) | (b[o + 1] << 8) | b[o + 2] }
function wu32le(b, o, v) { b[o] = v; b[o + 1] = v >>> 8; b[o + 2] = v >>> 16; b[o + 3] = v >>> 24 }
function wu32be(b, o, v) { b[o] = (v >>> 24) & 0xff; b[o + 1] = (v >>> 16) & 0xff; b[o + 2] = (v >>> 8) & 0xff; b[o + 3] = v & 0xff }
function fourcc(b, o) { return String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]) }

// ── Block builders ──────────────────────────────────────────────────────

function buildVorbisComment(meta) {
  let vendor = TE.encode('audio')
  let entries = []
  for (let k in VORBIS_MAP_REV) {
    let v = meta[k]
    if (v == null || v === '') continue
    entries.push(TE.encode(`${VORBIS_MAP_REV[k]}=${v}`))
  }
  let size = 4 + vendor.length + 4
  for (let e of entries) size += 4 + e.length
  let out = new Uint8Array(size)
  let pos = 0
  wu32le(out, pos, vendor.length); pos += 4
  out.set(vendor, pos); pos += vendor.length
  wu32le(out, pos, entries.length); pos += 4
  for (let e of entries) { wu32le(out, pos, e.length); pos += 4; out.set(e, pos); pos += e.length }
  return out
}

function buildFlacPicture(p) {
  let mimeBytes = TE.encode(p.mime || 'image/jpeg')
  let descBytes = TE.encode(p.description || '')
  let size = 4 + 4 + mimeBytes.length + 4 + descBytes.length + 16 + 4 + p.data.length
  let out = new Uint8Array(size)
  let pos = 0
  wu32be(out, pos, p.type ?? 3); pos += 4
  wu32be(out, pos, mimeBytes.length); pos += 4
  out.set(mimeBytes, pos); pos += mimeBytes.length
  wu32be(out, pos, descBytes.length); pos += 4
  out.set(descBytes, pos); pos += descBytes.length
  pos += 16  // width/height/depth/colors = 0
  wu32be(out, pos, p.data.length); pos += 4
  out.set(p.data, pos)
  return out
}

function buildFlacBlock(type, body, last) {
  let out = new Uint8Array(4 + body.length)
  out[0] = (last ? 0x80 : 0) | (type & 0x7f)
  out[1] = (body.length >> 16) & 0xff
  out[2] = (body.length >> 8) & 0xff
  out[3] = body.length & 0xff
  out.set(body, 4)
  return out
}

/** Splice meta into FLAC bytes. Returns new Uint8Array. */
export function writeMeta(bytes, { meta = {} } = {}) {
  if (bytes.length < 4 || fourcc(bytes, 0) !== 'fLaC') return bytes
  let off = 4, streamInfo = null, others = []
  while (off + 4 <= bytes.length) {
    let hdr = bytes[off]
    let last = !!(hdr & 0x80), type = hdr & 0x7f
    let size = u24be(bytes, off + 1)
    let body = bytes.subarray(off + 4, off + 4 + size)
    if (type === STREAMINFO) streamInfo = body
    else if (type !== VORBIS_COMMENT && type !== PICTURE && type !== PADDING) others.push({ type, body })
    off += 4 + size
    if (last) break
  }
  let audioStart = off
  if (!streamInfo) return bytes

  let blocks = []
  blocks.push({ type: STREAMINFO, body: streamInfo })
  for (let o of others) blocks.push(o)
  blocks.push({ type: VORBIS_COMMENT, body: buildVorbisComment(meta) })
  if (meta.pictures) for (let p of meta.pictures) blocks.push({ type: PICTURE, body: buildFlacPicture(p) })

  let headerSize = 4
  let encoded = []
  for (let i = 0; i < blocks.length; i++) {
    let b = buildFlacBlock(blocks[i].type, blocks[i].body, i === blocks.length - 1)
    encoded.push(b)
    headerSize += b.length
  }
  let audioPart = bytes.subarray(audioStart)
  let out = new Uint8Array(headerSize + audioPart.length)
  out.set(TE.encode('fLaC'), 0)
  let pos = 4
  for (let e of encoded) { out.set(e, pos); pos += e.length }
  out.set(audioPart, pos)
  return out
}
