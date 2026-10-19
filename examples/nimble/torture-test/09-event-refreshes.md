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
Both are resources with two refresh rules; the template declares the `gain-wound` and `full-hp` events and fires them from its `damage` and `heal` handlers. Any content can refresh on any declared event.
