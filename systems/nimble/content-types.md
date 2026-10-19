---
id: nimble.system.content-types
type: content-types
system: nimble
name: Content types
content_types:
  - {id: ancestry, properties: [size, speed]}
  - {id: background, properties: [requires]}
  - {id: class, properties: [key_stats, hit_die, starting_hp, saves, armor_proficiency, weapon_proficiency, starting_gear]}
  - {id: class-level, properties: [class, level, grants, choices]}
  - {id: subclass, properties: [class, grants_by_level]}
  - {id: feature, properties: [class, actions, uses]}
  - {id: spell, properties: [school, tier, cost, actions, range, reach]}
  - {id: item, properties: [slots, equippable, kind]}
  - {id: armor, properties: [category, base_armor, dex_cap, strength_requirement]}
  - {id: weapon, properties: [damage, kind, hands, properties]}
  - {id: boon, properties: [rarity]}
  - {id: character, properties: [stats, ancestry, background, classes, skills, levels, choices, equipment, state]}
---
Suggested properties per type: what an authoring form shows first. Creators may add any
property; none of these lists is a schema.
