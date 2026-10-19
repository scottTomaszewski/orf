---
id: torture.nimble.12-dying
type: note
system: nimble
name: "Dying: action cap, Wound costs, class overrides"
covers: [nimble.system.combat, nimble.system.events]
---
## Rule
At 0 HP: gain 1 Wound and Dying; actions capped at 1; attacking costs a Wound unless DC 10 STR save; damage while Dying = 2 Wounds, 3 on a crit (CR2 p.9). Zephyr level 20: max 2 actions while Dying (H2 p.69).

## Encoding notes
All engine code in the Nimble module: damage sets `dying` and adds `wound.damage_while_dying` Wounds (default 2, +1 on a crit) while Dying; turn end and Initiative cap actions at `actions.dying_cap` (default 1) while `dying`; healing above 0 clears `dying`. Content steers it only through those two variables: Zephyr 20 contributes `actions.dying_cap base: 2`. None of the four MVP classes override Dying below level 17, so no content document does yet. Death at max Wounds is an engine gap.