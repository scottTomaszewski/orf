---
id: torture.nimble.08-mana-cost-modifiers
type: note
system: nimble
name: "Methodical Spellweaver: −2 mana (min 1) for +1 action"
covers: [nimble.features.mage.methodical-spellweaver]
---
## Rule
Spend 1 extra action: the spell costs 2 less mana, minimum 1 (H2 p.34).

## Encoding notes
Declared as contributions to `spell.cost.modifier` (add −2) and `spell.cost.min` (max 1). **Gap:** nothing applies them yet; a `cast` event with a cost handler is Phase 2. The encoding is readable; the mechanics are not yet wired.
