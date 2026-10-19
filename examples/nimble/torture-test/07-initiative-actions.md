---
id: torture.nimble.07-initiative-actions
type: note
system: nimble
name: "Initiative sets first-turn actions; Human +1; Cheat floor of 10"
covers: [nimble.system.events, nimble.ancestries.human, nimble.features.cheat.cheat]
---
## Rule
Initiative d20 + DEX: one digit = 1 action, two digits = 2, 20+ = 3 (CR2 p.15). Human +1 Initiative. Cheat: if you roll under 10, treat it as 10 (H2 p.14).

## Encoding notes
The digit-count mapping is a template handler on `encounter-start`. Human contributes `initiative.bonus add: 1`. The Cheat's floor is `initiative.floor min: 10` on a template variable the handler reads as `max(initiative_roll, initiative.floor)`. **This was first encoded as `max: 10` by both the plan and the implementer**, because `max` reads as 'raise to'. Under the fold `max` is the upper clamp. The op names mislead; see the gate question.
