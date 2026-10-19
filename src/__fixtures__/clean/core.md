---
id: fx.system.core
type: variables
system: fx
name: Fixture core
variables:
  - {id: dex, name: your Dexterity, type: integer, default: 0, alias: DEX}
  - {id: level, name: your level, type: integer, default: 1}
  - {id: wounds.max, name: your maximum Wounds, type: integer, default: 6, ops: [add, set]}
resources:
  - {id: wounds, max: wounds.max, refresh: [{on: safe-rest, add: -1}]}
---
Fixture core. You have {{ wounds.max }} Wounds.
