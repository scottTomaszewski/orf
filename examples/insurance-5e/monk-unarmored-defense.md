---
id: srd5e.features.monk.unarmored-defense
type: feature
system: srd5e
name: Unarmored Defense (Monk)
effects:
  - {target: ac.base, base: "10 + dex.mod + wis.mod", when: "not equipped(armor) and not equipped(shield)", source: unarmored-defense}
---
While you wear no armor and wield no shield, your AC equals 10 + your Dexterity modifier + your Wisdom modifier (SRD 5.1).
