---
id: torture.nimble.11-proficiency
type: note
system: nimble
name: "Non-proficient armor costs 2 actions to Defend; non-proficient weapons cannot crit"
covers: [nimble.items.armor.chain-shirt, nimble.items.weapons.staff]
---
## Rule
Non-proficient armor: Defend costs an extra action. Non-proficient weapon: cannot crit (CR2 p.32).

## Encoding notes
Items contribute `defend.cost add: 1 when: not proficient(mail)` and `crit.allowed set: false when: not proficient(weapon)`, both `transfer: equipped`. Proficiency itself comes from the class document's `armor_proficiency`/`weapon_proficiency` properties, which the `proficient()` predicate reads.
