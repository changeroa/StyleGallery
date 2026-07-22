export function parseStrictJson(source) {
  const value = JSON.parse(source);
  let index = 0;

  function skipWhitespace() {
    while (/\s/.test(source[index] ?? "")) index += 1;
  }

  function scanString() {
    const start = index;
    index += 1;
    while (source[index] !== '"') {
      if (source[index] === "\\") index += 1;
      index += 1;
    }
    index += 1;
    return JSON.parse(source.slice(start, index));
  }

  function scanValue() {
    skipWhitespace();
    if (source[index] === "{") scanObject();
    else if (source[index] === "[") scanArray();
    else if (source[index] === '"') scanString();
    else while (index < source.length && !/[\s,}\]]/.test(source[index])) index += 1;
    skipWhitespace();
  }

  function scanArray() {
    index += 1;
    skipWhitespace();
    if (source[index] === "]") {
      index += 1;
      return;
    }
    while (index < source.length) {
      scanValue();
      if (source[index] === "]") {
        index += 1;
        return;
      }
      index += 1;
    }
  }

  function scanObject() {
    const keys = new Set();
    index += 1;
    skipWhitespace();
    if (source[index] === "}") {
      index += 1;
      return;
    }
    while (index < source.length) {
      const key = scanString();
      if (keys.has(key)) throw new SyntaxError(`duplicate JSON property ${key}`);
      keys.add(key);
      skipWhitespace();
      index += 1;
      scanValue();
      if (source[index] === "}") {
        index += 1;
        return;
      }
      index += 1;
      skipWhitespace();
    }
  }

  scanValue();
  return value;
}
