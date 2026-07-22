import crypto from "node:crypto";

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function pngDimensions(bytes) {
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(pngSignature) || bytes.toString("ascii", 12, 16) !== "IHDR") return undefined;
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  return width > 0 && height > 0 ? { height, width } : undefined;
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
