# Governed Local Reference Profiles

Editorial and terminal are experimental, example-only profiles that use the same Layout revision and related fixture set. Selection is always an explicit `profile.json` path; neither profile is a default.

Their token and foundation values intentionally differ. Their shared relationship means they cannot count as independent consumers, adopters, or promotion evidence.

## Profile Records

- [Editorial profile](editorial/profile.json) describes a warm publication identity.
- [Terminal profile](terminal/profile.json) describes a dark operator-console identity.

The sibling `tokens.dtcg.json` files use the restricted portable token subset. The sibling `local-foundations.json` files keep identity bindings local to each profile.

## Generated Evidence Routes

The generated matrices expose the declared component states, keyboard expectations, and evidence coverage without making a profile the default.

| Profile | State matrix | Keyboard matrix | Evidence coverage |
| --- | --- | --- | --- |
| Editorial | [Editorial state matrix](editorial/generated/state-matrix.md) | [Editorial keyboard matrix](editorial/generated/keyboard-matrix.md) | [Editorial evidence coverage](editorial/generated/evidence-coverage.md) |
| Terminal | [Terminal state matrix](terminal/generated/state-matrix.md) | [Terminal keyboard matrix](terminal/generated/keyboard-matrix.md) | [Terminal evidence coverage](terminal/generated/evidence-coverage.md) |

## IA Navigation

Parent: [Reference Profiles](../index.md).
Next: [External Adaptation](../external-adaptation/index.md).
