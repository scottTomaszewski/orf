---
id: torture.nimble.02-hit-die-healing
type: note
system: nimble
name: "Catch Breath vs Make Camp, with Oozeling and Wild One"
covers: [nimble.system.events, nimble.ancestries.oozeling, nimble.backgrounds.wild-one]
---
## Rule
Catch Breath: spend Hit Dice, each heals roll + STR. Make Camp: each heals its max + STR (CR2 p.17). Oozeling: always max (CR2 p.26). Wild One: more per die in the wild (CR2 p.28).

## Encoding notes
The two formulas live in the template's `catch-breath` and `make-camp` handlers. Content cannot edit handlers; instead the handler reads template variables: `hit_die.heal.always_max` (Oozeling sets it), `hit_die.heal.advantage` (Wild One sets it when `in_wilderness`; 2.0.3 wording), and `hit_die.heal.bonus` (for the second printing's +KEY form). This is the pattern for every 'change how a core rule computes' feature.
