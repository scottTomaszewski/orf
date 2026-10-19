---
id: torture.nimble.03-mage-mana
type: note
system: nimble
name: "Mage mana: (INT×3)+LVL, unlocked at level 2"
covers: [nimble.classes.mage, nimble.system.core, nimble.system.resources]
---
## Rule
Mana unlocks at level 2; max = (INT×3) + LVL; refreshes at Safe Rest; spell cost = tier (H2 p.32, CR2 p.45).

## Encoding notes
The template owns one `mana` resource and a `mana.max` variable with no formula of its own. The Mage class contributes `mana.max base: (max(int, 0) * 3) + level when: level(mage) >= 2`. The Oathsworn contributes `wil + level`. A multiclass caster gets the higher base; the rules do not say otherwise.
