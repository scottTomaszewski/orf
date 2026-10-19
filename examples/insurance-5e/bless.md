---
id: srd5e.spells.bless
type: spell
system: srd5e
name: Bless
level: 1
effects:
  - {target: save.str, add: 1d4, source: bless}
  - {target: save.dex, add: 1d4, source: bless}
  - {target: save.con, add: 1d4, source: bless}
  - {target: save.int, add: 1d4, source: bless}
  - {target: save.wis, add: 1d4, source: bless}
  - {target: save.cha, add: 1d4, source: bless}
---
Each target adds 1d4 to saving throws (and attack rolls, not modelled) for the duration. Two castings on one target do not stack: `source: bless` plus the system's `same-source: highest` policy (SRD 5.1).
