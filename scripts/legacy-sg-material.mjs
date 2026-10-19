#!/usr/bin/env node
// Old bin names `sg-material` and `stylegallery-material`: notice, then delegate for 0.1.12 only.
process.stderr.write("sg-material is renamed to `stylegallery` (stylegallery search, stylegallery read, stylegallery context --query). This old name will be removed in the next release.\n");
await import("./sg-material.mjs");
