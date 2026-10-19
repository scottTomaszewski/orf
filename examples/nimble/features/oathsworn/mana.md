---
id: nimble.features.oathsworn.mana
type: feature
system: nimble
name: Mana
class: nimble.classes.oathsworn
tags: [oathsworn]
effects:
  - {target: mana.max, base: "wil + level", source: oathsworn-mana}
---
Your maximum mana is {{ wil + level | WIL + your level }}; it refreshes at a Safe Rest (H2 p.38).
