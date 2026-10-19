---
id: torture.nimble.01-armor-formulas
type: note
system: nimble
name: "Armor: unarmored, cloth, mail with DEX cap, plate, shields"
covers: [nimble.system.combat, nimble.items.armor.adventurers-garb, nimble.items.armor.chain-shirt, nimble.items.armor.half-plate, nimble.items.armor.wooden-buckler]
---
## Rule
Unarmored Armor = DEX. Cloth: n + DEX. Mail: n + DEX (max 2). Plate: flat n. Shields add. STR requirements (CR2 p.33).

## Encoding notes
The template contributes `armor.base base: dex` as the unarmored floor. Each worn armor contributes its own `base` while equipped; the fold keeps the highest, so no armor-vs-unarmored special case exists. Mail's DEX cap is `min(dex, 2)` inside the formula; Plate's is a flat number. Shields `add` to `armor.bonus`. STR requirements are a `requires: {str: n}` property the engine enforces at equip time.
