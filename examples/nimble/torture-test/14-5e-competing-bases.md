---
id: torture.nimble.14-5e-competing-bases
type: note
system: nimble
name: "5e insurance: Monk Unarmored Defense vs Mage Armor vs armor"
covers: [srd5e.features.monk.unarmored-defense, srd5e.spells.mage-armor, srd5e.items.armor.chain-mail]
---
## Rule
Monk: AC 10 + DEX + WIS unarmored, no shield. Mage Armor: 13 + DEX unarmored. Chain mail: 16 (SRD 5.1).

## Encoding notes
Same shape as Nimble Armor: three `base` contributions to `ac.base` with `when` clauses; the highest applicable wins. Proves the fold is not Nimble-specific. Lives in `examples/insurance-5e/` with a 12-line `srd5e-mini` template.
