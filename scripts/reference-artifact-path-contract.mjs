import fs from "node:fs";
import path from "node:path";

function isContained(root, target) {
  const relative = path.relative(root, target);
  return relative !== "" && !relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative);
}

export function inspectArtifactPath(root, candidate, allowMissing) {
  const trustedRoot = fs.realpathSync(root);
  const target = path.resolve(root, candidate);
  if (!isContained(trustedRoot, target)) return { ok: false, path: target, reason: "outside_trust_root" };

  const segments = path.relative(trustedRoot, target).split(path.sep);
  let current = trustedRoot;
  for (const [index, segment] of segments.entries()) {
    current = path.join(current, segment);
    if (!fs.existsSync(current)) {
      return allowMissing ? { ok: true, path: target } : { ok: false, path: target, reason: "missing" };
    }
    const metadata = fs.lstatSync(current);
    if (metadata.isSymbolicLink()) return { ok: false, path: target, reason: "symbolic_link" };
    const finalSegment = index === segments.length - 1;
    if (finalSegment && !metadata.isFile()) return { ok: false, path: target, reason: "not_regular_file" };
    if (!finalSegment && !metadata.isDirectory()) return { ok: false, path: target, reason: "parent_not_directory" };
  }
  return { ok: true, path: target };
}
