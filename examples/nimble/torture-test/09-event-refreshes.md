---
id: torture.nimble.09-event-refreshes
type: note
system: nimble
name: "Dragonborn breath recharges on gaining a Wound; Gnome reroll resets at full HP"
covers: [nimble.ancestries.dragonborn, nimble.ancestries.gnome]
---
## Rule
Dragonborn: once per Safe Rest, recharges whenever you gain a Wound (CR2 p.24). Gnome: reroll one die, reset when healed to full HP (CR2 p.22).

## Encoding notes
Both are resources with two refresh rules. `gain-wound` and `full-hp` are **moments** declared by the template; the engine's Nimble module fires them from its damage and heal procedures. Any content can refresh on any declared moment, and refresh rules are the only thing in the format that listens for one.