# ORF: Open Rules Format

An open, system-agnostic TTRPG content format and reference engine, built first as a free
character sheet for Nimble (`sheet/`, **ORF Sheet for Nimble**). Design:
`docs/superpowers/specs/2026-10-18-open-rules-format-design.md`.

**Every ORF document is a Markdown file with YAML frontmatter.** Any Markdown tool renders it
(Obsidian shows the properties as a table and the body as prose); ORF only adds meaning to a few
frontmatter keys and to `{{ }}` spans in text. Writing content: [`docs/guide/writing-content.md`](docs/guide/writing-content.md).

Nimble content in this repository is an independent product published under the Nimble 3rd
Party Creator License. Nimble TTRPG © Nimble Co.

## Try it

`cd sheet && npm install && npm run dev`, open **Write**, and follow
[`sheet/README.md`](sheet/README.md) ("The demo"): write an ancestry, save it, create a
character with it, change a number, watch it ripple.

## Layout

- `docs/superpowers/` design spec, plans, research. `docs/spec/` the format drafts.
- `systems/nimble/` the Nimble 2.0.3 system template (data). `systems/srd5e-mini/` a dozen 5e
  variables used only by two insurance tests.
- `examples/nimble/` classes, features, items, ancestries, backgrounds, a sample character, and
  the torture test (`torture-test/README.md` is the review packet).
- `src/` document parser, registry, linter, expression language (`src/expr/`), fold, character
  assembly, the engine (`evaluateCharacter`), moments, the Nimble system module
  (`src/systems/nimble.ts`), CLI. `conformance/expressions.json` pins the grammar.

```bash
npm install
npm test          # parser, evaluator, corpus, fold, assembly, engine, moments, Nimble module, linter
npm run lint-docs # lint the Nimble tree and the 5e insurance tree
npx tsx src/cli.ts sheet scott.characters.pip systems/nimble examples/nimble   # Pip, with provenance
```

## The sheet

`sheet/` is the Nimble character sheet (Vite + Preact), built on the engine: see
[`sheet/README.md`](sheet/README.md) for running it, the homebrew folder, and the demo
checklist. `cd sheet && npm install && npm run dev`.

## What the engine does and does not do

It turns content documents plus a character document into numbers with provenance: every
variable's value and the contributions behind it, every resource's current and max, and
diagnostics instead of crashes (unknown names, cycles, unmet requirements, shadowed values).
It applies **moments** (rests, encounter start/end, turn end, `gain-wound`, `full-hp`) to
resource refresh rules. The Nimble module implements what *happens* (damage, healing, Field
and Safe Rests, Dying, Initiative) in code, once, for every tool. The engine never rolls dice;
it keeps them symbolic (`1d8 - 1`) and consumers supply rolls. Content never scripts.
