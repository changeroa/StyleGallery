# Quality And Findability

`quality/` records IA checks that help readers choose the right route through `layout-gallery`.

## Concepts

- [Repository guide](../README.md) - Root hub roles, task routes, and link policy.
- [Pattern categories](../patterns/index.md) - Parent context for generated pattern leaves.
- [Layout recipes](../recipes/index.md) - Parent context for screen-level recipe leaves.

## Tree-Test Findability QA

Findability QA checks whether a reader can choose the correct route for a task without already knowing the repository structure.

Use this script for lightweight tree tests:

| Scenario | Start | Expected primary route | PASS condition |
| --- | --- | --- | --- |
| Choose a layout for a screen with unknown constraints. | [README](../README.md) | [Layout Planning Guide](../GUIDE.md) | The reader starts with planning instead of a primitive. |
| Find a primitive for a known spatial problem. | [README](../README.md) | [Layout Pattern Catalog](../CATALOG.md) | The reader reaches the generated catalog. |
| Browse all spatial families. | [OKF index](../index.md) | [Pattern Categories](../patterns/index.md) | The reader reaches category-level browsing. |
| Compose a screen-level layout. | [README](../README.md) | [Layout Recipes](../recipes/index.md) | The reader reaches recipes before individual pattern leaves. |
| Choose a settings layout. | [README](../README.md) | [SaaS Settings Recipe](../recipes/saas-settings.md) | The reader reaches the settings recipe before catalog browsing. |
| Run findability QA. | [README](../README.md) | [Quality And Findability](index.md) | The reader reaches this QA script. |

Record `PASS` only when the expected primary route is the first route selected. A link resolving successfully is not enough; the selected route must match the task intent.
