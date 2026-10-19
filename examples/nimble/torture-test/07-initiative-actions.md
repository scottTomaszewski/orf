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
The digit-count mapping is engine code in the Nimble module. Human contributes `initiative.bonus add: 1`. The Cheat contributes `initiative.floor at_least: 10`, which the engine applies as `max(roll, initiative.floor)` before counting digits. (The first draft wrote this as `max: 10` because `max` read as 'raise to'; the clamp ops are now `at_least`/`at_most` for exactly that reason.)