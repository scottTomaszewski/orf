---
id: srd5e.system.core
type: variables
system: srd5e
name: SRD core (mini)
variables:
  - {id: dex.mod, name: your Dexterity modifier, type: integer, default: 0, alias: DEX}
  - {id: wis.mod, name: your Wisdom modifier, type: integer, default: 0, alias: WIS}
  - {id: ac.base, name: your Armor Class, type: integer, default: 10, ops: [base]}
  - {id: ac.bonus, name: bonuses to your Armor Class, type: integer, default: 0, ops: [add]}
  - {id: ac, name: your Armor Class, type: integer, formula: ac.base + ac.bonus, alias: AC}
  - {id: save.str, name: your Strength saving throw bonus, type: dice, default: 0, ops: [add]}
  - {id: save.dex, name: your Dexterity saving throw bonus, type: dice, default: 0, ops: [add]}
  - {id: save.con, name: your Constitution saving throw bonus, type: dice, default: 0, ops: [add]}
  - {id: save.int, name: your Intelligence saving throw bonus, type: dice, default: 0, ops: [add]}
  - {id: save.wis, name: your Wisdom saving throw bonus, type: dice, default: 0, ops: [add]}
  - {id: save.cha, name: your Charisma saving throw bonus, type: dice, default: 0, ops: [add]}
effects:
  - {target: ac.base, base: "10 + dex.mod", source: unarmored}
---
Unarmored AC 10 + DEX is the template's own base contribution.
