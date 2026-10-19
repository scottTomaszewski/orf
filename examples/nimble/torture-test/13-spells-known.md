---
id: torture.nimble.13-spells-known
type: note
system: nimble
name: "Spells known = schools × unlocked tier"
covers: [nimble.classes.mage, nimble.features.mage.elemental-spellcasting, nimble.classes.mage.level-3]
---
## Rule
You know every spell in your known schools up to your unlocked tier; Mage unlocks tier N at level 2N (H2 p.32, CR2 p.45).

## Encoding notes
`spells.tier.max base: floor(level(mage) / 2)` on the class. Known schools are the level-1 grant (Fire, Ice, Lightning) plus choice slots whose options are school names. The sheet lists spells by filtering spell documents on `school in known and tier <= spells.tier.max`; no per-spell selection exists, which matches the rules.
