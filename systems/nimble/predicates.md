---
id: nimble.system.predicates
type: predicates
system: nimble
name: Predicates
predicates:
  - {id: equipped, name: equipped, args: [armor, shield, weapon, cloth, leather, mail, plate]}
  - {id: has, name: has, args: []}
  - {id: level, name: level, args: [berserker, cheat, commander, hunter, mage, oathsworn, shadowmancer, shepherd, songweaver, stormshifter, zephyr]}
  - {id: proficient, name: proficient, args: [armor, weapon, cloth, leather, mail, plate, shield]}
  - {id: knows, name: knows, args: [fire, ice, lightning, necrotic, radiant, wind]}
---
`has(id)` accepts any document id (the linter checks it against loaded documents).
`level(class)` returns the character's level in that class, 0 if none.
`knows(school)` is true when the character knows that spell school.
