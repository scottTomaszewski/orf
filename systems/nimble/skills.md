---
id: nimble.system.skills
type: variables
system: nimble
name: Skills
printing_diff: {second: {skill.cap: 10}}
variables:
  - {id: skill.cap, name: the maximum skill bonus, type: integer, default: 12}
  - {id: skill.arcana.points, name: your Arcana skill points, type: integer, default: 0, ops: [add]}
  - {id: skill.arcana, name: your Arcana modifier, type: integer, formula: "min(int + skill.arcana.points, skill.cap)", ops: [add]}
  - {id: skill.examination.points, name: your Examination skill points, type: integer, default: 0, ops: [add]}
  - {id: skill.examination, name: your Examination modifier, type: integer, formula: "min(int + skill.examination.points, skill.cap)", ops: [add]}
  - {id: skill.lore.points, name: your Lore skill points, type: integer, default: 0, ops: [add]}
  - {id: skill.lore, name: your Lore modifier, type: integer, formula: "min(int + skill.lore.points, skill.cap)", ops: [add]}
  - {id: skill.finesse.points, name: your Finesse skill points, type: integer, default: 0, ops: [add]}
  - {id: skill.finesse, name: your Finesse modifier, type: integer, formula: "min(dex + skill.finesse.points, skill.cap)", ops: [add]}
  - {id: skill.stealth.points, name: your Stealth skill points, type: integer, default: 0, ops: [add]}
  - {id: skill.stealth, name: your Stealth modifier, type: integer, formula: "min(dex + skill.stealth.points, skill.cap)", ops: [add]}
  - {id: skill.might.points, name: your Might skill points, type: integer, default: 0, ops: [add]}
  - {id: skill.might, name: your Might modifier, type: integer, formula: "min(str + skill.might.points, skill.cap)", ops: [add]}
  - {id: skill.influence.points, name: your Influence skill points, type: integer, default: 0, ops: [add]}
  - {id: skill.influence, name: your Influence modifier, type: integer, formula: "min(wil + skill.influence.points, skill.cap)", ops: [add]}
  - {id: skill.insight.points, name: your Insight skill points, type: integer, default: 0, ops: [add]}
  - {id: skill.insight, name: your Insight modifier, type: integer, formula: "min(wil + skill.insight.points, skill.cap)", ops: [add]}
  - {id: skill.naturecraft.points, name: your Naturecraft skill points, type: integer, default: 0, ops: [add]}
  - {id: skill.naturecraft, name: your Naturecraft modifier, type: integer, formula: "min(wil + skill.naturecraft.points, skill.cap)", ops: [add]}
  - {id: skill.perception.points, name: your Perception skill points, type: integer, default: 0, ops: [add]}
  - {id: skill.perception, name: your Perception modifier, type: integer, formula: "min(wil + skill.perception.points, skill.cap)", ops: [add]}
---
Skill = governing stat + allocated points, capped at +12 in 2.0.3 (+10 in the second printing).
4 points at level 1, +1 per level, 1 point may move per level (CR2 p.8, p.21).

## Sources
Core Rules 2.0.3 p.8, p.21.
