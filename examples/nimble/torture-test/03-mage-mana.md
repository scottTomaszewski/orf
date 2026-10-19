---
id: torture.nimble.03-mage-mana
type: note
system: nimble
name: "Mage mana: (INT×3)+LVL, unlocked at level 2"
covers: [nimble.features.mage.mana, nimble.classes.mage.level-2, nimble.system.core, nimble.system.resources]
---
## Rule
Mana unlocks at level 2; max = (INT×3) + LVL; refreshes at Safe Rest; spell cost = tier (H2 p.32, CR2 p.45).

## Encoding notes
The template owns one `mana` resource (`when: mana.max > 0`) and a `mana.max` variable with no formula of its own. The Mage's level-2 `Mana` feature contributes `mana.max base: (max(int, 0) * 3) + level`; the Oathsworn's contributes `wil + level`. Because the feature is granted at level 2, no `when` is needed: at level 1 nothing contributes, `mana.max` is its default 0, and the resource does not exist. A multiclass caster gets the higher base; the rules do not say otherwise.