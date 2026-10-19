---
id: nimble.ancestries.gnome
type: ancestry
system: nimble
name: Gnome
size: small
effects:
  - {target: speed, add: -1}
resources:
  - {id: gnome.reroll, max: 1, refresh: [{on: full-hp, to: max}, {on: safe-rest, to: max}]}
---
Reroll one die; the reroll comes back when you are healed to full HP (CR2 p.22). Encoded as a 1-use resource refreshing on the `full-hp` event.
