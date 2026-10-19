---
id: nimble.system.events
type: events
system: nimble
name: Moments
events:
  - {id: gain-wound, description: "You gained a Wound (dropped to 0 HP, or took damage while Dying)."}
  - {id: full-hp, description: "Your HP reached its maximum."}
---
Moments are the only things a resource `refresh` can listen for. The built-in ones every
system has are `catch-breath`, `make-camp`, `safe-rest`, `encounter-start`, `encounter-end`,
`turn-end`, and `level-up`; Nimble adds the two above. Dragonborn's breath refreshes
`{on: gain-wound, to: max}`; Gnome's reroll refreshes `{on: full-hp, to: max}`.

**What fires them, and everything else that *happens* to a character, lives in the engine's
Nimble module, in code, not in content.** Taking damage (temp HP first, then HP; 0 HP = 1
Wound and Dying; damage while Dying = `wound.damage_while_dying` Wounds, +1 on a crit), healing
(clears Dying above 0; fires `full-hp` at max), Catch Breath (each Hit Die heals a roll + STR +
`hit_die.heal.bonus`, or the die's maximum when `hit_die.heal.maximized`, rolled with advantage
when `hit_die.heal.advantage`), Make Camp (each Hit Die heals its maximum + STR + the bonus),
Safe Rest (full HP and Hit Dice, temp HP gone; the one healed Wound is the `wounds` resource's
own refresh rule), Initiative (first-turn actions by digit count, after `initiative.floor`),
and the Dying action cap (`actions.dying_cap`) are all engine code (CR2 p.9, p.15, p.17).

Content steers those procedures only through the variables they read. That is the whole
contract: the format describes what is true about a character; the engine, shared by every
tool, does what happens.

## Sources
Core Rules 2.0.3 p.9, p.15, p.17.
