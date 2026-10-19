---
id: scott.characters.pip
type: character
system: nimble
name: Pip
stats: {str: -1, dex: 2, int: 2, wil: 0}   # creation array; the level-4 Key stat bump is a choice effect
ancestry: nimble.ancestries.gnome
background: nimble.backgrounds.wild-one
classes: [{id: nimble.classes.mage, level: 4}]
skills: {arcana: 3, lore: 2, examination: 1, perception: 1}   # 4 at level 1 + 1 per level = 7
levels:
  - {level: 1, hp: 10, source: starting}
  - {level: 2, hp: 4, source: roll}
  - {level: 3, hp: 6, source: roll}
  - {level: 4, hp: 5, source: roll}
choices:
  nimble.classes.mage.level-3.subclass: [nimble.subclasses.mage.control]
  nimble.classes.mage.level-3.elemental-mastery: [nimble.spell-utility.fire]
  nimble.classes.mage.level-4.spellshaper: [nimble.features.mage.echo-casting, nimble.features.mage.stretch-time]
  nimble.classes.mage.level-4.key-stat: [int]
equipment:
  - {id: nimble.items.armor.adventurers-garb, equipped: true}
  - {id: nimble.items.weapons.staff, equipped: true}
state:
  hp: 17
  temp_hp: 0
  wounds: 1
  hit_dice: 2
  mana: 6
  actions: 3
  conditions: []
---
Sample character: a 4th-level gnome Mage. INT 2 at creation + 1 from the level-4 Key stat choice = 3. Max HP 25 (10 + 4 + 6 + 5), max mana (3×3)+4 = 13, Armor 2 + 2 = 4 in Adventurer's Garb.
