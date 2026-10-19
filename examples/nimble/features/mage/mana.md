---
id: nimble.features.mage.mana
type: feature
system: nimble
name: Mana
class: nimble.classes.mage
tags: [mage]
effects:
  - {target: mana.max, base: "(max(int, 0) * 3) + level", source: mage-mana, note: "Granted at level 2, so no level condition is needed here."}
---
Your maximum mana is {{ (max(int, 0) * 3) + level | (INT × 3) + your level }}; it refreshes at a Safe Rest (H2 p.32).
