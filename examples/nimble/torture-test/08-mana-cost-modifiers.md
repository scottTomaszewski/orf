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
A per-cast option, so it carries **no standing effects**: a −2 that applied to every spell would be wrong. The Mage class declares `spell.cost.modifier` and `spell.cost.min` for a future `cast` event to read. **Gap:** per-cast choices (pay an action, take a discount) need a `cast` event and a way for a feature to offer an option at cast time; neither exists in Phase 1.
