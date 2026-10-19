---
name: stylegallery-search
description: Find and read StyleGallery guidance (layout patterns, recipes, motion, state management, platform guides, design terminology, expression) with the stylegallery CLI or the stylegallery-mcp search/read tools. Use when a UI task needs a layout pattern, recipe, or interaction contract and the right document is not already known.
---

# StyleGallery search

1. Search with a short task phrase. Pass an English rewrite when you ask in another language:

   ```sh
   stylegallery search "sticky header"
   stylegallery search "헤더 고정" --query-en "sticky header"
   ```

   MCP: `search { "query": "헤더 고정", "query_en": "sticky header" }`.

2. Pick a result by `title`, `description`, and the verbatim `snippets`. Each result has a readable `id` such as `sg:layout/sticky-header` and a `next.read` command.

3. Read only what you need:

   ```sh
   stylegallery read sg:layout/sticky-header --outline
   stylegallery read sg:layout/sticky-header --section css
   ```

   MCP: `read { "reference": "sg:layout/sticky-header", "section": "css" }`.

Notes:

- Results default to 5; use `--limit` (1-50) and `--paths-only` when you will open files yourself.
- `results: []` is a normal answer. Follow `hint`: add `--query-en`, use fewer words, or browse with `stylegallery discover`.
- `--detailed` (MCP `response_format: "detailed"`) adds scores and hash identities; you rarely need it.
- With the repository checked out, you can also read the returned `path` directly.
