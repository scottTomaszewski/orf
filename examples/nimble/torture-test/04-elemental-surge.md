---
id: torture.nimble.04-elemental-surge
type: note
system: nimble
name: "Elemental Surge: encounter-lifetime mana that scales"
covers: [nimble.classes.mage, nimble.features.mage.elemental-surge]
---
## Rule
When you roll Initiative, regain WIL mana; unused expires at the end of combat. WIL+1d4 at 10, WIL+2d4 at 17 (H2 p.32-33).

## Encoding notes
Encoded as a second resource `mage.surge` with `max` = a dice-typed formula and refresh rules on `encounter-start` (to max) and `encounter-end` (to 0). **Gap:** spending mana should draw from surge first; that needs a `spend` handler rule owned by the class, which content cannot declare in this phase.
