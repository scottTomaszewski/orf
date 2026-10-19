---
id: nimble.system.events
type: events
system: nimble
name: Events and handlers
events:
  - {id: gain-wound, args: [amount]}
  - {id: full-hp, args: []}
  - {id: rage-end, args: []}
handlers:
  damage:
    - {spend: temp_hp, amount: "min(amount, temp_hp.current)"}
    - {spend: hp, amount: "amount - spent"}
    - {when: "hp.current == 0 and not dying", fire: gain-wound, amount: 1}
    - {when: "hp.current == 0 and not dying", set: dying}
    - {when: "dying and spent == 0 and amount > 0", fire: gain-wound, amount: "if(crit, wound.damage_while_dying + 1, wound.damage_while_dying)"}
  gain-wound:
    - {spend: wounds, amount: "-amount"}
  heal:
    - {restore: hp, amount: amount}
    - {when: "hp.current > 0", clear: dying}
    - {when: "hp.current == hp.max", fire: full-hp}
  catch-breath:
    - repeat: hit_dice
      steps:
        - {spend: hit_dice, amount: 1}
        - {restore: hp, amount: "if(hit_die.heal.always_max, hit_die.size, roll(hit_die.size, hit_die.heal.advantage)) + str + hit_die.heal.bonus"}
    - {when: "hp.current == hp.max", fire: full-hp}
  make-camp:
    - repeat: hit_dice
      steps:
        - {spend: hit_dice, amount: 1}
        - {restore: hp, amount: "hit_die.size + str + hit_die.heal.bonus"}
    - {when: "hp.current == hp.max", fire: full-hp}
  safe-rest:
    - {restore: hp, amount: hp.max}
    - {restore: hit_dice, amount: hit_dice.max}
    - {spend: temp_hp, amount: temp_hp.current}
    # the one healed Wound is the `wounds` resource's own {on: safe-rest, add: -1} refresh rule
  encounter-start:
    - {restore: actions, amount: "min(if(dying, actions.dying_cap, 3), if(max(initiative_roll, initiative.floor) >= 20, 3, if(max(initiative_roll, initiative.floor) >= 10, 2, 1))) - actions.current"}
  turn-end:
    - {restore: actions, amount: "if(dying, actions.dying_cap, actions.max) - actions.current"}
---
Handlers are owned by the template; content influences them only through the variables they
read (`hit_die.heal.bonus`, `hit_die.heal.always_max`, `hit_die.heal.advantage`,
`initiative.floor`, `actions.dying_cap`, `wound.damage_while_dying`). `roll(size, advantage)`
rolls one die, with advantage when the second argument is true. `full-hp` fires from `heal`
and from both Field Rests. Initiative sets the first turn's action count: one digit = 1,
two digits = 2, 20+ = 3 (CR2 p.15). Dropping to 0 HP = 1 Wound and Dying; damage while Dying =
2 Wounds, 3 on a crit (CR2 p.9). Catch Breath heals roll + STR per Hit Die; Make Camp heals the
die's maximum + STR (CR2 p.17).

## Sources
Core Rules 2.0.3 p.9, p.15, p.17.
