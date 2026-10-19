---
id: torture.nimble.12-dying
type: note
system: nimble
name: "Dying: action cap, Wound costs, class overrides"
covers: [nimble.system.events, nimble.system.combat]
---
## Rule
At 0 HP: gain 1 Wound and Dying; actions capped at 1; attacking costs a Wound unless DC 10 STR save; damage while Dying = 2 Wounds, 3 on a crit (CR2 p.9). Zephyr level 20: max 2 actions while Dying (H2 p.69).

## Encoding notes
The `damage` handler sets `dying` and fires `gain-wound` with `wound.damage_while_dying` (default 2, +1 on crit). `turn-end` and `encounter-start` cap actions at `actions.dying_cap` (default 1) while `dying`; a class raises the cap with `base: 2`. `heal` clears `dying` above 0 HP. None of the four MVP classes override Dying below level 17, so no content document does yet. Death at max Wounds is not yet a transition (gap).
