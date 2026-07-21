export function stripFencedCodeBlocks(content) {
  const kept = [];
  let fence = null;

  for (const line of content.split("\n")) {
    const marker = line.match(/^ {0,3}(`{3,})[^`]*$/)?.[1] ?? line.match(/^ {0,3}(~{3,}).*$/)?.[1];
    if (!fence && marker) {
      fence = { character: marker[0], length: marker.length };
      continue;
    }
    if (fence) {
      const closing = line.match(/^ {0,3}(`{3,}|~{3,})\s*$/)?.[1];
      if (closing && closing[0] === fence.character && closing.length >= fence.length) fence = null;
      continue;
    }
    kept.push(line);
  }

  return kept.join("\n");
}

export function stripHtmlComments(content) {
  return content.replace(/<!--[\s\S]*?(?:-->|$)/g, "");
}

export function structuralMarkdown(content) {
  return stripFencedCodeBlocks(stripHtmlComments(content));
}

export function markdownLinkDestinations(content) {
  const body = structuralMarkdown(content);
  const destinations = [];
  const inline = /!?\[[^\]]*\]\(\s*<?([^\s)>]+)>?(?:\s+[^)]*)?\)/g;
  const reference = /^ {0,3}\[[^\]]+\]:\s*<?([^\s>]+)>?(?:\s+.*)?$/gm;
  for (const pattern of [inline, reference]) {
    for (const match of body.matchAll(pattern)) destinations.push(match[1]);
  }
  return destinations;
}

export function isOmoDependency(destination) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(destination) || destination.startsWith("#")) return false;
  const pathOnly = destination.split(/[?#]/, 1)[0];
  return pathOnly.split(/[\\/]/).includes(".omo");
}
