import crypto from "node:crypto";
import { inflateSync } from "node:zlib";

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const pngBitDepths = new Map([
  [0, new Set([1, 2, 4, 8, 16])],
  [2, new Set([8, 16])],
  [3, new Set([1, 2, 4, 8])],
  [4, new Set([8, 16])],
  [6, new Set([8, 16])],
]);
const pngChannels = new Map([[0, 1], [2, 3], [3, 1], [4, 2], [6, 4]]);
const adam7Passes = Object.freeze([
  [0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4],
  [0, 2, 2, 4], [1, 0, 2, 2], [0, 1, 1, 2],
]);
const maxDecodedPngBytes = 256 * 1024 * 1024;
export const MAX_ARTIFACT_FILE_BYTES = 64 * 1024 * 1024;
const maxPngChunkBytes = 32 * 1024 * 1024;
const maxPngCompressedBytes = 64 * 1024 * 1024;
const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = (value >>> 1) ^ (0xedb88320 & -(value & 1));
  return value >>> 0;
});

function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function passExtent(size, start, step) {
  return size <= start ? 0 : Math.ceil((size - start) / step);
}

function validateDecodedPng(idat, { bitDepth, colorType, height, interlace, width }) {
  const bitsPerPixel = pngChannels.get(colorType) * bitDepth;
  const passes = interlace === 0 ? [[0, 0, 1, 1]] : adam7Passes;
  const rows = passes.flatMap(([startX, startY, stepX, stepY]) => {
    const passWidth = passExtent(width, startX, stepX);
    const passHeight = passExtent(height, startY, stepY);
    return passWidth === 0 || passHeight === 0 ? [] : [{ bytes: Math.ceil((passWidth * bitsPerPixel) / 8), count: passHeight }];
  });
  const expected = rows.reduce((total, row) => total + (row.bytes + 1) * row.count, 0);
  if (!Number.isSafeInteger(expected) || expected <= 0 || expected > maxDecodedPngBytes) return false;
  const compressed = Buffer.concat(idat);
  let decoded;
  let consumed;
  try {
    const inflated = inflateSync(compressed, { info: true, maxOutputLength: expected + 1 });
    decoded = inflated.buffer;
    consumed = inflated.engine.bytesWritten;
  }
  catch { return false; }
  if (consumed !== compressed.length || decoded.length !== expected) return false;
  let offset = 0;
  for (const row of rows) {
    for (let index = 0; index < row.count; index += 1) {
      if (decoded[offset] > 4) return false;
      offset += row.bytes + 1;
    }
  }
  return offset === decoded.length;
}

function pngDimensions(bytes) {
  if (bytes.length > MAX_ARTIFACT_FILE_BYTES) return undefined;
  if (bytes.length < 8 || !bytes.subarray(0, 8).equals(pngSignature)) return undefined;
  let dimensions;
  let idatClosed = false;
  let sawIdat = false;
  const idat = [];
  let compressedBytes = 0;
  let header;
  let offset = 8;
  while (offset < bytes.length) {
    if (bytes.length - offset < 12) return undefined;
    const length = bytes.readUInt32BE(offset);
    if (length > maxPngChunkBytes) return undefined;
    const typeOffset = offset + 4;
    const dataOffset = typeOffset + 4;
    const crcOffset = dataOffset + length;
    const nextOffset = crcOffset + 4;
    if (nextOffset > bytes.length) return undefined;
    const typeBytes = bytes.subarray(typeOffset, dataOffset);
    if ([...typeBytes].some((byte) => !((byte >= 65 && byte <= 90) || (byte >= 97 && byte <= 122)))) return undefined;
    if (crc32(bytes.subarray(typeOffset, crcOffset)) !== bytes.readUInt32BE(crcOffset)) return undefined;
    const type = typeBytes.toString("ascii");
    if (offset === 8 && type !== "IHDR") return undefined;
    if (type === "IHDR") {
      if (offset !== 8 || length !== 13 || dimensions) return undefined;
      const width = bytes.readUInt32BE(dataOffset);
      const height = bytes.readUInt32BE(dataOffset + 4);
      const bitDepth = bytes[dataOffset + 8];
      const colorType = bytes[dataOffset + 9];
      const bitDepths = pngBitDepths.get(colorType);
      if (width === 0 || width > 0x7fffffff || height === 0 || height > 0x7fffffff || !bitDepths?.has(bitDepth)) return undefined;
      if (bytes[dataOffset + 10] !== 0 || bytes[dataOffset + 11] !== 0 || bytes[dataOffset + 12] > 1) return undefined;
      header = { bitDepth, colorType, height, interlace: bytes[dataOffset + 12], width };
      dimensions = { height, width };
    } else if (type === "IDAT") {
      if (!dimensions || idatClosed) return undefined;
      sawIdat = true;
      idat.push(bytes.subarray(dataOffset, crcOffset));
      compressedBytes += length;
      if (compressedBytes > maxPngCompressedBytes) return undefined;
    } else if (type === "IEND") {
      return length === 0 && nextOffset === bytes.length && dimensions && sawIdat && validateDecodedPng(idat, header) ? dimensions : undefined;
    } else if (sawIdat) idatClosed = true;
    offset = nextOffset;
  }
  return undefined;
}

export function artifactMetadata(bytes, mediaType) {
  const metadata = {
    byte_length: bytes.length,
    media_type: mediaType,
    sha256: `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`,
  };
  if (mediaType === "image/png") Object.assign(metadata, pngDimensions(bytes));
  return metadata;
}
