---
id: nimble.backgrounds.devoted-protector
type: background
system: nimble
name: Devoted Protector
effects:
  - {target: wounds.max, add: 3, when: ally_nearby, source: devoted-protector}
---
Choose an ally: while they are nearby, you have +3 max Wounds (CR2 p.28). `ally_nearby` is a boolean the player toggles on the sheet.
