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
  - {id: spell, properties: [school, tier, actions, target, range, reach, damage, healing, temp_hp, on_hit, on_crit, on_miss, reaction, concentration, high_levels, upcast]}
  - {id: item, properties: [slots, equippable, kind]}
  - {id: armor, properties: [category, base_armor, dex_cap, strength_requirement]}
  - {id: weapon, properties: [damage, kind, hands, properties]}
  - {id: boon, properties: [rarity]}
  - {id: spell-school, properties: []}
  - {id: spell-utility, properties: [school]}
  - {id: creation, properties: [stat_arrays, skill_points_at_creation, skill_points_per_level, starting_gold, hp_per_level]}
  - {id: character, properties: [stats, ancestry, background, classes, skills, levels, choices, equipment, state]}
---
Suggested properties per type: what an authoring form shows first. Creators may add any
property; none of these lists is a schema.
