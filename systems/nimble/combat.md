---
id: nimble.system.combat
type: variables
system: nimble
name: Combat variables
printing_diff: {second: {armor: renamed Defense}}
variables:
  - {id: armor.base, name: your Armor, type: integer, default: 0, ops: [base, mul]}
  - {id: armor.bonus, name: bonuses to your Armor, type: integer, default: 0, ops: [add]}
  - {id: armor, name: your Armor, type: integer, formula: armor.base + armor.bonus, alias: ARMOR}
  - {id: save.str, name: your Strength save, type: integer, formula: str}
  - {id: save.dex, name: your Dexterity save, type: integer, formula: dex}
  - {id: save.int, name: your Intelligence save, type: integer, formula: int}
  - {id: save.wil, name: your Will save, type: integer, formula: wil}
  - {id: save.str.advantage, name: advantage on Strength saves, type: integer, default: 0, ops: [add]}
  - {id: save.dex.advantage, name: advantage on Dexterity saves, type: integer, default: 0, ops: [add]}
  - {id: save.int.advantage, name: advantage on Intelligence saves, type: integer, default: 0, ops: [add]}
  - {id: save.wil.advantage, name: advantage on Will saves, type: integer, default: 0, ops: [add]}
  - {id: actions.max, name: your actions per turn, type: integer, default: 3, ops: [add]}
  - {id: actions.dying_cap, name: your actions per turn while Dying, type: integer, default: 1, ops: [base], description: "The engine caps your actions at this while Dying (CR2 p.9). Zephyr 20 raises it to 2."}
  - {id: wound.damage_while_dying, name: Wounds taken from damage while Dying, type: integer, default: 2, ops: [set], description: "The engine adds this many Wounds (one more on a crit) when you take damage while Dying (CR2 p.9)."}
  - {id: dc.hero, name: the DC of your abilities, type: integer, formula: 10 + key}
  - {id: defend.cost, name: the action cost of Defend, type: integer, default: 1, ops: [add], description: "Non-proficient armor adds 1 while worn."}
  - {id: crit.allowed, name: your attacks can crit, type: boolean, default: true, ops: [set]}
  - {id: damage.melee.bonus, name: bonus damage on melee attacks, type: integer, default: 0, ops: [add]}
effects:
  - target: armor.base
    base: dex
    source: unarmored
---
Armor is a flat damage reduction applied only when you spend the Defend reaction; crits ignore
it (CR2 p.14-15, p.33). Unarmored Armor = DEX, contributed here as the lowest `base`; worn armor
contributes a higher `base` while equipped. Saves are d20 + stat; each class contributes +1 or
−1 to one `save.<stat>.advantage` (CR2 p.8). Three actions per turn (CR2 p.14-15); Dying caps
them at `actions.dying_cap` (CR2 p.9), applied by the engine's Nimble module. Hero-caused DC = 10 + KEY (CR2 p.8).

## Sources
Core Rules 2.0.3 p.8, p.9, p.14-15, p.33.
