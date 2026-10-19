---
id: torture.nimble.10-level-up-hp
type: note
system: nimble
name: "Max HP as a per-level history"
covers: [scott.characters.pip]
---
## Rule
Level-up HP: roll your Hit Die with advantage (CR2 p.21). The second printing adds a fixed-average option.

## Encoding notes
The character document's `levels[]` list records each level's HP gain and its source; `hp.max` folds those entries plus any `add` contributions (Tough-style features). Max HP is therefore history, not a formula of level, which matches the rules exactly.
