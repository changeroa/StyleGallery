import path from "node:path";
import StyleDictionary from "style-dictionary";

export const adapter = Object.freeze({ name: "style-dictionary", version: "5.5.0" });

const durationTransform = "stylegallery/duration-css";
if (!Object.hasOwn(StyleDictionary.hooks.transforms, durationTransform)) {
  StyleDictionary.registerTransform({
    filter: (token) => token.$type === "duration",
    name: durationTransform,
    transform: (token) => `${token.$value.value}${token.$value.unit}`,
    transitive: true,
    type: "value",
  });
}

export function createStyleDictionaryConfig(source, output) {
  return {
    log: { verbosity: "verbose", warnings: "warn" },
    platforms: {
      css: {
        buildPath: `${path.dirname(output)}${path.sep}`,
        files: [
          {
            destination: path.basename(output),
            format: "css/variables",
            options: { outputReferences: true },
          },
        ],
        transforms: [...StyleDictionary.hooks.transformGroups.css, durationTransform],
      },
    },
    source: [source],
    usesDtcg: true,
  };
}
