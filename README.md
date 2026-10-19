# orf (placeholder name)

An open, system-agnostic TTRPG content format and reference engine, built first as a free
character sheet for Nimble. Design: `docs/superpowers/specs/2026-10-18-open-rules-format-design.md`.

Nimble content in this repository is an independent product published under the Nimble 3rd
Party Creator License. Nimble TTRPG © Nimble Co.

## Layout

- `docs/superpowers/` design spec, plans, research. `docs/spec/` the format drafts.
- `systems/nimble/` the Nimble 2.0.3 system template (data). `systems/srd5e-mini/` a dozen 5e
  variables used only by two insurance tests.
- `examples/nimble/` classes, features, items, ancestries, backgrounds, a sample character, and
  the torture test (`torture-test/README.md` is the review packet).
- `src/` document parser, registry, linter, CLI.

```bash
npm install
npm test          # parser, registry, linter, and "every example lints clean"
npm run lint-docs # lint the Nimble tree and the 5e insurance tree
```
