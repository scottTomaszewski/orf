---
id: torture.nimble.15-5e-stacking
type: note
system: nimble
name: "5e insurance: Bless cast twice does not stack"
covers: [srd5e.spells.bless]
---
## Rule
Bless adds 1d4 to saves; the same spell cast twice on you does not stack (SRD 5.1).

## Encoding notes
One `bless` document contributing `save.* add: 1d4` with `source: bless`. Two instances on a character group by source and the policy `same-source: highest` keeps one. Nothing in the content says 'does not stack'; the system policy does.
