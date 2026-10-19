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
Armor contributes `defend.cost add: 1 when: not proficient(mail)` with `transfer: equipped`. The weapon half is **not encoded**: a `crit.allowed` flag on the character would turn off crits for every weapon when one unproficient weapon is equipped, and `proficient(weapon)` cannot name which weapon. Proficiency itself comes from the class document's `armor_proficiency`/`weapon_proficiency` properties, which are free text today; `proficient()` needs a declared vocabulary in Phase 2 (gap).
