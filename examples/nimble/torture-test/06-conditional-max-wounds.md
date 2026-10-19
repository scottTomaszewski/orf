---
id: torture.nimble.06-conditional-max-wounds
type: note
system: nimble
name: "Devoted Protector: +3 max Wounds while an ally is nearby"
covers: [nimble.backgrounds.devoted-protector]
---
## Rule
Choose an ally; while they are nearby you have +3 max Wounds (CR2 p.28).

## Encoding notes
`wounds.max add: 3 when: ally_nearby`. `ally_nearby` is a player-toggled boolean declared in the template. The engine recomputes `wounds.max` when it flips; what happens to a character whose current Wounds exceed the new max is a rules question the sheet should surface, not decide.
